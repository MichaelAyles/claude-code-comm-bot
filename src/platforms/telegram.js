import TelegramBot from 'node-telegram-bot-api';

export class TelegramPlatform {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger.child({ platform: 'telegram' });
    this.bot = null;
    this.isReady = false;
    this.pendingInputRequests = new Map();
  }

  async initialize() {
    try {
      this.bot = new TelegramBot(this.config.token, { polling: true });

      this.bot.on('polling_error', (error) => {
        this.logger.error('Telegram polling error:', error);
      });

      this.bot.on('error', (error) => {
        this.logger.error('Telegram bot error:', error);
      });

      this.bot.on('message', (message) => {
        this.handleIncomingMessage(message);
      });

      const botInfo = await this.bot.getMe();
      this.isReady = true;
      this.logger.info(`Telegram bot initialized: ${botInfo.username}`);
    } catch (error) {
      this.logger.error('Failed to initialize Telegram platform:', error);
      throw error;
    }
  }

  async sendMessage(message, urgent = false) {
    if (!this.isReady || !this.bot) {
      throw new Error('Telegram bot is not ready');
    }

    try {
      let content;
      if (urgent) {
        content = `🚨 *URGENT* 🚨\n\n${message}`;
      } else {
        content = message;
      }

      const sentMessage = await this.bot.sendMessage(
        this.config.chatId, 
        content,
        { parse_mode: 'Markdown' }
      );
      
      this.logger.debug(`Message sent to Telegram chat ${this.config.chatId}`);
      return sentMessage;
    } catch (error) {
      this.logger.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  async sendStatusUpdate(status, details = null, progress = null) {
    if (!this.isReady || !this.bot) {
      throw new Error('Telegram bot is not ready');
    }

    try {
      let message = `📊 *Status Update*\n\n`;
      message += `*Status:* ${status}\n`;

      if (details) {
        message += `*Details:* ${details}\n`;
      }

      if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
        const progressBar = this.createProgressBar(progress);
        message += `*Progress:* ${progressBar} ${progress}%\n`;
      }

      message += `\n_Updated: ${new Date().toLocaleString()}_`;

      const sentMessage = await this.bot.sendMessage(
        this.config.chatId,
        message,
        { parse_mode: 'Markdown' }
      );

      this.logger.debug(`Status update sent to Telegram chat ${this.config.chatId}`);
      return sentMessage;
    } catch (error) {
      this.logger.error('Failed to send Telegram status update:', error);
      throw error;
    }
  }

  async requestInput(prompt, timeout = 300) {
    if (!this.isReady || !this.bot) {
      throw new Error('Telegram bot is not ready');
    }

    const requestId = Date.now().toString();

    try {
      let message = `❓ *Input Required*\n\n`;
      message += `${prompt}\n\n`;
      message += `_Request ID: ${requestId}_\n`;
      message += `_Timeout: ${timeout} seconds_`;

      await this.bot.sendMessage(
        this.config.chatId,
        message,
        { parse_mode: 'Markdown' }
      );

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
      this.logger.error('Failed to request Telegram input:', error);
      throw error;
    }
  }

  handleIncomingMessage(message) {
    if (!message.text) return;
    if (message.chat.id.toString() !== this.config.chatId.toString()) return;

    this.logger.debug(`Received message from ${message.from.username || message.from.first_name}: ${message.text}`);

    if (this.pendingInputRequests.size > 0) {
      const [requestId, request] = this.pendingInputRequests.entries().next().value;
      request.resolve(message.text);
    }
  }

  createProgressBar(progress, length = 20) {
    const filled = Math.floor((progress / 100) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  async cleanup() {
    if (this.bot) {
      this.logger.info('Cleaning up Telegram platform...');
      this.pendingInputRequests.clear();
      await this.bot.stopPolling();
      this.isReady = false;
      this.bot = null;
    }
  }

  isAvailable() {
    return this.isReady && this.bot;
  }
}