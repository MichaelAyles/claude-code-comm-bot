#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

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
    this.isListening = true; // Whether to forward all messages to Claude
    this.autoRespond = true; // Whether to auto-respond to messages
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
      
      // Debug logging
      console.error(`Message received from ${message.author.username} (ID: ${message.author.id}) in channel ${message.channel.id}`);
      
      // Check if message is from configured user/channel
      const allowedUserId = process.env.DISCORD_USER_ID;
      const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
      
      console.error(`Checking filters - allowedUserId: ${allowedUserId}, allowedChannelId: ${allowedChannelId}`);
      
      // If user ID is configured, check both numeric ID and username
      if (allowedUserId && 
          message.author.id !== allowedUserId && 
          message.author.username !== allowedUserId &&
          message.author.tag !== allowedUserId) {
        console.error(`Message rejected - user filter mismatch`);
        return;
      }
      
      // If channel ID is configured, check it
      if (allowedChannelId && message.channel.id !== allowedChannelId) {
        console.error(`Message rejected - channel filter mismatch`);
        return;
      }
      
      console.error(`Message accepted, processing...`);
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
    let handledByPendingRequest = false;
    for (const [requestId, request] of this.pendingResponses.entries()) {
      if (Date.now() - request.timestamp < request.timeout) {
        // This could be a response to our request
        request.resolve(message.content);
        this.pendingResponses.delete(requestId);
        handledByPendingRequest = true;
        break;
      }
    }

    // If we're actively listening and this wasn't handled by a pending request
    if (this.isListening && !handledByPendingRequest) {
      console.error(`[LISTENING] New message: "${message.content}" from ${message.author.username}`);
      
      // If auto-respond is enabled, send a quick acknowledgment
      if (this.autoRespond) {
        console.error(`[AUTO-RESPOND] Attempting to send auto-response...`);
        this.sendDiscordMessage(`👋 I received your message: "${message.content}"\n\nI'm currently working with Claude Code. If you need an immediate response, I'll pass this along!`)
          .then(() => {
            console.error(`[AUTO-RESPOND] Auto-response sent successfully`);
          })
          .catch((error) => {
            console.error(`[AUTO-RESPOND] Failed to send auto-response:`, error);
          });
      } else {
        console.error(`[AUTO-RESPOND] Auto-respond is disabled`);
      }
    } else {
      console.error(`[LISTENING] Not processing message - isListening: ${this.isListening}, handledByPendingRequest: ${handledByPendingRequest}`);
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
          },
          {
            name: 'start_listening',
            description: 'Start listening to all Discord messages (Claude will be notified of new messages)',
            inputSchema: {
              type: 'object',
              properties: {
                autoRespond: {
                  type: 'boolean',
                  description: 'Whether to automatically acknowledge messages',
                  default: false
                }
              }
            }
          },
          {
            name: 'stop_listening',
            description: 'Stop listening to Discord messages',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_listening_status',
            description: 'Check if currently listening to Discord messages',
            inputSchema: {
              type: 'object',
              properties: {}
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
          
          case 'start_listening':
            return await this.startListening(args.autoRespond || false);
          
          case 'stop_listening':
            return await this.stopListening();
          
          case 'get_listening_status':
            return await this.getListeningStatus();
          
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

  async startListening(autoRespond = false) {
    this.isListening = true;
    this.autoRespond = autoRespond;
    
    console.error(`Started listening to Discord messages (autoRespond: ${autoRespond})`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Started listening to Discord messages. Auto-respond: ${autoRespond ? 'enabled' : 'disabled'}`
        }
      ]
    };
  }

  async stopListening() {
    this.isListening = false;
    this.autoRespond = false;
    
    console.error('Stopped listening to Discord messages');
    
    return {
      content: [
        {
          type: 'text',
          text: 'Stopped listening to Discord messages'
        }
      ]
    };
  }

  async getListeningStatus() {
    return {
      content: [
        {
          type: 'text',
          text: `Listening: ${this.isListening ? 'ON' : 'OFF'}, Auto-respond: ${this.autoRespond ? 'ON' : 'OFF'}`
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