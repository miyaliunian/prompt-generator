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
import cors from 'cors'

// 导入常量 - 修复目录导入问题
import { PC_GUIDELINES, APP_GUIDELINES, DEFAULT_REQUESTS } from './constants/index.js'

// Element Plus组件映射关系
const ELEMENT_PLUS_MAPPINGS = {
  // 基础组件
  按钮: { name: 'el-button', importance: 'critical', description: '用于触发操作的按钮组件' },
  图标: { name: 'el-icon', importance: 'important', description: '显示图标的组件' },
  链接: { name: 'el-link', importance: 'optional', description: '文字链接组件' },

  // 表单组件
  输入框: { name: 'el-input', importance: 'critical', description: '文本输入框组件' },
  文本框: { name: 'el-input', importance: 'critical', description: '文本输入框组件' },
  搜索框: {
    name: 'el-input',
    importance: 'important',
    description: "带搜索图标的输入框，通常设置suffix-icon='Search'"
  },
  数字输入框: { name: 'el-input-number', importance: 'important', description: '数字输入框组件' },
  下拉框: { name: 'el-select', importance: 'critical', description: '下拉选择框组件' },
  下拉选择: { name: 'el-select', importance: 'critical', description: '下拉选择框组件' },
  选择器: { name: 'el-select', importance: 'critical', description: '下拉选择框组件' },
  下拉菜单: { name: 'el-dropdown', importance: 'important', description: '下拉菜单组件，用于显示更多操作' },
  复选框: { name: 'el-checkbox', importance: 'important', description: '复选框组件' },
  单选框: { name: 'el-radio', importance: 'important', description: '单选框组件' },
  开关: { name: 'el-switch', importance: 'important', description: '开关组件' },
  滑块: { name: 'el-slider', importance: 'optional', description: '滑块组件' },
  时间选择器: { name: 'el-time-picker', importance: 'optional', description: '时间选择器组件' },
  日期选择器: { name: 'el-date-picker', importance: 'important', description: '日期选择器组件' },
  日期范围选择器: { name: 'el-date-picker', importance: 'important', description: "设置type='daterange'的日期选择器" },
  级联选择器: { name: 'el-cascader', importance: 'optional', description: '级联选择器组件' },
  上传: { name: 'el-upload', importance: 'optional', description: '文件上传组件' },
  颜色选择器: { name: 'el-color-picker', importance: 'optional', description: '颜色选择器组件' },
  表单: { name: 'el-form', importance: 'critical', description: '表单容器组件，用于包含各种表单元素' },

  // 数据展示组件
  表格: { name: 'el-table', importance: 'critical', description: '表格组件，用于展示数据' },
  数据表格: { name: 'el-table', importance: 'critical', description: '表格组件，用于展示数据' },
  表: { name: 'el-table', importance: 'critical', description: '表格组件，用于展示数据' },
  数据表: { name: 'el-table', importance: 'critical', description: '表格组件，用于展示数据' },
  表头: { name: 'el-table-column', importance: 'critical', description: '表格列组件，用于定义表格的列' },
  表格列: { name: 'el-table-column', importance: 'critical', description: '表格列组件，用于定义表格的列' },
  分页: { name: 'el-pagination', importance: 'critical', description: '分页组件，用于数据分页展示' },
  分页器: { name: 'el-pagination', importance: 'critical', description: '分页组件，用于数据分页展示' },
  标签: { name: 'el-tag', importance: 'important', description: '标签组件，用于标记和选择' },
  标签页: { name: 'el-tabs', importance: 'important', description: '标签页组件，用于分隔内容区域' },
  选项卡: { name: 'el-tabs', importance: 'important', description: '标签页组件，用于分隔内容区域' },
  进度条: { name: 'el-progress', importance: 'optional', description: '进度条组件，用于展示进度' },
  树: { name: 'el-tree', importance: 'optional', description: '树形控件，用于展示层级结构数据' },
  树形控件: { name: 'el-tree', importance: 'optional', description: '树形控件，用于展示层级结构数据' },

  // 导航组件
  菜单: { name: 'el-menu', importance: 'important', description: '导航菜单组件' },
  导航菜单: { name: 'el-menu', importance: 'important', description: '导航菜单组件' },
  面包屑: { name: 'el-breadcrumb', importance: 'optional', description: '面包屑导航组件' },
  面包屑导航: { name: 'el-breadcrumb', importance: 'optional', description: '面包屑导航组件' },
  页头: { name: 'el-page-header', importance: 'optional', description: '页头组件，含有返回按钮、标题等' },
  头部: { name: 'el-header', importance: 'important', description: '布局头部容器组件' },
  步骤条: { name: 'el-steps', importance: 'optional', description: '步骤条组件，引导用户完成流程' },

  // 反馈组件
  对话框: { name: 'el-dialog', importance: 'important', description: '对话框组件，用于展示信息或操作' },
  弹窗: { name: 'el-dialog', importance: 'important', description: '对话框组件，用于展示信息或操作' },
  弹出框: { name: 'el-dialog', importance: 'important', description: '对话框组件，用于展示信息或操作' },
  提示: { name: 'el-tooltip', importance: 'important', description: '文字提示组件，鼠标悬停时显示' },
  气泡提示: { name: 'el-popover', importance: 'optional', description: '气泡卡片组件，可包含更复杂内容' },
  警告: { name: 'el-alert', importance: 'optional', description: '警告提示组件' },
  加载中: { name: 'el-loading', importance: 'important', description: '加载中指示器组件' },
  消息提示: { name: 'ElMessage', importance: 'important', description: '消息提示函数，非组件形式使用' },
  通知: { name: 'ElNotification', importance: 'optional', description: '通知提示函数，非组件形式使用' },

  // 布局组件
  容器: { name: 'el-container', importance: 'critical', description: '外层容器组件' },
  布局: { name: 'el-container', importance: 'critical', description: '外层容器组件' },
  行: { name: 'el-row', importance: 'critical', description: '行组件，配合el-col使用' },
  列布局: { name: 'el-col', importance: 'critical', description: '列组件，配合el-row使用' },
  栅格: { name: 'el-row/el-col', importance: 'critical', description: '栅格布局组件，包含行和列' },
  分割线: { name: 'el-divider', importance: 'optional', description: '分割线组件' },
  卡片: { name: 'el-card', importance: 'important', description: '卡片组件，用于信息展示' },
  侧边栏: { name: 'el-aside', importance: 'important', description: '侧边栏容器组件' },
  主体: { name: 'el-main', importance: 'important', description: '主体内容容器组件' },
  底部: { name: 'el-footer', importance: 'optional', description: '底部容器组件' },

  // 图表相关
  折线图: { name: 'echarts', importance: 'important', description: '使用ECharts库绘制折线图，需额外引入' },
  柱状图: { name: 'echarts', importance: 'important', description: '使用ECharts库绘制柱状图，需额外引入' },
  饼图: { name: 'echarts', importance: 'important', description: '使用ECharts库绘制饼图，需额外引入' },
  环形图: { name: 'echarts', importance: 'important', description: '使用ECharts库绘制环形图，需额外引入' },
  仪表盘: { name: 'echarts', importance: 'optional', description: '使用ECharts库绘制仪表盘，需额外引入' },
  散点图: { name: 'echarts', importance: 'optional', description: '使用ECharts库绘制散点图，需额外引入' },
  热力图: { name: 'echarts', importance: 'optional', description: '使用ECharts库绘制热力图，需额外引入' },
  地图: { name: 'echarts', importance: 'optional', description: '使用ECharts库绘制地图，需额外引入' }
}

