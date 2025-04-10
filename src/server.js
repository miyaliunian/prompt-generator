import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'
import { z } from 'zod'

// 导入常量 - 修复目录导入问题
import { PC_GUIDELINES, APP_GUIDELINES, DEFAULT_REQUESTS } from './constants/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

export const Logger = {
  log: (..._args) => {},
  error: (..._args) => {}
}

/**
 * 创建提示词生成工具
 * @param {string} platformType - 平台类型名称 (如 "PC端", "移动端")
 * @param {string} defaultRequest - 默认请求描述
 * @param {string} guidelines - 对应平台的开发指导原则
 * @returns {Function} 生成工具处理函数
 */
function createPromptTool(platformType, defaultRequest, guidelines) {
  return async ({ request }) => {
    const promptText = `请根据以下具体需求和通用的${platformType}开发指导原则，生成一个完整的 Vue 单文件组件 (.vue)。

具体需求 (Specific Request):
${request || defaultRequest}

通用${platformType}开发指导原则 (General Development Guidelines):
${guidelines}

请确保生成的代码是完整的、功能可用的，并严格遵守所有指示。`

    return {
      content: [
        {
          type: 'text',
          text: promptText
        }
      ]
    }
  }
}

export class PromptGeneratorServer {
  server
  sseTransport

  constructor() {
    // create Mcp Server
    this.server = new McpServer({
      name: packageJson.name,
      version: packageJson.version
    })

    this.registerTools()
  }

  registerTools() {
    // 添加 PC Web 提示词生成工具
    this.server.tool(
      'generate_pc_prompt',
      { request: z.string().optional() },
      createPromptTool('PC端', DEFAULT_REQUESTS.pc, PC_GUIDELINES)
    )

    // 添加 App 移动端提示词生成工具
    this.server.tool(
      'generate_app_prompt',
      { request: z.string().optional() },
      createPromptTool('移动端', DEFAULT_REQUESTS.app, APP_GUIDELINES)
    )
  }

  async connect(transport) {
    // Logger.log("Connecting to transport...");
    await this.server.connect(transport)
    Logger.log = console.log
    Logger.error = console.error

    Logger.log('Server connected and ready to process requests')
  }

  async startHttpServer(port) {
    const app = express()

    app.get('/sse', async (req, res) => {
      Logger.log('New SSE connection established')
      this.sseTransport = new SSEServerTransport('/messages', res)
      await this.server.connect(this.sseTransport)
    })

    app.post('/messages', async (req, res) => {
      if (!this.sseTransport) {
        res.sendStatus(400)
        return
      }
      await this.sseTransport.handlePostMessage(req, res)
    })

    Logger.log = console.log
    Logger.error = console.error

    app.listen(port, () => {
      Logger.log(`HTTP server listening on port ${port}`)
      Logger.log(`SSE endpoint available at http://localhost:${port}/sse`)
      Logger.log(`Message endpoint available at http://localhost:${port}/messages`)
    })
  }
}
