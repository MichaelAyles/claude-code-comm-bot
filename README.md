# Claude Code Discord MCP Server

An MCP server that enables Claude Code to communicate with you through Discord, allowing you to receive updates and send commands to your coding sessions remotely.

## Features

- 📱 **Discord Integration**: Send messages and receive responses through Discord
- 🔄 **Real-time Communication**: Bidirectional communication with Claude Code
- ⚙️ **Configurable**: Easy setup with environment variables
- 🛡️ **Secure**: Token-based authentication
- 📝 **Message History**: Track recent Discord interactions

## Quick Start

### Prerequisites

- Node.js 18+ 
- A Discord bot token
- Discord channel ID or user ID for messaging

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/claude-code-discord-mcp.git
cd claude-code-discord-mcp
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Configure your Discord bot in `.env`:
```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Use either channel ID (for server channels) or user ID (for DMs)
DISCORD_CHANNEL_ID=your_discord_channel_id_here
# OR
DISCORD_USER_ID=your_discord_user_id_here

LOG_LEVEL=info
```

4. Start the MCP server:
```bash
npm start
```

### Development Scripts

- `npm start` - Start the MCP server
- `npm run dev` - Start in development mode with auto-restart
- `npm test` - Run tests

### Setting up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token to your `.env` file
4. Invite the bot to your server with "Send Messages" and "Read Message History" permissions
5. Get your channel ID by enabling Developer Mode in Discord and right-clicking your channel
6. Alternatively, get your user ID for direct messages

### Configuring Claude Code

Add this MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "claude-discord-bot": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/your/claude-code-discord-mcp",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Available MCP Tools

### `send_discord_message`
Send a message to Discord.

**Parameters:**
- `message` (string): The message to send
- `urgent` (boolean, optional): Mark message as urgent for special formatting

**Example:**
```javascript
await send_discord_message({
  message: "Build completed successfully! ✅",
  urgent: false
});
```

### `request_discord_input`
Send a message and wait for user response.

**Parameters:**
- `prompt` (string): The question/prompt to send
- `timeout` (number, optional): Timeout in seconds (default: 300)

### `get_recent_messages`
Get recent Discord messages from the user.

**Parameters:**
- `limit` (number, optional): Number of recent messages to retrieve (default: 10)

## Usage Examples

Here are some ways Claude Code can use this MCP server:

```javascript
// Send a simple update
await send_discord_message({
  message: "Starting build process..."
});

// Send urgent notification
await send_discord_message({
  message: "Build failed! Check logs for details.",
  urgent: true
});

// Request user input
const response = await request_discord_input({
  prompt: "Should I proceed with the deployment? (yes/no)",
  timeout: 600
});

// Get recent messages
const messages = await get_recent_messages({
  limit: 5
});
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot token | Yes |
| `DISCORD_CHANNEL_ID` | Discord channel ID for messages | No* |
| `DISCORD_USER_ID` | Discord user ID for direct messages | No* |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No |

*Either `DISCORD_CHANNEL_ID` or `DISCORD_USER_ID` must be configured.

### Usage Guidelines

See [CLAUDE.md](./CLAUDE.md) for comprehensive usage patterns and best practices.

## Troubleshooting

### Common Issues

1. **"Bot token invalid"**: Double-check your Discord bot token in the `.env` file
2. **"Channel/User not found"**: Ensure your bot has access to the specified channel or can DM the user
3. **"Permission denied"**: Make sure your bot has the necessary permissions (Send Messages, Read Message History)
4. **"Missing Access"**: If using a channel, make sure the bot is invited to the server and has access to that channel

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
