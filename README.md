# Claude Code Communication Bot MCP Server

An MCP server that enables Claude Code to send you updates and receive commands through Discord or Telegram, allowing you to stay connected with your coding sessions while away from your computer.

## Features

- 📱 **Multi-Platform Support**: Discord and Telegram integration
- 🖥️ **Cross-Platform**: Works on macOS and Linux
- 🔄 **Real-time Communication**: Send updates and receive commands instantly
- ⚙️ **Configurable**: Easy setup with environment variables
- 🛡️ **Secure**: Token-based authentication for bot platforms
- 📝 **Logging**: Comprehensive logging for debugging and monitoring

## Quick Start

### Prerequisites

- Node.js 18+ 
- A Discord bot token (optional, if using Discord)
- A Telegram bot token (optional, if using Telegram)

### Installation

1. Clone or create this project:
```bash
mkdir claude-code-comm-bot
cd claude-code-comm-bot
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Configure your bot tokens in `.env`:
```env
# Discord Configuration (optional)
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here

# Telegram Configuration (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# General Configuration
LOG_LEVEL=info
PORT=3000
```

4. Start the MCP server:
```bash
npm start
```

### Setting up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token to your `.env` file
4. Invite the bot to your server with appropriate permissions
5. Get your channel ID by enabling Developer Mode in Discord and right-clicking your channel

### Setting up Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to your `.env` file
4. Get your chat ID by messaging your bot and visiting `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

### Configuring Claude Code

Add this MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "claude-comm-bot": {
      "command": "node",
      "args": ["/path/to/claude-code-comm-bot/src/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Available MCP Tools

### `sendMessage`
Send a message to configured chat platforms.

**Parameters:**
- `message` (string): The message to send
- `platform` (string, optional): Specific platform ("discord" or "telegram"). Defaults to all configured platforms.
- `urgent` (boolean, optional): Mark message as urgent for special formatting

**Example:**
```javascript
await sendMessage({
  message: "Build completed successfully! ✅",
  platform: "discord",
  urgent: false
});
```

### `sendStatusUpdate`
Send a formatted status update.

**Parameters:**
- `status` (string): Current status
- `details` (string, optional): Additional details
- `progress` (number, optional): Progress percentage (0-100)

### `requestInput` 
Request input from the user and wait for response.

**Parameters:**
- `prompt` (string): The question/prompt to send
- `timeout` (number, optional): Timeout in seconds (default: 300)

## Usage Examples

Here are some ways Claude Code can use this MCP server:

```javascript
// Send a simple update
await sendMessage({
  message: "Starting build process..."
});

// Send urgent notification
await sendMessage({
  message: "Build failed! Check logs for details.",
  urgent: true
});

// Send status with progress
await sendStatusUpdate({
  status: "Running tests",
  details: "Test suite: integration tests",
  progress: 75
});

// Request user input
const response = await requestInput({
  prompt: "Should I proceed with the deployment? (yes/no)",
  timeout: 600
});
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot token | No* |
| `DISCORD_CHANNEL_ID` | Discord channel ID for messages | No* |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No* |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for messages | No* |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No |
| `PORT` | MCP server port | No |

*At least one platform (Discord or Telegram) must be configured.

### Platform-Specific Setup

See [SETUP.md](./SETUP.md) for detailed platform-specific setup instructions.

## Troubleshooting

### Common Issues

1. **"Bot token invalid"**: Double-check your bot tokens in the `.env` file
2. **"Channel/Chat not found"**: Ensure your bot has access to the specified channel/chat
3. **"Permission denied"**: Make sure your bot has the necessary permissions (Send Messages, Read Message History)

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Logs

Logs are written to:
- macOS: `~/Library/Logs/claude-comm-bot/`
- Linux: `~/.local/share/logs/claude-comm-bot/`

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
