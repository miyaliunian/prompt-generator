/*
 * @Author: 逗逗飞 wufei@strongdata.com.cn
 * @Date: 2025-04-10 22:26:43
 * @LastEditors: 逗逗飞 wufei@strongdata.com.cn
 * @LastEditTime: 2025-04-11 07:49:44
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PromptGeneratorServer, Logger } from './server.js'
import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env') })

export async function startServer() {
  const isStdioMode = process.env.NODE_ENV === 'cli' || process.argv.includes('--stdio')

  const server = new PromptGeneratorServer()

  if (isStdioMode) {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  } else {
    Logger.log(`Initializing Prompts MCP Server in HTTP mode on port ${process.env.PORT}...`)
    await server.startHttpServer(process.env.PORT || 3002)
  }
}

startServer().catch((error) => {
  Logger.error('Failed to start server:', error)
  process.exit(1)
})
