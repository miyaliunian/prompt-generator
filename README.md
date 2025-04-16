# Prompt Generator MPC Server

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
- 提供结构化的提示词模板，可定制不同的界面布局需求
- 支持多种连接方式（HTTP、SSE、本地直连）
- 支持多种端（PC Web、移动 App）的提示词生成
- 模块化的代码结构，易于扩展和维护
- **支持图像分析与处理**: 接收Cursor截图并基于图像内容生成精准代码提示

## Project Structure

```
prompt-generator/
├── src/                      # 源代码目录
│   ├── index.js              # 程序入口，负责启动服务器
│   ├── server.js             # 服务器核心代码，实现 MCP 协议和提示词生成逻辑
│   └── constants/            # 常量目录
│       ├── index.js          # 常量统一导出
│       ├── guidelines.js     # 各平台开发指导原则常量
│       └── defaults.js       # 默认请求示例常量
├── prompts/                  # 提示词模板目录（历史遗留）
├── package.json              # 项目配置和依赖管理
└── README.md                 # 项目说明文档
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

## 使用方法

服务器提供两个主要的工具：

1. **PC 端提示词生成** (`generate_pc_prompt`)

   - 专为桌面网页界面设计
   - 基于 Element Plus UI 库
   - 包含表格、分页、筛选区域等组件指南

2. **App 端提示词生成** (`generate_app_prompt`)
   - 专为移动应用界面设计
   - 基于 Vant 等移动端 UI 库
   - 包含触摸友好、导航栏、下拉刷新等移动端特有功能指南

### 示例请求

#### PC 端示例请求：

```
使用generate_pc_prompt 创建PC端提示词  描述如下
"创建一个资源管理页面的 Vue 组件。顶部筛选区域包含：资源类型（输入框）、资源属性（下拉框）、客户ID（输入框）。表格显示 ID、名称、状态、创建时间，并包含编辑/删除按钮。底部需要分页控件。"
```

#### App 端示例请求：

```
generate_app_prompt 创建App端提示词  描述如下
"创建一个移动端商品详情页面。顶部有商品图片轮播，中间显示商品名称、价格和规格选择，底部有'加入购物车'和'立即购买'按钮。支持下拉查看商品详情。"
```

## 添加新的平台支持

要添加新的平台（如小程序、桌面应用等）支持，请按以下步骤操作:

1. 在 `src/constants/guidelines.js` 中添加新平台的开发指导原则常量
2. 在 `src/constants/defaults.js` 中添加新平台的默认请求示例
3. 在 `src/server.js` 的 `registerTools` 方法中注册新平台的工具

例如，要添加小程序平台支持:

```javascript
// 在 guidelines.js 中
export const MINIPROGRAM_GUIDELINES = `
1. 使用小程序原生组件和API...
// ... 更多指导原则
`

// 在 defaults.js 中
export const DEFAULT_REQUESTS = {
  // ... 已有平台
  miniprogram: '生成一个小程序首页，包含轮播图、分类导航和商品列表...'
}

// 在 server.js 的 registerTools 方法中
this.server.tool(
  'generate_miniprogram_prompt',
  { request: z.string().optional() },
  createPromptTool('小程序', DEFAULT_REQUESTS.miniprogram, MINIPROGRAM_GUIDELINES)
)
```

## 技术栈

- **运行环境**: Node.js
- **框架**: Express.js
- **依赖库**:
  - `@modelcontextprotocol/sdk`: MCP 协议实现
  - `express`: Web 服务器框架
  - `zod`: 数据验证

## License

ISC

## 如何使用图像功能

Cursor可以通过两种方式传递图像到MPC服务器:

1. **MCP工具调用**:

   - 使用`generate_pc_image_prompt`或`generate_app_image_prompt`工具
   - 通过`image_data`参数传递Base64编码的图像或Data URL

2. **HTTP端点**:
   - 直接POST图像文件到`/upload-image`端点
   - 使用multipart/form-data格式上传文件

## 示例

在Cursor中使用MCP工具调用(示例):

```javascript
// 调用MCP工具处理图像
const response = await mcp.tool('generate_pc_image_prompt', {
  request: '实现一个登录表单',
  image_data: 'base64EncodedImageData...' // 图像的base64数据
})

// 使用返回的提示词生成代码
console.log(response.content[0].text)
```
