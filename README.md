# Prompt Generator MCP Server

Meta Context Prompt Server for Cursor image-to-code generation.

## Description

这是一个为 Cursor 图像到代码生成提供多端提示词模板的服务器。可以通过自然语言获取提示模板，主要支持 PC 端和移动端提示词模板。

## 什么是 MCP (Model Context Protocol)

MCP 是一个开放协议，它标准化了应用程序如何向 LLM 提供上下文。可以将 MCP 视为 AI 应用程序的 USB-C 端口。就像 USB-C 提供了一种将设备连接到各种外设和配件的标准化方式，MCP 提供了一种将 AI 模型连接到不同数据源和工具的标准化方式。

MCP 帮助您在 LLM 之上构建代理和复杂工作流程。LLM 经常需要与数据和工具集成，MCP 提供：

- 预建集成列表，您的 LLM 可以直接插入
- 在 LLM 提供商和供应商之间切换的灵活性
- 在您的基础设施内保护数据的最佳实践

## Features

- 支持自然语言查询（例如"帮我生成 PC 端提示词"）
- 提供结构化的提示词模板，包含图像分析（Image-Analysis）和 UI 描述（UI-Description）
- 支持多种连接方式（HTTP、SSE、本地直连）
- 可扩展的模板系统，易于添加新的提示词类型

## Project Structure

```
prompt-generator/
├── src/                      # 源代码目录
│   ├── index.js              # 程序入口，负责启动服务器
│   └── server.js             # 服务器核心代码，实现 MCP 协议和提示词生成逻辑
├── prompts/                  # 提示词模板目录
│   ├── pc-web.txt            # PC 端提示词模板
│   └── mobile-web.txt        # 移动端提示词模板
├── package.json              # 项目配置和依赖管理
├── README.md                 # 项目说明文档
└── MCP Server Architecture   # 服务器架构说明文档
```

## Installation

1. 克隆此仓库
2. 安装依赖:
   ```
   cd prompt-generator
   npm install
   ```
   或使用 pnpm:
   ```
   cd prompt-generator
   pnpm install
   ```
3. 本地启动:
   ```
   pnpm dev
   ```

## 与 Cursor 集成

### 方式 1：HTTP 请求

在 Cursor 中，配置 MCP 服务器:

```json
{
  "mcpServers": {
    "prompt-generator": {
      "url": "http://localhost:3002/sse"
    }
  }
}
```

## 添加新的提示类型

要添加新的提示类型，请按以下步骤操作:

1. 在`prompts`目录中创建一个新的文本文件。文件名应为提示类型名，扩展名为`.txt`
2. 在 `server.js` 中注册新的提示词生成工具，方法是在 `registerTools` 方法中添加新的工具

例如，要添加`desktop-app`提示类型:

1. 创建`prompts/desktop-app.txt`文件
2. 在`server.js`中添加新的工具:

```javascript
this.server.tool('generate_desktop_app_prompt', { request: z.string().optional() }, async ({ request }) => {
  const template = await this.loadPromptTemplate('desktop-app')
  return {
    content: [
      {
        type: 'text',
        text: `Here's a desktop app prompt template:\n\n${template}`
      }
    ]
  }
})
```

## 技术栈

- **运行环境**: Node.js
- **框架**: Express.js
- **依赖库**:
  - `@modelcontextprotocol/sdk`: MCP 协议实现
  - `cors`: 处理跨域请求
  - `dotenv`: 环境变量管理
  - `zod`: 数据验证

## License

ISC
