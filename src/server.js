import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { Buffer } from 'buffer'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'
import { z } from 'zod'
import { GoogleGenAI } from '@google/genai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import multer from 'multer'
import bodyParser from 'body-parser'

// 导入常量 - 修复目录导入问题
import { PC_GUIDELINES, APP_GUIDELINES, DEFAULT_REQUESTS } from './constants/index.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

// 文字生成
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY)
// 视觉理解
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

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

    // 添加 Gemini 增强的提示词生成工具
    this.server.tool(
      'generate_gemini_enhanced_prompt',
      { request: z.string().optional(), platform: z.enum(['pc', 'app']).optional() },
      this.createGeminiEnhancedPromptTool()
    )
  }

  /**
   * 创建使用Gemini增强的提示词生成工具
   * @returns {Function} 生成工具处理函数
   */
  createGeminiEnhancedPromptTool() {
    return async ({ request, platform = 'pc' }) => {
      // 根据平台选择相应的指导原则和默认请求
      const platformType = platform === 'pc' ? 'PC端' : '移动端'
      const guidelines = platform === 'pc' ? PC_GUIDELINES : APP_GUIDELINES
      const defaultRequest = platform === 'pc' ? DEFAULT_REQUESTS.pc : DEFAULT_REQUESTS.app

      // 构建基础提示词
      const basePrompt = `请根据以下具体需求和通用的${platformType}开发指导原则，生成一个完整的 Vue 单文件组件 (.vue)。

具体需求 (Specific Request):
${request || defaultRequest}

通用${platformType}开发指导原则 (General Development Guidelines):
${guidelines}`

      try {
        // 使用Gemini增强提示词
        const result = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `你是一个专业的AI prompts工程师 。请分析下面的提示词，并对其进行改进，使其能生成更好的代码。
        添加更多技术细节和最佳实践，但保持原始需求不变。原始提示词：
        ${basePrompt} 需要你返回优化后提示词 减少不必要的输出 返回的提示词 以
        请根据以下具体需求和 ${platformType} 端开发指导原则，生成一个完整的 Vue 单文件组件 (.vue) 开头
        `
        })

        // 获取增强后的提示词
        const response = await result.response
        const enhancedPrompt = response.text() || basePrompt

        return {
          content: [
            {
              type: 'text',
              text: enhancedPrompt + '\n\n请确保生成的代码是完整的、功能可用的, 并严格遵守所有指示。'
            }
          ]
        }
      } catch (error) {
        Logger.error('Gemini API调用失败:', error)
        // 如果Gemini调用失败，回退到基础提示词
        return {
          content: [
            {
              type: 'text',
              text: basePrompt + '\n\n请确保生成的代码是完整的、功能可用的,并严格遵守所有指示。'
            }
          ]
        }
      }
    }
  }

  async connect(transport) {
    await this.server.connect(transport)
    // eslint-disable-next-line no-console
    Logger.log = console.log
    // eslint-disable-next-line no-console
    Logger.error = console.error

    Logger.log('Server connected and ready to process requests')
  }

  async startHttpServer(port) {
    const app = express()

    // 配置中间件
    app.use(bodyParser.json({ limit: '50mb' })) // 增加限制以支持大型base64图像
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))

    // SSE连接端点
    app.get('/sse', async (req, res) => {
      Logger.log('New SSE connection established')
      this.sseTransport = new SSEServerTransport('/messages', res)
      await this.server.connect(this.sseTransport)
    })

    // 消息处理端点
    app.post('/messages', async (req, res) => {
      if (!this.sseTransport) {
        res.sendStatus(400)
        return
      }
      await this.sseTransport.handlePostMessage(req, res)
    })

    // 添加图像上传端点 (用于直接通过HTTP端点上传图像而非通过MCP协议)
    app.post('/upload-image', upload.single('image'), async (req, res) => {
      try {
        Logger.log('====== 开始处理图像上传请求 ======')

        // 1. 验证上传的文件
        if (!req.file) {
          Logger.error('错误: 没有提供图像文件')
          return res.status(400).json({ error: '没有提供图像文件' })
        }

        // 2. 记录上传文件信息
        Logger.log('文件已成功上传:', {
          路径: req.file.path,
          文件名: req.file.filename,
          原始文件名: req.file.originalname,
          MIME类型: req.file.mimetype,
          大小: req.file.size
        })

        // 3. 获取请求中的额外参数
        const platform = req.body.platform || 'pc' // 默认为PC平台
        const request = req.body.request || '' // 自定义请求描述
        Logger.log('请求参数:', { platform, request: request || '(使用默认值)' })

        // 3.1 根据平台类型选择相应的指导原则和默认请求
        const platformType = platform === 'pc' ? 'PC端' : '移动端'
        const guidelines = platform === 'pc' ? PC_GUIDELINES : APP_GUIDELINES
        Logger.log(`选择${platformType}平台的指导原则和默认请求`)

        // 4. 使用Gemini模型分析图像
        Logger.log('开始进行图像分析...')

        // 4.1 准备图像数据
        const imageParts = [
          {
            inlineData: {
              data: Buffer.from(fs.readFileSync(req.file.path)).toString('base64'),
              mimeType: req.file.mimetype
            }
          }
        ]
        Logger.log('图像数据准备完成')

        // 4.2 初始化Gemini模型
        Logger.log('初始化Gemini模型...')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        // 4.3 调用API分析图像
        Logger.log('调用Gemini API分析图像...')
        const generatedContent = await model.generateContent([
          '仅列出用户界面截图中的所有重要元素和功能，以简短中文要点形式直接枚举，不要添加任何开场白或介绍性文字。',
          ...imageParts
        ])

        // 4.4 获取分析结果
        Logger.log('成功获取API响应，处理结果...')
        const response = await generatedContent.response
        const imageAnalysis = response.text() || '图像分析失败'
        Logger.log('图像分析完成，结果长度:', imageAnalysis.length)

        // 5. 构建完整提示词
        Logger.log('开始构建完整提示词...')
        const promptText = `请根据以下图像分析结果、${platformType}开发指导原则，生成一个完整的 Vue 单文件组件 (.vue)。

        图像分析结果 (Image Analysis):
        ${imageAnalysis}
        ${platformType}开发指导原则 (General Development Guidelines):
        ${guidelines}

        请确保生成的代码是完整的、功能可用的，并严格遵守所有指示。`
        Logger.log('提示词构建完成，长度:', promptText.length)

        // 6. 返回成功响应
        Logger.log('准备发送响应...')
        res.json({
          success: true,
          filePath: req.file.path,
          fileName: req.file.filename,
          imageAnalysis: imageAnalysis,
          promptText: promptText
        })
      } catch (error) {
        // 7. 错误处理
        Logger.error('图像上传处理过程中发生错误:', error)
        Logger.error('错误堆栈:', error.stack)
        res.status(500).json({ error: '图像上传处理失败', message: error.message })
      }
    })

    // eslint-disable-next-line no-console
    Logger.log = console.log
    // eslint-disable-next-line no-console
    Logger.error = console.error
    app.listen(port, () => {
      Logger.log(`HTTP server listening on port ${port}`)
      Logger.log(`SSE endpoint available at http://localhost:${port}/sse`)
      Logger.log(`Message endpoint available at http://localhost:${port}/messages`)
      Logger.log(`Image upload endpoint available at http://localhost:${port}/upload-image`)
    })
  }
}
