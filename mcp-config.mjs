import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function createMcpConfig(env = process.env, workspaceRoot = process.cwd()) {
  const amapKey = env.AMAP_MAPS_API_KEY?.trim();
  const amapEnabled = Boolean(amapKey && !/^(your-|你的|您在)/i.test(amapKey));
  const amapUrl = new URL("https://mcp.amap.com/mcp");
  if (amapEnabled) {
    amapUrl.searchParams.set("key", amapKey);
  }

  return {
    "my-mcp-server": {
      command: process.execPath,
      args: [fileURLToPath(new URL("./my-mcp-server.mjs", import.meta.url))],
      toolPrefix: "demo",
      resourceUris: ["docs://guide"],
    },
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", resolve(workspaceRoot)],
      cwd: resolve(workspaceRoot),
      toolPrefix: "filesystem",
      startupTimeoutMs: 120000,
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest", "--isolated", "--no-usage-statistics"],
      toolPrefix: "chrome",
      startupTimeoutMs: 120000,
    },
    "amap-maps-streamableHTTP": {
      url: amapUrl.toString(),
      enabled: amapEnabled,
      disabledReason: "请在 .env 中设置 AMAP_MAPS_API_KEY 后启用高德 MCP。",
      toolPrefix: "amap",
    },
  };
}
