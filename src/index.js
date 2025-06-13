#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

class DiscordMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'claude-code-discord-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.discordClient = null;
    this.messageQueue = [];
    this.pendingResponses = new Map();
    this.setupMCPHandlers();
    this.initializeDiscord();
  }

  async initializeDiscord() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN is required');
      return;
    }

    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ]
    });

    this.discordClient.once(Events.ClientReady, (readyClient) => {
      console.error(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
    });

    this.discordClient.on(Events.MessageCreate, (message) => {
      if (message.author.bot) return;
      
      // Check if message is from configured user/channel
      const allowedUserId = process.env.DISCORD_USER_ID;
      const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
      
      if (allowedUserId && message.author.id !== allowedUserId) return;
      if (allowedChannelId && message.channel.id !== allowedChannelId) return;

      this.handleDiscordMessage(message);
    });

    try {
      await this.discordClient.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to login to Discord:', error);
    }
  }

  handleDiscordMessage(message) {
    // Store message for potential response matching
    this.messageQueue.push({
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: Date.now(),
      channel: message.channel.id
    });

    // Check if this message responds to a pending request
    for (const [requestId, request] of this.pendingResponses.entries()) {
      if (Date.now() - request.timestamp < request.timeout) {
        // This could be a response to our request
        request.resolve(message.content);
        this.pendingResponses.delete(requestId);
        break;
      }
    }

    // Keep only recent messages (last 50)
    if (this.messageQueue.length > 50) {
      this.messageQueue = this.messageQueue.slice(-50);
    }
  }

  setupMCPHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_discord_message',
            description: 'Send a message to Discord channel or user',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'The message to send'
                },
                urgent: {
                  type: 'boolean',
                  description: 'Whether this is an urgent message (affects formatting)',
                  default: false
                }
              },
              required: ['message']
            }
          },
          {
            name: 'request_discord_input',
            description: 'Send a message and wait for user response',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The prompt/question to ask the user'
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in seconds to wait for response',
                  default: 300
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'get_recent_messages',
            description: 'Get recent Discord messages from the user',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of recent messages to retrieve',
                  default: 10
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'send_discord_message':
            return await this.sendDiscordMessage(args.message, args.urgent);
          
          case 'request_discord_input':
            return await this.requestDiscordInput(args.prompt, args.timeout || 300);
          
          case 'get_recent_messages':
            return await this.getRecentMessages(args.limit || 10);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async sendDiscordMessage(message, urgent = false) {
    if (!this.discordClient || !this.discordClient.isReady()) {
      throw new Error('Discord client not ready');
    }

    const channelId = process.env.DISCORD_CHANNEL_ID;
    const userId = process.env.DISCORD_USER_ID;

    let target;
    if (channelId) {
      target = await this.discordClient.channels.fetch(channelId);
    } else if (userId) {
      const user = await this.discordClient.users.fetch(userId);
      target = await user.createDM();
    } else {
      throw new Error('No DISCORD_CHANNEL_ID or DISCORD_USER_ID configured');
    }

    const formattedMessage = urgent ? `🚨 **URGENT**: ${message}` : message;
    
    await target.send(formattedMessage);

    return {
      content: [
        {
          type: 'text',
          text: `Message sent to Discord: ${message}`
        }
      ]
    };
  }

  async requestDiscordInput(prompt, timeoutSeconds = 300) {
    // First send the prompt
    await this.sendDiscordMessage(prompt);

    // Wait for response
    const requestId = Date.now().toString();
    const timeoutMs = timeoutSeconds * 1000;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error(`Timeout waiting for Discord response after ${timeoutSeconds}s`));
      }, timeoutMs);

      this.pendingResponses.set(requestId, {
        timestamp: Date.now(),
        timeout: timeoutMs,
        resolve: (response) => {
          clearTimeout(timeout);
          resolve({
            content: [
              {
                type: 'text',
                text: `User responded: ${response}`
              }
            ]
          });
        }
      });
    });
  }

  async getRecentMessages(limit = 10) {
    const recentMessages = this.messageQueue.slice(-limit);
    
    const messageText = recentMessages.length > 0
      ? recentMessages.map(msg => 
          `[${new Date(msg.timestamp).toISOString()}] ${msg.author}: ${msg.content}`
        ).join('\n')
      : 'No recent messages';

    return {
      content: [
        {
          type: 'text',
          text: messageText
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Claude Code Discord MCP Server running');
  }
}

const server = new DiscordMCPServer();
server.run().catch(console.error);