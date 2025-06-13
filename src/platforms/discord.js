import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

export class DiscordPlatform {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger.child({ platform: 'discord' });
    this.client = null;
    this.isReady = false;
    this.pendingInputRequests = new Map();
  }

  async initialize() {
    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
      });

      this.client.on('ready', () => {
        this.isReady = true;
        this.logger.info(`Discord bot logged in as ${this.client.user.tag}`);
      });

      this.client.on('error', (error) => {
        this.logger.error('Discord client error:', error);
      });

      this.client.on('messageCreate', (message) => {
        this.handleIncomingMessage(message);
      });

      await this.client.login(this.config.token);
      
      await new Promise((resolve) => {
        if (this.isReady) {
          resolve();
        } else {
          this.client.once('ready', resolve);
        }
      });

      this.logger.info('Discord platform initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Discord platform:', error);
      throw error;
    }
  }

  async sendMessage(message, urgent = false) {
    if (!this.isReady || !this.client) {
      throw new Error('Discord client is not ready');
    }

    try {
      const channel = await this.client.channels.fetch(this.config.channelId);
      if (!channel) {
        throw new Error(`Channel ${this.config.channelId} not found`);
      }

      let content;
      if (urgent) {
        content = `🚨 **URGENT** 🚨\n${message}`;
      } else {
        content = message;
      }

      const sentMessage = await channel.send(content);
      this.logger.debug(`Message sent to Discord channel ${this.config.channelId}`);
      return sentMessage;
    } catch (error) {
      this.logger.error('Failed to send Discord message:', error);
      throw error;
    }
  }

  async sendStatusUpdate(status, details = null, progress = null) {
    if (!this.isReady || !this.client) {
      throw new Error('Discord client is not ready');
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Status Update')
        .addFields({ name: 'Status', value: status, inline: true })
        .setTimestamp();

      if (details) {
        embed.addFields({ name: 'Details', value: details, inline: false });
      }

      if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
        const progressBar = this.createProgressBar(progress);
        embed.addFields({ 
          name: 'Progress', 
          value: `${progressBar} ${progress}%`, 
          inline: false 
        });
      }

      const channel = await this.client.channels.fetch(this.config.channelId);
      const sentMessage = await channel.send({ embeds: [embed] });
      
      this.logger.debug(`Status update sent to Discord channel ${this.config.channelId}`);
      return sentMessage;
    } catch (error) {
      this.logger.error('Failed to send Discord status update:', error);
      throw error;
    }
  }

  async requestInput(prompt, timeout = 300) {
    if (!this.isReady || !this.client) {
      throw new Error('Discord client is not ready');
    }

    const requestId = Date.now().toString();
    
    try {
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('Input Required')
        .setDescription(prompt)
        .setFooter({ text: `Request ID: ${requestId} | Timeout: ${timeout}s` })
        .setTimestamp();

      const channel = await this.client.channels.fetch(this.config.channelId);
      await channel.send({ embeds: [embed] });

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingInputRequests.delete(requestId);
          resolve({ response: null, timedOut: true });
        }, timeout * 1000);

        this.pendingInputRequests.set(requestId, {
          resolve: (response) => {
            clearTimeout(timeoutId);
            this.pendingInputRequests.delete(requestId);
            resolve({ response, timedOut: false });
          },
          reject: (error) => {
            clearTimeout(timeoutId);
            this.pendingInputRequests.delete(requestId);
            reject(error);
          },
          timeoutId,
        });
      });
    } catch (error) {
      this.logger.error('Failed to request Discord input:', error);
      throw error;
    }
  }

  handleIncomingMessage(message) {
    if (message.author.bot) return;
    if (message.channelId !== this.config.channelId) return;

    this.logger.debug(`Received message from ${message.author.username}: ${message.content}`);

    if (this.pendingInputRequests.size > 0) {
      const [requestId, request] = this.pendingInputRequests.entries().next().value;
      request.resolve(message.content);
    }
  }

  createProgressBar(progress, length = 20) {
    const filled = Math.floor((progress / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  async cleanup() {
    if (this.client) {
      this.logger.info('Cleaning up Discord platform...');
      this.pendingInputRequests.clear();
      await this.client.destroy();
      this.isReady = false;
      this.client = null;
    }
  }

  isAvailable() {
    return this.isReady && this.client;
  }
}