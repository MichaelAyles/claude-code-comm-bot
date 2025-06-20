# Claude Discord Chat - VS Code Extension

A VS Code extension that provides a beautiful chat interface for Claude AI with Discord integration for remote monitoring and control.

## Project Inspiration

This project was inspired by the excellent [claude-code-chat](https://github.com/andrepimenta/claude-code-chat) VS Code extension by Andre Pimenta. However, due to the restrictive license of that project (which allows viewing for educational purposes only but prohibits modification, distribution, or creation of derivative works), we have implemented our own original solution from scratch.

Our implementation takes inspiration from the concepts and approaches demonstrated in the original project but contains no copied code. We studied how VS Code extensions can provide beautiful chat interfaces and integrated that knowledge into our Discord-based MCP server architecture. This allows us to provide similar functionality while maintaining full compatibility with the MIT license and enabling community contributions.

## Features

- 💬 **Beautiful Chat Interface**: Clean, VS Code-native chat UI
- 📱 **Discord Integration**: Mirror conversations to Discord for remote monitoring
- 🔄 **Real-time Communication**: Bidirectional Discord messaging
- ⚙️ **Easy Configuration**: Simple VS Code settings integration
- 🛡️ **Secure**: Discord bot token-based authentication
- 📊 **Status Indicators**: Visual connection status in VS Code status bar
- 🎯 **Remote Control**: Send messages to Discord directly from the chat
- ⚡ **Instant Setup**: Ready to use with minimal configuration

## Our Approach: Discord as a Universal Interface

Instead of being limited to VS Code, our solution provides Discord as a universal interface that works with Claude Code anywhere:

### Benefits of Our Approach
- **Platform Independent**: Works with Claude Code CLI, VS Code, or any other environment
- **Mobile Friendly**: Monitor and control Claude sessions from your phone via Discord
- **Team Collaboration**: Share Claude interactions with team members in Discord channels
- **Always Available**: No need to be at your computer to monitor progress
- **Rich Notifications**: Discord's notification system keeps you informed
- **Voice Integration**: Use Discord's voice features for hands-free interaction

### Architecture Overview
```
Claude Code ←→ MCP Server ←→ Discord Bot ←→ Discord App/Web/Mobile
```

This design allows for:
1. **Seamless Integration**: Claude Code treats it like any other MCP server
2. **Real-time Updates**: Instant notifications of progress, errors, or completion
3. **Remote Control**: Send commands and receive responses from anywhere
4. **Intelligent Processing**: Context-aware responses to Discord messages
5. **Approval Workflows**: Handle permission requests through Discord

## Quick Start

### Prerequisites

- VS Code 1.95.0 or higher
- Node.js 18+ (for development)
- A Discord bot token (optional, for Discord integration)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/tribune/claude-discord-chat.git
cd claude-discord-chat
npm install
npm run compile
```

2. Install the extension:
   ```bash
   npm run package
   ```
   - In Cursor/VS Code, press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
   - Run "Extensions: Install from VSIX..."
   - Select the generated `claude-discord-chat-0.1.0.vsix` file

3. Configure Discord (optional):
   - Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
   - Search for "Claude Discord Chat"
   - Set your Discord bot token and channel/user IDs

4. Start chatting:
   - Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
   - Or run "Claude Discord Chat: Open Claude Chat" from Command Palette

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

## Future Enhancements

Our Discord-based approach opens up many possibilities for enhanced features:

### Planned Features
- **Discord Slash Commands**: `/claude status`, `/claude deploy`, etc.
- **Rich Embeds**: Beautiful formatted messages with syntax highlighting
- **File Attachments**: Send code files directly through Discord
- **Voice Commands**: "Hey Claude, run the tests" 
- **Team Channels**: Dedicated channels for different projects
- **Bot Dashboard**: Web interface for advanced configuration
- **Integration Webhooks**: Connect with GitHub, CI/CD, etc.

### VS Code Extension Alternative
While we can't modify the existing extension, we could create our own original VS Code extension that:
- Connects to our Discord MCP server
- Provides a chat interface using VS Code's webview API
- Implements file referencing and syntax highlighting
- Offers conversation history and session management
- All with original code under MIT license

This would combine the best of both worlds: the beautiful VS Code interface experience with our powerful Discord remote capabilities.

## License

MIT License - see LICENSE file for details.
