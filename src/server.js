import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptsDir = path.join(__dirname, "..", "prompts");

// Create an MCP server
const server = new McpServer({
  name: "prompt-generation",
  version: "1.0.0",
});

// Add a PC web prompt generation tool
server.tool(
  "generate_pc_prompt",
  { request: z.string().optional() },
  async ({ request }) => {
    const template = await loadPromptTemplate("pc-web");

    return {
      content: [
        {
          type: "text",
          text: `Here's a PC web prompt template:\n\n${template}`,
        },
      ],
    };
  }
);

// Function to load prompt template
async function loadPromptTemplate(type) {
  try {
    const filePath = path.join(promptsDir, `${type}.txt`);
    return await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    console.error(`Error loading prompt template: ${error.message}`);
    return null;
  }
}

// Add prompt resources
server.resource(
  "prompt-template",
  new ResourceTemplate("prompt-template://{type}", { list: undefined }),
  async (uri, { type }) => {
    const template = await loadPromptTemplate(type || "pc-web");

    if (!template) {
      return {
        contents: [
          {
            uri: uri.href,
            text: "Prompt template not found.",
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: template,
        },
      ],
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
