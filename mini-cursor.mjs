import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { allTools, toolsByName } from "./all-tools.mjs";

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

const model = new ChatOpenAI({
  model: process.env.DEEPSEEK_MODEL,
  apiKey: process.env.DEEPSEEK_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL,
  },
});

const modelWithTools = model.bindTools(allTools);

function buildSystemPrompt(tools) {
  const toolList = tools
    .map((currentTool) => `- ${currentTool.name}: ${currentTool.description}`)
    .join("\n");

  return `你是一个简洁、可靠的代码助手。

你可以使用以下工具：
${toolList}

工具使用准则：
- 开始实现前，先检查当前工作区状态：读取目录、判断目标项目是否已存在、查看 package.json 和关键源码文件。
- 如果目标项目已存在，必须基于现状继续完成，不要无意义重建或覆盖已有工作。
- 优先调用合适的工具。
- 不要臆测工具可以直接获得的信息；先调用工具，再基于结果回答。
- 执行命令前选择最小必要命令，避免破坏性操作。
- 在子项目内安装依赖或运行脚本时，execute_command 必须设置 cwd。
- 启动 dev server 这类长驻进程时，execute_command 使用 background: true。
- 工具执行失败后，不要重复同一错误命令；先检查失败原因，再选择修复动作。
- 认为任务完成前，必须检查目标项目的 package.json、关键源码文件，并运行必要验证命令。
- 工具返回错误时，说明错误原因，并给出可执行的下一步。`;
}

const messages = [
  new SystemMessage(buildSystemPrompt(allTools)),
  new HumanMessage(`执行react-todo-list里的dev`),
];

async function runToolCall(toolCall) {
  const selectedTool = toolsByName[toolCall.name];

  if (!selectedTool) {
    const errorMessage = `未找到工具: ${toolCall.name}`;
    console.log(`调用工具: ${toolCall.name}`);
    console.log("工具参数:");
    console.log(formatJson(toolCall.args));
    console.log(`调用结果: ${errorMessage}`);

    messages.push(
      new ToolMessage({
        content: errorMessage,
        tool_call_id: toolCall.id,
        status: "error",
      })
    );
    return;
  }

  console.log(`调用工具: ${toolCall.name}`);
  console.log("工具参数:");
  console.log(formatJson(toolCall.args));

  try {
    const toolResult = await selectedTool.invoke(toolCall.args);
    const content =
      typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);

    console.log("调用结果:");
    console.log(content);

    messages.push(
      new ToolMessage({
        content,
        tool_call_id: toolCall.id,
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log("调用结果:");
    console.log(errorMessage);

    messages.push(
      new ToolMessage({
        content: errorMessage,
        tool_call_id: toolCall.id,
        status: "error",
      })
    );
  }
}

const maxTurns = 20;

for (let turn = 1; turn <= maxTurns; turn += 1) {
  console.log(`\n第 ${turn} 轮调用模型:`);

  const response = await modelWithTools.invoke(messages);
  messages.push(response);

  console.log(response);

  const toolCalls = response.tool_calls ?? [];

  if (toolCalls.length === 0) {
    console.log("\n模型最终返回:");
    console.log(response);
    break;
  }

  for (const toolCall of toolCalls) {
    await runToolCall(toolCall);
  }

  if (turn === maxTurns) {
    console.log(`\n达到最大轮数 ${maxTurns}，已停止继续调用。`);
  }
}
