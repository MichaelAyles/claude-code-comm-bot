#!/usr/bin/env node

import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

class DiscordTester {
  constructor() {
    this.client = null;
    this.rl = null;
    this.messageQueue = [];
    this.isListening = false;
  }

  async initialize() {
    console.log('🤖 Discord MCP Server Test Mode');
    console.log('================================\n');

    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('❌ DISCORD_BOT_TOKEN not found in .env file');
      process.exit(1);
    }

    if (!process.env.DISCORD_CHANNEL_ID && !process.env.DISCORD_USER_ID) {
      console.error('❌ Either DISCORD_CHANNEL_ID or DISCORD_USER_ID must be set in .env file');
      process.exit(1);
    }

    console.log('✅ Environment variables found');
    console.log('📱 Connecting to Discord...\n');

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ]
    });

    this.client.once(Events.ClientReady, (readyClient) => {
      console.log(`🟢 Bot connected as ${readyClient.user.tag}`);
      
      // Create readline interface after Discord is connected
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      // Small delay to ensure everything is ready
      setTimeout(() => {
        this.showMainMenu();
      }, 200);
    });

    this.client.on(Events.MessageCreate, (message) => {
      if (message.author.bot) return;
      
      // Debug logging
      console.log(`\n🔍 Message received:`);
      console.log(`   Author: ${message.author.username} (ID: ${message.author.id})`);
      console.log(`   Channel: ${message.channel.id}`);
      console.log(`   Content: "${message.content}"`);
      
      // Check if message is from configured user/channel
      const allowedUserId = process.env.DISCORD_USER_ID;
      const allowedChannelId = process.env.DISCORD_CHANNEL_ID;
      
      console.log(`   Expected User ID: ${allowedUserId || 'none'}`);
      console.log(`   Expected Channel ID: ${allowedChannelId || 'none'}`);
      
      // If both are configured, either one can match
      let isAllowed = false;
      if (allowedUserId && message.author.id === allowedUserId) {
        isAllowed = true;
        console.log(`   ✅ Matches allowed user ID`);
      }
      if (allowedChannelId && message.channel.id === allowedChannelId) {
        isAllowed = true;
        console.log(`   ✅ Matches allowed channel ID`);
      }
      
      // If neither is configured, accept all messages (for testing)
      if (!allowedUserId && !allowedChannelId) {
        isAllowed = true;
        console.log(`   ✅ No restrictions configured, accepting message`);
      }
      
      if (!isAllowed) {
        console.log(`   ❌ Message filtered out`);
        return;
      }

      this.handleDiscordMessage(message);
    });

    this.client.on('error', (error) => {
      console.error('❌ Discord client error:', error);
    });

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('❌ Failed to login to Discord:', error.message);
      if (error.message.includes('TOKEN_INVALID')) {
        console.log('\n💡 Check your DISCORD_BOT_TOKEN in the .env file');
      }
      process.exit(1);
    }
  }

  handleDiscordMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n📨 [${timestamp}] Message from ${message.author.username}:`);
    console.log(`   "${message.content}"`);
    
    this.messageQueue.push({
      id: message.id,
      content: message.content,
      author: message.author.username,
      timestamp: Date.now(),
      channel: message.channel.id
    });

    // Keep only recent messages
    if (this.messageQueue.length > 20) {
      this.messageQueue = this.messageQueue.slice(-20);
    }

    if (this.isListening) {
      console.log('\n📥 Message received while listening mode is active');
      this.showPrompt();
    }
  }

  showMainMenu() {
    console.log('\n🎯 Test Menu:');
    console.log('1. Send a test message');
    console.log('2. Start listening mode (receive messages)');
    console.log('3. Test request/response flow');
    console.log('4. View recent messages');
    console.log('5. Test urgent message');
    console.log('6. Connection info');
    console.log('7. Debug message filtering');
    console.log('8. Exit\n');
    
    this.showPrompt();
  }

  showPrompt() {
    if (!this.rl || this.rl.closed) {
      console.log('❌ Interface not ready, exiting...');
      this.exit();
      return;
    }
    
    this.rl.question('Choose an option (1-8): ', (answer) => {
      if (!this.rl || this.rl.closed) return;
      this.handleMenuChoice(answer.trim());
    });
  }

  async handleMenuChoice(choice) {
    try {
      switch (choice) {
        case '1':
          await this.testSendMessage();
          break;
        case '2':
          await this.startListeningMode();
          break;
        case '3':
          await this.testRequestResponse();
          break;
        case '4':
          this.viewRecentMessages();
          break;
        case '5':
          await this.testUrgentMessage();
          break;
        case '6':
          this.showConnectionInfo();
          break;
        case '7':
          this.debugMessageFiltering();
          break;
        case '8':
          this.exit();
          return;
        default:
          console.log('❌ Invalid option. Please choose 1-8.');
          this.showPrompt();
          return;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      this.showMainMenu();
    }
  }

  async testSendMessage() {
    console.log('\n📤 Testing send message...');
    
    if (!this.rl || this.rl.closed) {
      console.log('❌ Interface not ready');
      this.showMainMenu();
      return;
    }
    
    this.rl.question('Enter message to send: ', async (message) => {
      if (!this.rl || this.rl.closed) return;
      
      if (!message.trim()) {
        console.log('❌ Message cannot be empty');
        this.showMainMenu();
        return;
      }

      try {
        await this.sendDiscordMessage(message);
        console.log('✅ Message sent successfully!');
      } catch (error) {
        console.error('❌ Failed to send message:', error.message);
      }
      
      this.showMainMenu();
    });
  }

  async testUrgentMessage() {
    console.log('\n🚨 Testing urgent message...');
    
    const urgentMessage = 'This is an urgent test message!';
    try {
      await this.sendDiscordMessage(urgentMessage, true);
      console.log('✅ Urgent message sent successfully!');
    } catch (error) {
      console.error('❌ Failed to send urgent message:', error.message);
    }
    
    this.showMainMenu();
  }

  async startListeningMode() {
    console.log('\n👂 Listening mode started...');
    console.log('   Send messages from Discord to see them here');
    console.log('   Type "stop" to exit listening mode\n');
    
    this.isListening = true;
    
    const listenPrompt = () => {
      this.rl.question('> ', (input) => {
        if (input.trim().toLowerCase() === 'stop') {
          this.isListening = false;
          console.log('✅ Stopped listening mode');
          this.showMainMenu();
        } else {
          listenPrompt();
        }
      });
    };
    
    listenPrompt();
  }

  async testRequestResponse() {
    console.log('\n🔄 Testing request/response flow...');
    console.log('   This will send a prompt and wait for your Discord response');
    
    if (!this.rl || this.rl.closed) {
      console.log('❌ Interface not ready');
      this.showMainMenu();
      return;
    }
    
    this.rl.question('Enter prompt to send: ', async (prompt) => {
      if (!this.rl || this.rl.closed) return;
      
      if (!prompt.trim()) {
        console.log('❌ Prompt cannot be empty');
        this.showMainMenu();
        return;
      }

      try {
        console.log('📤 Sending prompt to Discord...');
        await this.sendDiscordMessage(`🤔 ${prompt}`);
        
        console.log('⏳ Waiting for your response in Discord (30 seconds timeout)...');
        
        const response = await this.waitForResponse(30000);
        console.log(`✅ Received response: "${response}"`);
      } catch (error) {
        console.error('❌ Request/response test failed:', error.message);
      }
      
      this.showMainMenu();
    });
  }

  viewRecentMessages() {
    console.log('\n📋 Recent Discord messages:');
    
    if (this.messageQueue.length === 0) {
      console.log('   No messages received yet');
    } else {
      this.messageQueue.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`   ${index + 1}. [${time}] ${msg.author}: "${msg.content}"`);
      });
    }
    
    this.showMainMenu();
  }

  showConnectionInfo() {
    console.log('\n🔗 Connection Information:');
    console.log(`   Bot: ${this.client.user.tag}`);
    console.log(`   Bot ID: ${this.client.user.id}`);
    
    if (process.env.DISCORD_CHANNEL_ID) {
      console.log(`   Target: Channel ID ${process.env.DISCORD_CHANNEL_ID}`);
    }
    
    if (process.env.DISCORD_USER_ID) {
      console.log(`   Target: User ID ${process.env.DISCORD_USER_ID}`);
    }
    
    console.log(`   Status: ${this.client.isReady() ? '🟢 Connected' : '🔴 Disconnected'}`);
    
    this.showMainMenu();
  }

  debugMessageFiltering() {
    console.log('\n🔍 Message Filtering Debug:');
    console.log(`   DISCORD_USER_ID: ${process.env.DISCORD_USER_ID || 'not set'}`);
    console.log(`   DISCORD_CHANNEL_ID: ${process.env.DISCORD_CHANNEL_ID || 'not set'}`);
    
    if (!process.env.DISCORD_USER_ID && !process.env.DISCORD_CHANNEL_ID) {
      console.log('\n📝 No filtering configured - all messages will be accepted');
    } else {
      console.log('\n📝 Messages will be accepted from:');
      if (process.env.DISCORD_USER_ID) {
        console.log(`   - User with ID: ${process.env.DISCORD_USER_ID}`);
      }
      if (process.env.DISCORD_CHANNEL_ID) {
        console.log(`   - Channel with ID: ${process.env.DISCORD_CHANNEL_ID}`);
      }
    }
    
    console.log('\n💡 Tip: Send a message now to see detailed filtering info');
    
    this.showMainMenu();
  }

  async sendDiscordMessage(message, urgent = false) {
    if (!this.client || !this.client.isReady()) {
      throw new Error('Discord client not ready');
    }

    const channelId = process.env.DISCORD_CHANNEL_ID;
    const userId = process.env.DISCORD_USER_ID;

    let target;
    if (channelId) {
      target = await this.client.channels.fetch(channelId);
      if (!target) {
        throw new Error(`Channel with ID ${channelId} not found or bot has no access`);
      }
    } else if (userId) {
      const user = await this.client.users.fetch(userId);
      target = await user.createDM();
    } else {
      throw new Error('No DISCORD_CHANNEL_ID or DISCORD_USER_ID configured');
    }

    const formattedMessage = urgent ? `🚨 **URGENT**: ${message}` : message;
    await target.send(formattedMessage);
  }

  async waitForResponse(timeoutMs) {
    const startTime = Date.now();
    const initialMessageCount = this.messageQueue.length;

    return new Promise((resolve, reject) => {
      const checkForNewMessage = () => {
        if (this.messageQueue.length > initialMessageCount) {
          // New message received
          const latestMessage = this.messageQueue[this.messageQueue.length - 1];
          resolve(latestMessage.content);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for response after ${timeoutMs / 1000}s`));
          return;
        }

        setTimeout(checkForNewMessage, 500);
      };

      checkForNewMessage();
    });
  }

  exit() {
    console.log('\n👋 Disconnecting from Discord...');
    
    if (this.client) {
      this.client.destroy();
    }
    
    if (this.rl && !this.rl.closed) {
      this.rl.close();
    }
    
    console.log('✅ Test mode ended');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

// Start the tester
const tester = new DiscordTester();
tester.initialize().catch((error) => {
  console.error('❌ Failed to initialize Discord tester:', error);
  process.exit(1);
});