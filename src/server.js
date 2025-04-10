import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express from 'express'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const promptsDir = path.join(__dirname, '..', 'prompts')
const packageJsonPath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

export const Logger = {
  log: (..._args) => {},
  error: (..._args) => {}
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
    // Add a PC web prompt generation tool
    this.server.tool('generate_pc_prompt', { request: z.string().optional() }, async ({ request: _request }) => {
      const template = await this.loadPromptTemplate('pc-web')

      return {
        content: [
          {
            type: 'text',
            text: `Create detailed Vue components with these requirements:\n\n${template}`
          }
        ]
      }
    })
  }

  async loadPromptTemplate(type) {
    try {
      const filePath = path.join(promptsDir, `${type}.txt`)
      return await fs.promises.readFile(filePath, 'utf8')
    } catch (error) {
      console.error(`Error loading prompt template: ${error.message}`)
      return null
    }
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
      console.log('New SSE connection established')
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
