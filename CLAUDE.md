# Claude Discord Chat - VS Code Extension Guidelines

This document provides guidelines for developing and using the Claude Discord Chat VS Code extension.

## 📌 Current Version: 0.1.4

### What's New in v0.1.4
- **Improved project structure**: Cleaned up repository and removed unused files
- **GitHub Actions**: Added automated release workflow for publishing to GitHub releases
- **Release tooling**: Added release scripts for easier version management
- **Updated documentation**: Completely rewrote CLAUDE.md to reflect actual VS Code extension functionality
- **Build improvements**: Added .gitignore entries for build artifacts (out/, *.vsix)

### Previous Updates (v0.1.3)
- **Version display**: Welcome message now shows current version number
- **Simplified /config command**: Step-by-step Discord setup wizard
- **Improved messaging**: Cleaner Discord message formatting
- **Build documentation**: Added clear instructions for building and packaging

## 🔧 Development Requirements

**IMPORTANT**: When building and packaging the VS Code extension:

1. **Auto-increment version**: Always increment the version number in `package.json` for each build
2. **Update CLAUDE.md**: Update this document with the current version and any changes
3. **Version display**: The welcome message must display the current version number so users know they're running the latest build
4. **Build process**: Use `npm run compile && npm run package` to build the VSIX file
5. **GitHub Releases**: Upload VSIX files to GitHub releases, not the repository

## 🚀 Quick Start

### Installation

1. **From VSIX file**: 
   - Download the latest `.vsix` file from [GitHub Releases](https://github.com/MichaelAyles/claude-code-comm-bot/releases)
   - In VS Code: `Cmd+Shift+P` → "Install from VSIX" → Select the file

2. **From Source**:
   ```bash
   npm install
   npm run compile
   npm run package
   ```

### Basic Setup

1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Run "Claude Discord Chat: Open Chat"
3. Type `/config` to set up Discord integration
4. Start chatting with Claude!

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

## 🔌 Discord Integration

### Setup Steps

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

### Features

- **Auto-mirroring**: Sync all Claude conversations to Discord
- **Remote monitoring**: View Claude's responses in Discord
- **Message filtering**: Filter by channel or user ID
- **Status indicators**: Real-time connection status

## 🏗️ Architecture

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

### Key Components

1. **ClaudeService**: Manages Claude AI sessions and communication
2. **DiscordService**: Handles Discord bot connection and messaging
3. **ChatProvider**: Provides the webview-based chat interface

## 🛠️ Development

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

### Debugging

1. Open project in VS Code
2. Set breakpoints in TypeScript files
3. Press F5 to launch Extension Development Host
4. Use Debug Console for output

## 📦 Release Process

1. **Update version** in `package.json`
2. **Update CLAUDE.md** with changes
3. **Build and test**: `npm run compile && npm run package`
4. **Create GitHub Release**:
   - Tag with version (e.g., `v0.1.4`)
   - Upload VSIX file
   - Add release notes

### Automated Releases
```bash
# Use the release script
npm run release

# Or quick releases
npm run release:patch
npm run release:minor
npm run release:major
```

## 🔒 Security Best Practices

- Never commit Discord bot tokens
- Use VS Code settings for sensitive configuration
- Validate all user inputs
- Sanitize Discord messages before display

## 🐛 Troubleshooting

### Common Issues

1. **Discord not connecting**: Check bot token and permissions
2. **Claude not responding**: Verify API availability
3. **Extension not loading**: Check VS Code version compatibility

### Debug Mode

Enable detailed logging:
1. VS Code Settings → "Claude Discord Chat: Debug Mode" → Enable
2. View logs in Output panel → "Claude Discord Chat"

## 📈 Usage Tracking

The extension tracks token usage to help you monitor costs:

- **Session tracking**: Per-session token counts
- **Cost calculation**: Based on current Claude API pricing
- **Projections**: Daily/monthly cost estimates

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for Claude Code users
- Powered by Claude AI API
- Discord.js for bot functionality
- VS Code Extension API

---

For issues or questions, please open an issue on [GitHub](https://github.com/MichaelAyles/claude-code-comm-bot/issues).