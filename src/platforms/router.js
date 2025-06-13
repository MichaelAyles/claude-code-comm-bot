import { DiscordPlatform } from './discord.js';
import { TelegramPlatform } from './telegram.js';

export class MessageRouter {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger.child({ component: 'MessageRouter' });
    this.platforms = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing message router...');

      if (this.config.platforms.discord) {
        this.logger.info('Setting up Discord platform...');
        const discordPlatform = new DiscordPlatform(
          this.config.platforms.discord,
          this.logger
        );
        await discordPlatform.initialize();
        this.platforms.set('discord', discordPlatform);
        this.logger.info('Discord platform initialized');
      }

      if (this.config.platforms.telegram) {
        this.logger.info('Setting up Telegram platform...');
        const telegramPlatform = new TelegramPlatform(
          this.config.platforms.telegram,
          this.logger
        );
        await telegramPlatform.initialize();
        this.platforms.set('telegram', telegramPlatform);
        this.logger.info('Telegram platform initialized');
      }

      if (this.platforms.size === 0) {
        throw new Error('No platforms were successfully initialized');
      }

      this.isInitialized = true;
      this.logger.info(`Message router initialized with ${this.platforms.size} platform(s): ${Array.from(this.platforms.keys()).join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to initialize message router:', error);
      throw error;
    }
  }

  async sendMessage(message, targetPlatform = null, urgent = false) {
    if (!this.isInitialized) {
      throw new Error('Message router is not initialized');
    }

    const results = [];
    const errors = [];
    const platformsToUse = targetPlatform 
      ? [targetPlatform] 
      : Array.from(this.platforms.keys());

    this.logger.debug(`Sending message to platforms: ${platformsToUse.join(', ')}`);

    for (const platformName of platformsToUse) {
      const platform = this.platforms.get(platformName);
      
      if (!platform) {
        const error = `Platform '${platformName}' is not configured`;
        this.logger.warn(error);
        errors.push({ platform: platformName, error });
        continue;
      }

      if (!platform.isAvailable()) {
        const error = `Platform '${platformName}' is not available`;
        this.logger.warn(error);
        errors.push({ platform: platformName, error });
        continue;
      }

      try {
        const result = await platform.sendMessage(message, urgent);
        results.push({ platform: platformName, success: true, result });
        this.logger.debug(`Message sent successfully to ${platformName}`);
      } catch (error) {
        this.logger.error(`Failed to send message to ${platformName}:`, error);
        errors.push({ platform: platformName, error: error.message });
      }
    }

    if (results.length === 0) {
      throw new Error(`Failed to send message to any platform. Errors: ${JSON.stringify(errors)}`);
    }

    return {
      platforms: results.map(r => r.platform),
      results,
      errors,
    };
  }

  async sendStatusUpdate(status, details = null, progress = null, targetPlatform = null) {
    if (!this.isInitialized) {
      throw new Error('Message router is not initialized');
    }

    const results = [];
    const errors = [];
    const platformsToUse = targetPlatform 
      ? [targetPlatform] 
      : Array.from(this.platforms.keys());

    this.logger.debug(`Sending status update to platforms: ${platformsToUse.join(', ')}`);

    for (const platformName of platformsToUse) {
      const platform = this.platforms.get(platformName);
      
      if (!platform) {
        const error = `Platform '${platformName}' is not configured`;
        this.logger.warn(error);
        errors.push({ platform: platformName, error });
        continue;
      }

      if (!platform.isAvailable()) {
        const error = `Platform '${platformName}' is not available`;
        this.logger.warn(error);
        errors.push({ platform: platformName, error });
        continue;
      }

      try {
        const result = await platform.sendStatusUpdate(status, details, progress);
        results.push({ platform: platformName, success: true, result });
        this.logger.debug(`Status update sent successfully to ${platformName}`);
      } catch (error) {
        this.logger.error(`Failed to send status update to ${platformName}:`, error);
        errors.push({ platform: platformName, error: error.message });
      }
    }

    if (results.length === 0) {
      throw new Error(`Failed to send status update to any platform. Errors: ${JSON.stringify(errors)}`);
    }

    return {
      platforms: results.map(r => r.platform),
      results,
      errors,
    };
  }

  async requestInput(prompt, timeout = 300, targetPlatform = null) {
    if (!this.isInitialized) {
      throw new Error('Message router is not initialized');
    }

    const platformName = targetPlatform || this.getPreferredPlatformForInput();
    const platform = this.platforms.get(platformName);

    if (!platform) {
      throw new Error(`Platform '${platformName}' is not configured`);
    }

    if (!platform.isAvailable()) {
      throw new Error(`Platform '${platformName}' is not available`);
    }

    this.logger.debug(`Requesting input from ${platformName}`);

    try {
      const result = await platform.requestInput(prompt, timeout);
      this.logger.debug(`Input request completed on ${platformName}`, { 
        timedOut: result.timedOut,
        hasResponse: !!result.response 
      });
      return result;
    } catch (error) {
      this.logger.error(`Failed to request input from ${platformName}:`, error);
      throw error;
    }
  }

  getPreferredPlatformForInput() {
    if (this.platforms.has('telegram')) {
      return 'telegram';
    }
    if (this.platforms.has('discord')) {
      return 'discord';
    }
    return Array.from(this.platforms.keys())[0];
  }

  async cleanup() {
    this.logger.info('Cleaning up message router...');
    
    const cleanupPromises = Array.from(this.platforms.values()).map(platform => 
      platform.cleanup().catch(error => 
        this.logger.error(`Error cleaning up platform:`, error)
      )
    );

    await Promise.allSettled(cleanupPromises);
    
    this.platforms.clear();
    this.isInitialized = false;
    this.logger.info('Message router cleanup completed');
  }

  getStatus() {
    const platformStatuses = {};
    
    for (const [name, platform] of this.platforms) {
      platformStatuses[name] = {
        available: platform.isAvailable(),
        ready: platform.isReady,
      };
    }

    return {
      initialized: this.isInitialized,
      platformCount: this.platforms.size,
      platforms: platformStatuses,
    };
  }
}