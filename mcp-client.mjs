import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tool } from "@langchain/core/tools";

function safeError(error, config) {
  let message = error instanceof Error ? error.message : String(error);
  // HTTP 错误可能包含请求 URL，隐藏其中的高德 Key。
  for (const value of config.url ? new URL(config.url).searchParams.values() : []) {
    if (value) {
      message = message.replaceAll(encodeURIComponent(value), "[REDACTED]");
      message = message.replaceAll(value, "[REDACTED]");
    }
  }
  return message;
}

// 汇总各 MCP 服务的工具、资源文本和关闭方法。
export async function connectMcpServers(configs) {
  const clients = [];
  const tools = [];
  const resources = [];
  // 清空列表，避免重复关闭；单个关闭失败不影响其他连接。
  const close = () => Promise.allSettled(clients.splice(0).map((client) => client.close()));

  try {
    for (const [name, config] of Object.entries(configs)) {
      if (config.enabled === false) {
        console.log(`[MCP] 跳过 ${name}：${config.disabledReason}`);
        continue;
      }
      const client = new Client({ name: "mini-cursor", version: "1.0.0" });
      clients.push(client);
      try {
        // URL 走 HTTP；本地命令走 stdio。
        const transport = config.url
          ? new StreamableHTTPClientTransport(new URL(config.url))
          : new StdioClientTransport(config);
        await client.connect(transport, { timeout: config.startupTimeoutMs ?? 30000 });
        // 分页发现工具，并包装成 LangChain 工具；调用时复用对应客户端。
        let cursor;
        do {
          const page = await client.listTools(cursor ? { cursor } : undefined);
          tools.push(...page.tools.map((definition) => tool(async (args) => {
            try {
              const result = await client.callTool({ name: definition.name, arguments: args });
              if (result.isError) throw new Error(JSON.stringify(result.content));
              // 保留 Chrome 截图等多模态内容，让 ToolMessage 能传给模型。
              return result.content.map((part) => {
                if (part.type === "text") return part;
                if (part.type === "image") {
                  return { type: "image_url", image_url: { url: `data:${part.mimeType};base64,${part.data}` } };
                }
                return { type: "text", text: JSON.stringify(part) };
              });
            } catch (error) {
              throw new Error(`${name}：${safeError(error, config)}`);
            }
          }, {
            // 用服务前缀区分不同 MCP 中的同名工具。
            name: `${config.toolPrefix}__${definition.name}`,
            description: `[${name}] ${definition.description ?? definition.name}`,
            schema: definition.inputSchema,
          })));
          cursor = page.nextCursor;
        } while (cursor);
        // 只读取该服务配置的资源，保留本地 docs://guide。
        for (const uri of config.resourceUris ?? []) {
          const { contents } = await client.readResource({ uri });
          resources.push(...contents.filter((part) => typeof part.text === "string")
            .map((part) => `资源 URI：${part.uri}\n${part.text}`));
        }
        console.log(`[MCP] 已连接 ${name}`);
      } catch (error) {
        throw new Error(`${name} 初始化失败：${safeError(error, config)}`);
      }
    }
    return { tools, resourceContext: resources.join("\n\n"), close };
  } catch (error) {
    // 初始化中途失败时，关闭此前已建立的连接。
    await close();
    throw error;
  }
}
