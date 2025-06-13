import os from 'os';
import path from 'path';

export function loadConfig() {
  const config = {
    platforms: {},
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      dir: getLogDirectory(),
    },
    server: {
      port: parseInt(process.env.PORT) || 3000,
    },
  };

  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
    config.platforms.discord = {
      token: process.env.DISCORD_BOT_TOKEN,
      channelId: process.env.DISCORD_CHANNEL_ID,
    };
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    config.platforms.telegram = {
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    };
  }

  if (Object.keys(config.platforms).length === 0) {
    throw new Error(
      'No platforms configured. Please set up at least one platform (Discord or Telegram) in your .env file.'
    );
  }

  return config;
}

function getLogDirectory() {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'darwin': // macOS
      return path.join(homeDir, 'Library', 'Logs', 'claude-comm-bot');
    case 'linux':
      return path.join(homeDir, '.local', 'share', 'logs', 'claude-comm-bot');
    case 'win32': // Windows
      return path.join(homeDir, 'AppData', 'Local', 'claude-comm-bot', 'logs');
    default:
      return path.join(homeDir, '.claude-comm-bot', 'logs');
  }
}

export function validateConfig(config) {
  if (!config.platforms || Object.keys(config.platforms).length === 0) {
    throw new Error('At least one platform must be configured');
  }

  for (const [platform, platformConfig] of Object.entries(config.platforms)) {
    switch (platform) {
      case 'discord':
        if (!platformConfig.token || !platformConfig.channelId) {
          throw new Error('Discord platform requires both token and channelId');
        }
        break;
      case 'telegram':
        if (!platformConfig.token || !platformConfig.chatId) {
          throw new Error('Telegram platform requires both token and chatId');
        }
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  return true;
}