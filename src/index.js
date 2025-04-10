import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { PromptGeneratorServer } from './server.js'
import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env') })

export async function startServer() {
  // Check if we're running in stdio mode (e.g., via CLI)
  const isStdioMode = process.env.NODE_ENV === 'cli' || process.argv.includes('--stdio')

  const server = new PromptGeneratorServer()

  if (isStdioMode) {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  } else {
    console.log(`Initializing Figma MCP Server in HTTP mode on port ${config.port}...`)
    await server.startHttpServer(config.port || 3002)
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