// Element Plus组件筛选提示词
export const FILTER_COMPONENTS = `<requirement>
As a web UI expert, analyze the provided UI description thoroughly and identify ONLY the specific components and charts from Element Plus library absolutely necessary to implement the described interface.

Your analysis should:
1. Consider the exact functional requirements in the description
2. Identify the minimum set of Element Plus components needed
3. Exclude components that might be nice-to-have but aren't essential
4. Justify each component's selection with a brief reason tied to the requirements
5. Consider performance and maintainability implications
6. Reference documentation at: https://element.eleme.io/#/zh-CN/component/installation

I will use your precise component selection to read documentation and implement the UI.
</requirement>
<response_format>
{
  "components": [
    {
      "name": "string",
      "necessity": "critical|important|optional",
      "justification": "string"
    }
  ],
  "charts": [
    {
      "name": "string", 
      "necessity": "critical|important|optional",
      "justification": "string"
    }
  ]
}
</response_format>`

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
      { request: z.string().optional(), platform: z.enum(['PC', 'APP']).optional() },
      this.createGeminiEnhancedPromptTool()
    )
  }

  /**
   * 创建使用Gemini增强的提示词生成工具
   * @returns {Function} 生成工具处理函数
   */
  createGeminiEnhancedPromptTool() {
    return async ({ request, platform = 'PC' }) => {
      // 根据平台选择相应的指导原则和默认请求
      const platformType = platform === 'PC' ? 'PC端' : '移动端'
      const guidelines = platform === 'PC' ? PC_GUIDELINES : APP_GUIDELINES
      const defaultRequest = platform === 'PC' ? DEFAULT_REQUESTS.pc : DEFAULT_REQUESTS.app

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

    // 配置CORS中间件
    app.use(
      cors({
        origin: '*', // 允许所有来源访问，生产环境建议设置为特定域名
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      })
    )

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
      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // 创建SSE发送函数
      const sendSSE = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }

      try {
        // 重写Logger方法以支持SSE
        const streamLogger = {
          log: (message, data = null) => {
            Logger.log(message)
            sendSSE('log', { message, data })
          },
          error: (message, error = null) => {
            Logger.error(message)
            sendSSE('error', { message, error: error?.message || error })
          }
        }

        streamLogger.log('====== 开始处理图像上传请求 ======')

        // 1. 验证上传的文件
        if (!req.file) {
          streamLogger.error('错误: 没有提供图像文件')
          sendSSE('complete', { error: '没有提供图像文件' })
          return res.end()
        }

        // 2. 记录上传文件信息
        streamLogger.log('文件已成功上传', {
          路径: req.file.path,
          文件名: req.file.filename,
          原始文件名: req.file.originalname,
          MIME类型: req.file.mimetype,
          大小: req.file.size
        })

        // 3. 获取请求中的额外参数
        const platform = req.body.platform || 'PC'
        const request = req.body.request || ''
        streamLogger.log('请求参数', { platform, request: request || '(使用默认值)' })

        // 3.1 根据平台类型选择相应的指导原则和默认请求
        const platformType = platform === 'PC' ? 'PC端' : '移动端'
        const guidelines = (platform === 'PC' ? PC_GUIDELINES : APP_GUIDELINES)
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        streamLogger.log(`选择${platformType}平台的指导原则和默认请求`)

        // 4. 使用Gemini模型分析图像
        streamLogger.log('开始进行图像分析...')

        // 4.1 准备图像数据
        const imageParts = [
          {
            inlineData: {
              data: Buffer.from(fs.readFileSync(req.file.path)).toString('base64'),
              mimeType: req.file.mimetype
            }
          }
        ]
        streamLogger.log('图像数据准备完成')

        // 4.2 初始化Gemini模型
        streamLogger.log('初始化Gemini模型...')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        // 4.3 调用API分析图像
        streamLogger.log('调用Gemini API分析图像...')
        const generatedContent = await model.generateContent([
          `请分析用户界面截图，识别并描述所有可见的界面元素和布局结构。按照下面的分析结构直接返回Markdown格式的内容：

请直接返回分析内容，不要添加任何标题、前缀或说明文字。不要包含"图像分析结果"、"分析如下"、"以下是分析"等任何引导性文字。

如果是数据看板类型，请分析：
1. 数据指标布局 (Metrics Layout)
2. 数据可视化 (Data Visualization)
3. 实时数据更新机制

如果是列表页类型，请分析：
1. 搜索筛选区 (Search & Filter)
2. 表格内容 (Table Content)
3. 分页组件 (Pagination)

无论哪种界面类型，都请分析：
1. 视觉设计 (Visual Design)
2. 交互反馈 (Interactive Feedback)
3. 辅助功能 (Auxiliary Features)

分析要求：
1. 严格使用<Image-Analysis></Image-Analysis>标签包裹所有内容
2. 使用Markdown格式，保持清晰的层级结构
3. 提供所有可见文本的中英文对照
4. 提供具体的色号、尺寸和间距

<Image-Analysis>
// 这里直接开始你的分析内容，不要添加任何标题或开场白
`,
          ...imageParts
        ])

        // 4.4 获取分析结果
        streamLogger.log('成功获取API响应，处理结果...')
        const response = await generatedContent.response
        const imageAnalysis = response.text() || '图像分析失败'
        streamLogger.log('图像分析完成', { 结果长度: imageAnalysis.length })

        // 4.5 筛选Element Plus组件
        streamLogger.log('开始筛选Element Plus组件...')
        let componentSuggestions = null
        try {
          // 使用本地映射而非API调用
          const keywords = [
            // 基础UI元素关键词
            '按钮',
            '输入框',
            '文本框',
            '搜索框',
            '下拉框',
            '下拉选择',
            '选择器',
            '表格',
            '表',
            '分页',
            '标签',
            '菜单',
            '对话框',
            '弹窗',
            '提示',
            '布局',
            '容器',
            '卡片',

            // 数据展示关键词
            '折线图',
            '柱状图',
            '饼图',
            '环形图',
            '统计',
            '数据表',
            '列表',

            // 交互元素关键词
            '上传',
            '开关',
            '复选框',
            '单选框',
            '滑块',
            '日期',
            '时间'
          ]

          // 从分析结果中提取相关组件
          const identifiedComponents = {
            components: [],
            charts: []
          }

          // 扫描分析文本中的关键词
          for (const keyword of keywords) {
            if (imageAnalysis.includes(keyword) && ELEMENT_PLUS_MAPPINGS[keyword]) {
              const component = ELEMENT_PLUS_MAPPINGS[keyword]

              // 避免重复添加
              const isChartComponent = component.name === 'echarts'
              const targetArray = isChartComponent ? identifiedComponents.charts : identifiedComponents.components

              if (!targetArray.some((item) => item.name === component.name)) {
                targetArray.push({
                  name: component.name,
                  necessity: component.importance,
                  justification: `界面分析中包含"${keyword}"，需要使用${component.description}`
                })
              }
            }
          }

          // 添加必要的布局组件
          if (!identifiedComponents.components.some((item) => item.name === 'el-container')) {
            identifiedComponents.components.push({
              name: 'el-container',
              necessity: 'critical',
              justification: '作为整体页面的容器，包含所有其他组件'
            })
          }

          if (!identifiedComponents.components.some((item) => item.name === 'el-row' || item.name === 'el-col')) {
            identifiedComponents.components.push({
              name: 'el-row',
              necessity: 'critical',
              justification: '用于行级布局，配合el-col使用'
            })
            identifiedComponents.components.push({
              name: 'el-col',
              necessity: 'critical',
              justification: '用于列级布局，配合el-row使用'
            })
          }

          componentSuggestions = JSON.stringify(identifiedComponents, null, 2)
          streamLogger.log('Element Plus组件筛选完成', { 结果长度: componentSuggestions.length })
        } catch (error) {
          streamLogger.error('组件筛选过程中发生错误:', error)
          componentSuggestions = '组件筛选失败: ' + error.message
        }

        // 5. 构建完整提示词
        streamLogger.log('开始构建完整提示词...')
        const promptText = `请根据以下界面分析、Element Plus组件建议和开发指导原则，生成一个完整的 Vue 单文件组件 (.vue)。

### 界面分析 (Interface Analysis):
${imageAnalysis}

### Element Plus组件建议 (Component Recommendations):
${componentSuggestions}

### ${platformType}开发指导原则 (General Development Guidelines):
${guidelines}

请使用 Element Plus 组件库实现此界面，确保生成的代码是完整的、功能可用的，并严格遵守以下要求：
1. 使用Vue 3和Composition API（setup语法糖）
2. 引入并注册所有必要的Element Plus组件
3. 遵循Element Plus组件的使用规范
4. 添加必要的交互逻辑（表单验证、数据筛选、分页等）
5. 使用响应式设计确保界面在不同屏幕尺寸下正常显示
6. 代码结构清晰，添加必要的注释
7. 所有文本保持中英文对照
`
        streamLogger.log('提示词构建完成', { 长度: promptText.length })

        // 6. 发送最终结果
        streamLogger.log('处理完成，发送最终结果')
        sendSSE('complete', {
          success: true,
          filePath: req.file.path,
          fileName: req.file.filename,
          imageAnalysis: imageAnalysis,
          promptText: promptText
        })

        // 结束响应流
        res.end()
      } catch (error) {
        // 7. 错误处理
        Logger.error('图像上传处理过程中发生错误:', error)
        Logger.error('错误堆栈:', error.stack)
        sendSSE('error', {
          error: '图像上传处理失败',
          message: error.message,
          stack: error.stack
        })
        res.end()
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
