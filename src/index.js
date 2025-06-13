#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import { loadConfig } from './config/index.js';
import { MessageRouter } from './platforms/router.js';

dotenv.config();

const logger = createLogger('MCP-Server');
const config = loadConfig();
const messageRouter = new MessageRouter(config, logger);

const server = new Server(
  {
    name: 'claude-comm-bot',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sendMessage',
        description: 'Send a message to configured chat platforms (Discord/Telegram)',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to send',
            },
            platform: {
              type: 'string',
              enum: ['discord', 'telegram'],
              description: 'Specific platform to send to (optional, defaults to all configured)',
            },
            urgent: {
              type: 'boolean',
              description: 'Mark message as urgent for special formatting (optional)',
              default: false,
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'sendStatusUpdate',
        description: 'Send a formatted status update with optional progress',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Current status description',
            },
            details: {
              type: 'string',
              description: 'Additional details about the status (optional)',
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Progress percentage (0-100, optional)',
            },
          },
          required: ['status'],
        },
      },
      {
        name: 'requestInput',
        description: 'Request input from the user and wait for response',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The question/prompt to send to the user',
            },
            timeout: {
              type: 'number',
              description: 'Timeout in seconds (default: 300)',
              default: 300,
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'sendMessage': {
        const { message, platform, urgent = false } = args;
        const result = await messageRouter.sendMessage(message, platform, urgent);
        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully to ${result.platforms.join(', ')}`,
            },
          ],
        };
      }

      case 'sendStatusUpdate': {
        const { status, details, progress } = args;
        const result = await messageRouter.sendStatusUpdate(status, details, progress);
        return {
          content: [
            {
              type: 'text',
              text: `Status update sent to ${result.platforms.join(', ')}`,
            },
          ],
        };
      }

      case 'requestInput': {
        const { prompt, timeout = 300 } = args;
        const result = await messageRouter.requestInput(prompt, timeout);
        return {
          content: [
            {
              type: 'text',
              text: result.response || 'No response received within timeout',
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Tool execution error for ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  try {
    logger.info('Starting Claude Code Communication Bot MCP Server...');
    
    await messageRouter.initialize();
    logger.info('Message router initialized successfully');

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP Server started successfully');
    logger.info(`Configured platforms: ${Object.keys(config.platforms).join(', ')}`);
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down MCP server...');
  await messageRouter.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down MCP server...');
  await messageRouter.cleanup();
  process.exit(0);
});

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});