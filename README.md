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
- `npm run test-discord` - Terminal test mode to verify Discord integration

### Setting up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token to your `.env` file
4. Invite the bot to your server with "Send Messages" and "Read Message History" permissions
5. Get your channel ID by enabling Developer Mode in Discord and right-clicking your channel
6. Alternatively, get your user ID for direct messages

### Testing Your Setup

Before integrating with Claude Code, test your Discord bot setup:

```bash
npm run test-discord
```

**Interactive Test Menu Options:**
1. **Send a test message** - Send custom message to Discord
2. **Start listening mode** - See Discord messages in terminal real-time
3. **Test request/response flow** - Send prompt and wait for Discord reply
4. **View recent messages** - See message history
5. **Test urgent message** - Send formatted urgent message with 🚨
6. **Connection info** - Check bot status and configuration
7. **Debug message filtering** - See why messages might be filtered out
8. **Exit** - Clean shutdown

**Debugging Tips:**
- Use option 6 to verify your bot is connected
- Use option 7 to check your DISCORD_USER_ID/DISCORD_CHANNEL_ID configuration
- When you send a Discord message, you'll see detailed debug output showing:
  - Who sent the message and from which channel
  - Your configured filters
  - Whether the message was accepted or rejected

**Common Issues:**
- **Messages not appearing?** Check option 7 - your user/channel ID might be wrong
- **Bot offline?** Check option 6 - verify your bot token is correct
- **No debug output?** Make sure you're sending from the right Discord account/channel

### Configuring Claude Code

Use the built-in `claude mcp add` command to configure this MCP server:

```bash
claude mcp add claude-discord-bot \
  --command node \
  --args "src/index.js" \
  --cwd "/Users/tribune/Desktop/Projects/claude-code-comm-bot" \
  --env NODE_ENV=production
```

After adding, restart Claude Code to activate the integration.

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

### Discord Bot Issues

1. **"Bot token invalid"**: Double-check your Discord bot token in the `.env` file
2. **"Channel/User not found"**: Ensure your bot has access to the specified channel or can DM the user
3. **"Permission denied"**: Make sure your bot has the necessary permissions (Send Messages, Read Message History)
4. **"Missing Access"**: If using a channel, make sure the bot is invited to the server and has access to that channel

### Claude Code Integration Issues

1. **"MCP server not found"**: 
   - Double-check the `cwd` path in your MCP configuration
   - Make sure the path exists and contains `src/index.js`
   - Verify you saved the config file properly

2. **"Command not found: node"**:
   - Install Node.js from https://nodejs.org
   - Make sure Node.js is in your PATH
   - Try using the full path: `/usr/local/bin/node` or `/opt/homebrew/bin/node`

3. **"Cannot find module"**:
   - Make sure you ran `npm install` in your project directory
   - Check that `node_modules` folder exists in your project

4. **Tools don't appear in Claude Code**:
   - Restart Claude Code completely (`Cmd+Q`, wait, restart)
   - Check Claude Code logs for MCP server errors
   - Make sure your config file has valid JSON syntax
   - Verify the MCP server name is unique

5. **"Permission denied"**:
   - Make sure the `src/index.js` file is readable:
     ```bash
     chmod +r /path/to/your/project/src/index.js
     ```

6. **Multiple MCP servers conflict**:
   - Make sure each server has a unique name in your config:
     ```json
     {
       "mcpServers": {
         "server-one": { ... },
         "claude-discord-bot": { ... },
         "another-server": { ... }
       }
     }
     ```

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
