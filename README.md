# Claude Discord Chat - VS Code Extension

A VS Code extension that integrates Claude AI chat with Discord notifications for remote monitoring of AI conversations.

## 🚀 Features

- **Claude AI Chat Interface**: Chat with Claude directly in VS Code
- **Discord Integration**: Mirror conversations to Discord for remote monitoring
- **Session Management**: Create and manage Claude conversation sessions
- **Usage Tracking**: Monitor token usage and cost projections
- **Command System**: Built-in commands for configuration and control

## 📸 Screenshot

![Claude Discord Chat Extension](public/screenshots/Screenshot%202025-06-20%20at%2015.21.25.png)

## 📦 Installation

### From VSIX file
1. Download the latest `.vsix` file from [GitHub Releases](https://github.com/MichaelAyles/claude-code-comm-bot/releases)
2. In VS Code: `Cmd+Shift+P` → "Install from VSIX" → Select the file

### From Source
```bash
git clone https://github.com/MichaelAyles/claude-code-comm-bot.git
cd claude-code-comm-bot
npm install
npm run compile
npm run package
```

## 🔧 Configuration

### Quick Setup
1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Run "Claude Discord Chat: Open Chat"
3. Type `/config` to set up Discord integration
4. Start chatting with Claude!

### Discord Bot Setup
1. **Create Discord Bot**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application → Bot section → Reset Token
   - Enable "Message Content Intent"

2. **Configure Extension**:
   - VS Code Settings (`Cmd+,`) → Search "discord bot"
   - Add bot token, channel ID, and user ID
   - Enable Discord integration

3. **Invite Bot to Server**:
   - OAuth2 → URL Generator → Select "bot" scope
   - Permissions: Send Messages, Read Message History, View Channel

## 💬 Available Commands

### Chat Commands
- `/help` - Show all available commands
- `/config` or `/setup` - Discord configuration wizard
- `/status` - Show connection status
- `/stop` - Stop current Claude request
- `/new` or `/newsession` - Start new Claude session
- `/session` - Show current session info
- `/limits` or `/cost` - Show usage limits and cost projections

### VS Code Commands
- `claude-discord-chat.openChat` - Open the chat panel
- `claude-discord-chat.sendMessage` - Send a message to Claude
- `claude-discord-chat.connectDiscord` - Connect Discord
- `claude-discord-chat.disconnectDiscord` - Disconnect Discord

### Keyboard Shortcuts
- `Cmd+Shift+C` (Mac) or `Ctrl+Shift+C` (Windows/Linux) - Open Claude Chat

## 🏗️ Development

### Prerequisites
- Node.js 18+
- VS Code 1.95.0+
- npm or yarn

### Building
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Package extension
npm run package
```

### Testing
```bash
# Run linter
npm run lint

# Type checking
npm run typecheck

# Open VS Code with extension loaded
Press F5 in VS Code
```

### Project Structure
```
claude-discord-chat/
├── src/
│   ├── extension.ts         # VS Code extension entry point
│   ├── claude/
│   │   └── ClaudeService.ts # Claude AI integration
│   ├── discord/
│   │   └── DiscordService.ts # Discord bot integration
│   └── webview/
│       └── ChatProvider.ts   # Chat UI provider
├── out/                     # Compiled JavaScript (gitignored)
├── package.json             # Extension manifest
└── tsconfig.json           # TypeScript configuration
```

## 🔒 Security

- Never commit Discord bot tokens
- Use VS Code settings for sensitive configuration
- All credentials are stored locally in VS Code settings
- Discord tokens are never exposed in the chat interface

## 🐛 Troubleshooting

### Common Issues

1. **Discord not connecting**: 
   - Check bot token and permissions
   - Ensure bot is invited to server
   - Verify channel ID is correct

2. **Claude not responding**: 
   - Verify API availability
   - Check VS Code output panel for errors

3. **Extension not loading**: 
   - Check VS Code version compatibility (requires 1.95.0+)
   - Reload VS Code window

### Debug Mode
Enable detailed logging:
1. VS Code Settings → "Claude Discord Chat: Debug Mode" → Enable
2. View logs in Output panel → "Claude Discord Chat"

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 🙏 Acknowledgments

- Built for Claude Code users
- Powered by Claude AI API
- Discord.js for bot functionality
- VS Code Extension API

---

For issues or questions, please open an issue on [GitHub](https://github.com/MichaelAyles/claude-code-comm-bot/issues).