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
    this.pendingNotifications = []; // New messages waiting for Claude Code to process
    this.isListening = true; // Whether to forward all messages to Claude
    this.autoRespond = true; // Whether to auto-respond to messages
    this.autoProcessing = false; // Whether to automatically process new messages
    this.processingInterval = null; // Timer for auto-processing
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
      
      // Add to notification queue for Claude Code to process
      this.pendingNotifications.push({
        id: message.id,
        content: message.content,
        author: message.author.username,
        authorId: message.author.id,
        timestamp: Date.now(),
        channel: message.channel.id,
        needsResponse: true
      });
      console.error(`[NOTIFICATIONS] Added message to notification queue. Queue size: ${this.pendingNotifications.length}`);
      
      // If auto-respond is enabled, send a quick acknowledgment
      if (this.autoRespond) {
        console.error(`[AUTO-RESPOND] Attempting to send auto-response...`);
        this.sendDiscordMessage(``)
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
          },
          {
            name: 'check_new_messages',
            description: 'Check for new Discord messages that need processing',
            inputSchema: {
              type: 'object',
              properties: {
                markAsRead: {
                  type: 'boolean',
                  description: 'Whether to mark messages as read after retrieving',
                  default: true
                }
              }
            }
          },
          {
            name: 'respond_to_message',
            description: 'Send a response to a specific Discord message',
            inputSchema: {
              type: 'object',
              properties: {
                response: {
                  type: 'string',
                  description: 'The response message to send'
                },
                messageId: {
                  type: 'string',
                  description: 'ID of the message being responded to (optional)'
                }
              },
              required: ['response']
            }
          },
          {
            name: 'enable_auto_processing',
            description: 'Enable automatic processing of Discord messages (Claude Code will auto-respond)',
            inputSchema: {
              type: 'object',
              properties: {
                intervalSeconds: {
                  type: 'number',
                  description: 'How often to check for new messages (default: 5 seconds)',
                  default: 5
                },
                responseTemplate: {
                  type: 'string',
                  description: 'Template for auto-responses (optional)',
                  default: 'I received your message and will respond shortly!'
                }
              }
            }
          },
          {
            name: 'disable_auto_processing',
            description: 'Disable automatic processing of Discord messages',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'process_pending_messages',
            description: 'Check for new Discord messages and return them for intelligent processing by Claude Code',
            inputSchema: {
              type: 'object',
              properties: {
                autoRespond: {
                  type: 'boolean',
                  description: 'Whether to automatically send generated responses to Discord',
                  default: true
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
          
          case 'start_listening':
            return await this.startListening(args.autoRespond || false);
          
          case 'stop_listening':
            return await this.stopListening();
          
          case 'get_listening_status':
            return await this.getListeningStatus();
          
          case 'check_new_messages':
            return await this.checkNewMessages(args.markAsRead !== false);
          
          case 'respond_to_message':
            return await this.respondToMessage(args.response, args.messageId);
          
          case 'process_pending_messages':
            return await this.processPendingMessages(args.autoRespond !== false);
          
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
    console.error(`[SEND] Starting sendDiscordMessage - urgent: ${urgent}`);
    
    if (!this.discordClient || !this.discordClient.isReady()) {
      console.error(`[SEND] Discord client not ready - client: ${!!this.discordClient}, ready: ${this.discordClient?.isReady()}`);
      throw new Error('Discord client not ready');
    }

    const channelId = process.env.DISCORD_CHANNEL_ID;
    const userId = process.env.DISCORD_USER_ID;
    
    console.error(`[SEND] Config - channelId: ${channelId}, userId: ${userId}`);

    let target;
    if (channelId) {
      console.error(`[SEND] Fetching channel: ${channelId}`);
      target = await this.discordClient.channels.fetch(channelId);
      console.error(`[SEND] Channel fetched successfully: ${target?.name || target?.id}`);
    } else if (userId) {
      console.error(`[SEND] Fetching user: ${userId}`);
      const user = await this.discordClient.users.fetch(userId);
      target = await user.createDM();
      console.error(`[SEND] DM created successfully`);
    } else {
      console.error(`[SEND] No DISCORD_CHANNEL_ID or DISCORD_USER_ID configured`);
      throw new Error('No DISCORD_CHANNEL_ID or DISCORD_USER_ID configured');
    }

    const formattedMessage = urgent ? `🚨 **URGENT**: ${message}` : message;
    
    console.error(`[SEND] Sending message: "${formattedMessage}"`);
    await target.send(formattedMessage);
    console.error(`[SEND] Message sent successfully`);

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
          text: `Listening: ${this.isListening ? 'ON' : 'OFF'}, Auto-respond: ${this.autoRespond ? 'ON' : 'OFF'}, Pending notifications: ${this.pendingNotifications.length}`
        }
      ]
    };
  }

  async checkNewMessages(markAsRead = true) {
    const notifications = [...this.pendingNotifications];
    
    if (markAsRead) {
      this.pendingNotifications = [];
      console.error(`[NOTIFICATIONS] Cleared ${notifications.length} notifications`);
    }
    
    if (notifications.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No new Discord messages'
          }
        ]
      };
    }
    
    const messageText = `📨 ${notifications.length} new Discord message${notifications.length > 1 ? 's' : ''}:\n\n` +
      notifications.map(msg => 
        `**From ${msg.author}** (${new Date(msg.timestamp).toLocaleTimeString()}):\n"${msg.content}"\n`
      ).join('\n');
    
    return {
      content: [
        {
          type: 'text',
          text: messageText
        }
      ]
    };
  }

  async respondToMessage(response, messageId = null) {
    const result = await this.sendDiscordMessage(response);
    
    // If this was in response to a specific message, mark any related notifications as handled
    if (messageId) {
      this.pendingNotifications = this.pendingNotifications.filter(notif => notif.id !== messageId);
      console.error(`[NOTIFICATIONS] Removed notification for message ${messageId}`);
    }
    
    return result;
  }

  async processPendingMessages(autoRespond = true) {
    if (this.pendingNotifications.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No pending Discord messages to process.'
          }
        ]
      };
    }

    const notifications = [...this.pendingNotifications];
    this.pendingNotifications = []; // Clear the queue
    
    console.error(`[SMART-PROCESSING] Processing ${notifications.length} pending messages`);

    // Format messages for Claude Code to process
    const messageContext = notifications.map(msg => 
      `**Message from ${msg.author}** (${new Date(msg.timestamp).toLocaleString()}):\n"${msg.content}"`
    ).join('\n\n');

    const prompt = `📱 **New Discord Messages Received** 📱

${messageContext}

Please generate an intelligent, helpful response to ${notifications.length > 1 ? 'these messages' : 'this message'}. Consider:
- Who sent the message and the context
- What they might need help with
- Your current status/what you're working on
- An appropriate tone (friendly but professional)

${autoRespond ? 'Your response will be automatically sent to Discord.' : 'Please provide a response that can be sent to Discord.'}`;

    // Return the prompt for Claude Code to process
    return {
      content: [
        {
          type: 'text',
          text: prompt
        }
      ],
      // Include metadata for follow-up actions
      _metadata: {
        messageCount: notifications.length,
        autoRespond: autoRespond,
        messageIds: notifications.map(n => n.id),
        lastMessage: notifications[notifications.length - 1]
      }
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