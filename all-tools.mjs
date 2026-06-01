import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tool } from "@langchain/core/tools";

const workspaceRoot = process.cwd();

function resolveWorkspacePath(filePath) {
  const resolvedPath = path.resolve(workspaceRoot, filePath);

  if (resolvedPath !== workspaceRoot && !resolvedPath.startsWith(workspaceRoot + path.sep)) {
    throw new Error("只能访问当前工作区内的路径。");
  }

  return resolvedPath;
}

export const readFileTool = tool(
  async ({ filePath }) => readFile(resolveWorkspacePath(filePath), "utf8"),
  {
    name: "read_file",
    description: "读取当前工作区内指定文本文件的内容。",
    schema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "相对当前工作区的文件路径。" },
      },
      required: ["filePath"],
    },
  }
);

export const writeFileTool = tool(
  async ({ filePath, content }) => {
    const resolvedPath = resolveWorkspacePath(filePath);
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, content, "utf8");
    return `已写入文件: ${filePath}`;
  },
  {
    name: "write_file",
    description: "向当前工作区内指定文件写入文本内容，会覆盖已有内容。",
    schema: {
      type: "object",
      properties: {
        filePath: { type: "string", description: "相对当前工作区的文件路径。" },
        content: { type: "string", description: "要写入的文本内容。" },
      },
      required: ["filePath", "content"],
    },
  }
);

export const readDirectoryTool = tool(
  async ({ dirPath = "." }) => {
    const entries = await readdir(resolveWorkspacePath(dirPath), {
      withFileTypes: true,
    });

    return entries
      .map((entry) => `${entry.isDirectory() ? "dir " : "file"} ${entry.name}`)
      .join("\n");
  },
  {
    name: "read_directory",
    description: "读取当前工作区内指定目录的直接子项。",
    schema: {
      type: "object",
      properties: {
        dirPath: {
          type: "string",
          description: "相对当前工作区的目录路径，默认是当前工作区根目录。",
        },
      },
    },
  }
);

export const executeCommandTool = tool(
  async ({ cmd, args = [], cwd = ".", timeoutMs, background = false }) =>
    new Promise((resolve) => {
      const commandCwd = resolveWorkspacePath(cwd);
      const commandArgs = Array.isArray(args) ? args : [String(args)];
      const waitMs = timeoutMs ?? (background ? 3000 : 30000);
      let settled = false;

      const child = spawn(cmd, commandArgs, {
        cwd: commandCwd,
        detached: background,
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      function finish(result) {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        resolve(JSON.stringify(result, null, 2));
      }

      const timer = setTimeout(() => {
        if (background) {
          child.stdout.destroy();
          child.stderr.destroy();
          child.unref();
          finish({
            pid: child.pid,
            background: true,
            cwd,
            stdout,
            stderr,
          });
          return;
        }

        child.kill("SIGTERM");
        finish({
          code: null,
          timedOut: true,
          cwd,
          stdout,
          stderr,
        });
      }, waitMs);

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        process.stdout.write(text);
      });

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        process.stderr.write(text);
      });

      child.on("error", (error) => {
        finish({
          error: error.message,
          cwd,
          stdout,
          stderr,
        });
      });

      child.on("close", (code) => {
        finish({
          code,
          cwd,
          stdout,
          stderr,
        });
      });
    }),
  {
    name: "execute_command",
    description: "在当前工作区或其子目录执行命令。支持 cwd、timeoutMs 和 background；参数会直接传给 spawn，不经过 shell。",
    schema: {
      type: "object",
      properties: {
        cmd: { type: "string", description: "要执行的命令，例如 node、npm。" },
        args: {
          type: "array",
          items: { type: "string" },
          description: "命令参数数组，例如 [\"--version\"]。",
        },
        cwd: {
          type: "string",
          description: "相对当前工作区的执行目录，默认是当前工作区根目录。",
        },
        timeoutMs: {
          type: "number",
          description: "等待命令完成或返回启动结果的毫秒数。",
        },
        background: {
          type: "boolean",
          description: "是否后台启动长驻进程，例如 npm run dev。",
        },
      },
      required: ["cmd"],
    },
  }
);

export const allTools = [
  readFileTool,
  writeFileTool,
  readDirectoryTool,
  executeCommandTool,
];

export const toolsByName = Object.fromEntries(
  allTools.map((currentTool) => [currentTool.name, currentTool])
);
