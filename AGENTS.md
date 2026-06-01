# Repository Guidelines

## Project Structure & Module Organization

本仓库采用 Node.js ESM 结构，主要代码文件位于仓库根目录，使用 `.mjs` 作为模块入口。通用工具、脚本和示例应按职责拆分到独立文件，避免把无关逻辑堆在同一个入口中。

- `package.json`：项目脚本、依赖和基础元数据。
- `package-lock.json`：锁定依赖版本，提交依赖变更时应同步更新。
- `*.mjs`：可执行脚本或模块文件。
- `node_modules/`：本地安装依赖，不要手动修改或提交。

如果项目规模扩大，可新增 `src/` 存放源码、`test/` 存放测试、`scripts/` 存放辅助脚本。

## Build, Test, and Development Commands

- `npm install`：根据 lockfile 安装依赖。
- `npm start`：运行默认入口脚本，具体行为以 `package.json` 为准。
- `node <file>.mjs`：直接运行某个 ESM 脚本。
- `node --check <file>.mjs`：只做语法检查，不执行脚本逻辑。

新增命令时，请同步更新 `package.json` 的 `scripts`，并在相关文档中说明用途。

## Coding Style & Naming Conventions

使用现代 JavaScript 和 ESM 语法：`import`/`export`、`.mjs` 文件和必要时的顶层 `await`。缩进使用两个空格。默认使用 `const`，只有需要重新赋值时使用 `let`。

变量和函数使用 camelCase。文件名保持简短、语义明确，优先使用 kebab-case，例如 `node-exec.mjs`。模块应保持单一职责，公共逻辑应抽取为可复用函数。

## Testing Guidelines

当前未强制指定测试框架。提交前至少执行相关文件的语法检查：

- `node --check <file>.mjs`

新增测试时，建议使用 Node 内置测试运行器。测试文件放在 `test/` 目录，命名为 `*.test.mjs`。测试应覆盖主要成功路径、错误路径和边界输入。

## Commit & Pull Request Guidelines

提交信息使用简短、祈使句风格，例如 `Add command runner` 或 `Refactor shared utilities`。每个提交应聚焦单一变更，避免混入无关格式化或生成文件。

Pull Request 应包含变更摘要、验证命令和潜在影响。涉及配置、依赖或运行方式变化时，应明确说明迁移步骤。有关联 issue 时请在描述中链接。

## Security & Configuration Tips

不要提交 `.env`、密钥、令牌或本地机器路径。涉及文件系统或命令执行的代码应限制作用范围，避免默认执行破坏性操作。长驻进程应记录 PID 或提供明确的停止方式。
