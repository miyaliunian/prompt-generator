# MCP Server

Meta Context Prompt Server for Cursor image-to-code generation.

## Description

这是一个为 Cursor 图像到代码生成多端提示词模板。，可以通过自然语言获取提示模板。

## 什么是 MCP (Model Context Protocol)

MCP 是一个开放协议，它标准化了应用程序如何向 LLM 提供上下文。可以将 MCP 视为 AI 应用程序的 USB-C 端口。就像 USB-C 提供了一种将设备连接到各种外设和配件的标准化方式，MCP 提供了一种将 AI 模型连接到不同数据源和工具的标准化方式。

MCP 帮助您在 LLM 之上构建代理和复杂工作流程。LLM 经常需要与数据和工具集成，MCP 提供：

- 预建集成列表，您的 LLM 可以直接插入
- 在 LLM 提供商和供应商之间切换的灵活性
- 在您的基础设施内保护数据的最佳实践

## Features

- 支持自然语言查询（例如"帮我生成 PC 端提示词"）

## Installation

1. 克隆此仓库
2. 安装依赖:
   ```
   cd mcp-server
   npm install
   ```
3. 创建`.env`文件，内容如下:
   ```
   PORT=3002
   ```

## Usage

### Development

```
cd mcp-server
npm run dev
```

### Production

```
cd mcp-server
npm start
```

Or using PM2:

```
cd mcp-server
npm install -g pm2
pm2 start src/server.js --name mcp-server
```

### 测试界面

启动服务器后，访问 http://localhost:3002 可以看到测试界面。

## API Endpoints

### 根据类型获取提示模板

```
GET /api/prompts/:type
```

其中`:type`是提示类型，例如`pc-web`。

### 使用自然语言查询提示模板

#### POST 方式:

```
POST /api/prompts/query
Content-Type: application/json

{
  "query": "帮我生成PC端提示词"
}
```

#### GET 方式:

```
GET /api/prompts/query?query=帮我生成PC端提示词
```

或

```
GET /api/prompts/query
```

(不带参数时默认返回 PC 端提示词)

### SSE 连接

```
GET /sse
```

或

```
GET /api/prompts/sse
```

客户端可以建立 SSE 连接，然后发送 JSON 格式的消息：

```json
{ "query": "帮我生成PC端提示词" }
```

服务器会返回对应的提示模板：

```json
{ "promptTemplate": "模板内容..." }
```

## 与 Cursor 集成

### 方式 1：HTTP 请求

在 Cursor 中，配置 MCP 服务器:

```json
{
  "mcpServers": {
    "prompt-generator": {
      "url": "http://localhost:3002/api/prompts/query"
    }
  }
}
```

### 方式 2：SSE 连接（推荐）

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

然后，在 Cursor 中输入"帮我生成 PC 端提示词"即可获取提示模板。

## MCP 服务器架构

本服务器采用简单的 REST API 架构，主要由以下组件组成：

1. **Express 应用程序** - 处理 HTTP 请求和 SSE 连接
2. **提示模板存储** - 以文本文件形式存储在 `prompts` 目录
3. **MCP 服务器实现** - 使用 `@modelcontextprotocol/sdk` 实现标准 MCP 接口
4. **自然语言映射** - 将自然语言查询映射到对应的提示类型

## 添加新的提示类型

要添加新的提示类型，请按以下步骤操作:

1. 在`prompts`目录中创建一个新的文本文件。文件名应为提示类型名，扩展名为`.txt`
2. 更新`src/config/promptMappings.js`文件，添加新的自然语言模式和提示类型映射

例如，要添加`mobile-web`提示类型:

1. 创建`prompts/mobile-web.txt`文件
2. 在`promptMappings.js`中添加新的映射，例如:

```javascript
{
  patterns: [
    '移动端提示词',
    '帮我生成移动端提示词',
    'mobile web提示词'
  ],
  type: 'mobile-web'
}
```
