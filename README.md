# Claude Discord Chat - VS Code Extension

A powerful VS Code extension that provides a beautiful chat interface for Claude AI with live terminal integration and Discord remote monitoring capabilities.

## 🚀 What This Extension Does

This extension transforms your VS Code into a powerful Claude AI interface by:

1. **Direct Claude Code CLI Integration**: Spawns and manages Claude Code CLI processes with real-time terminal output
2. **Beautiful Chat Interface**: Clean, VS Code-native webview with structured message display
3. **Live Terminal Output**: Watch Claude's thinking process, tool usage, and responses in real-time
4. **Discord Remote Monitoring**: Mirror conversations to Discord for mobile access and team collaboration
5. **Session Management**: Persistent sessions with automatic resume and token tracking

## ✨ Key Features

### 🤖 Claude AI Integration
- **Live Terminal**: Real-time Claude Code CLI execution with full terminal output
- **Dual Processing**: Terminal for live interaction + background JSON parsing for structured data
- **Session Continuity**: Automatic session resume across VS Code restarts
- **Token Tracking**: Monitor input/output tokens and costs in real-time
- **Interactive Control**: Stop, restart, and manage Claude sessions

### 💬 Beautiful Chat Interface
- **VS Code Native**: Seamlessly integrated webview with VS Code theming
- **Message Types**: Distinct styling for user, assistant, thinking, tool use, and system messages
- **Real-time Updates**: Live processing indicators and status updates
- **Command System**: Built-in commands for configuration and session management

### 📱 Discord Integration
- **Remote Monitoring**: Access your Claude conversations from anywhere via Discord
- **Auto-mirroring**: Automatically sync conversations to Discord channels or DMs
- **Bidirectional**: Send messages to Claude through Discord
- **Mobile Friendly**: Monitor and control Claude sessions from your phone
- **Team Collaboration**: Share Claude interactions with team members

## 🎯 Project Background

This project was inspired by the excellent [claude-code-chat](https://github.com/andrepimenta/claude-code-chat) VS Code extension by Andre Pimenta. However, due to licensing restrictions that prohibited modification and distribution, we created an entirely original implementation from scratch.

Our approach combines the best of both worlds: a beautiful VS Code chat interface with powerful Discord remote capabilities, all under an MIT license that enables community contributions.

## 🚀 Quick Start

### Prerequisites

- **VS Code/Cursor** 1.95.0 or higher
- **Claude Code CLI** installed and configured ([Install Guide](https://www.anthropic.com/claude-code))
- **Node.js** 18+ (for development)
- **Discord Bot Token** (optional, for Discord features)

### Installation

1. **Clone and Build**:
```bash
git clone https://github.com/MichaelAyles/claude-code-comm-bot.git
cd claude-code-comm-bot
npm install
npm run compile
npm run package
```

2. **Install Extension**:
   - Open VS Code/Cursor
   - Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
   - Run "Extensions: Install from VSIX..."
   - Select `claude-discord-chat-0.1.0.vsix`

3. **Start Using**:
   - Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
   - Or use Command Palette: "Claude Discord Chat: Open Claude Chat"

## 🔧 Configuration

### Basic Setup

1. **Open Chat**: Press `Ctrl+Shift+C` (or `Cmd+Shift+C`)
2. **Configure Discord**: Type `/config` and follow the wizard
3. **Start Chatting**: Send a message to Claude AI

### Discord Bot Setup (Optional)

The `/config` command guides you through this, but here's the manual process:

1. **Create Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application → Bot section → Copy token

2. **Configure Bot Permissions**:
   - Enable "Message Content Intent"
   - Invite to server with "Send Messages" and "Read Message History" permissions

3. **Get IDs**:
   - Enable Developer Mode in Discord settings
   - Right-click channel/user → Copy ID

### VS Code Settings

```json
{
  "claude-discord-chat.discord.enabled": true,
  "claude-discord-chat.discord.botToken": "your-bot-token",
  "claude-discord-chat.discord.channelId": "channel-id",
  "claude-discord-chat.discord.userId": "user-id-for-dms",
  "claude-discord-chat.discord.autoMirror": true
}
```

## 📋 Available Commands

Type these in the chat interface:

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/config` | Launch Discord setup wizard |
| `/status` | Show connection and session status |
| `/stop` | Stop current Claude request |
| `/new` or `/newsession` | Start fresh Claude session |
| `/session` | Show current session details |

## 🏗️ Architecture

### Technical Implementation

```
User Input → Chat Interface → Claude Code CLI → Live Terminal + JSON Parser
     ↓                                                      ↓
Discord Bot ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←← Structured Messages
```

### Key Components

- **ClaudeService**: Manages Claude Code CLI processes with child_process spawning
- **DiscordService**: Handles Discord bot integration with message filtering
- **ChatProvider**: Manages webview interface and command routing
- **Extension**: Coordinates services and VS Code integration

### Message Flow

1. **User Message** → Chat Interface → Claude CLI (with terminal display)
2. **Claude Response** → JSON Parser → Structured Display + Discord Mirror
3. **Discord Message** → Bot → Chat Interface → User Notification
4. **Session State** → Persistent Storage → Auto-resume on restart

## 🔍 How It Works

### Claude Integration

The extension spawns Claude Code CLI with these features:

- **Command**: `claude -p --output-format stream-json --verbose`
- **Session Resume**: Automatic session continuation with `--resume <session-id>`
- **Live Terminal**: Real-time output in dedicated VS Code terminal
- **JSON Parsing**: Background processing for structured data extraction
- **Error Handling**: Graceful handling of CLI errors and connectivity issues

### Discord Features

- **Auto-mirroring**: User and Claude messages automatically sent to Discord
- **Message Filtering**: Channel or user-based filtering for relevant messages
- **Bidirectional**: Send messages to Claude through Discord
- **Status Indicators**: Real-time connection status in VS Code status bar
- **Urgent Messages**: Special formatting for priority notifications

## 🛠️ Development

### Project Structure

```
src/
├── extension.ts          # Main extension activation
├── claude/
│   └── ClaudeService.ts  # Claude Code CLI integration
├── discord/
│   └── DiscordService.ts # Discord bot functionality
└── webview/
    └── ChatProvider.ts   # Chat UI and commands
```

### Development Scripts

```bash
npm run compile      # Build TypeScript
npm run watch        # Watch for changes
npm run lint         # Lint code
npm run test         # Run tests
npm run package      # Create VSIX package
```

### Development Workflow

1. **Make Changes**: Edit TypeScript files in `src/`
2. **Compile**: `npm run compile`
3. **Test**: Press F5 to launch Extension Development Host
4. **Package**: `npm run package` to create installable VSIX

## 🎨 UI Features

### Chat Interface

- **Message Types**: Distinct styling for different message types
- **Real-time Indicators**: Processing states and connection status
- **Interactive Elements**: Clickable commands and configuration options
- **VS Code Theming**: Automatically adapts to your VS Code theme

### Terminal Integration

- **Live Output**: See Claude's actual terminal interaction
- **Command Echo**: Shows exact commands being executed
- **Process Control**: Interactive stopping with Ctrl+C support
- **Session Persistence**: Terminal remains available across messages

## 🔧 Troubleshooting

### Common Issues

**"Claude Code CLI not found"**
- Install Claude Code: [https://www.anthropic.com/claude-code](https://www.anthropic.com/claude-code)
- Verify `claude` command works in terminal
- Check PATH environment variable

**Discord Bot Not Responding**
- Verify bot token in settings
- Check "Message Content Intent" is enabled
- Ensure bot has proper channel permissions
- Test with `/status` command to check connection

**Extension Not Loading**
- Check VS Code version (requires 1.95.0+)
- Reload VS Code window (Cmd/Ctrl+R)
- Check Developer Console for errors (Help → Toggle Developer Tools)

**Session/Login Issues**
- Run `claude login` in terminal first
- Check API key validity
- Verify network connectivity

### Debug Information

Enable detailed logging:
1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Check Console tab for "Claude Discord Chat" messages
3. Use `/status` command to check service states

## 🗺️ Roadmap

### Upcoming Features

- **File References**: `@filename` support for workspace integration
- **Conversation History**: Persistent chat history with search
- **Rich Formatting**: Syntax highlighting in chat messages
- **Voice Commands**: Discord voice integration
- **Team Workspaces**: Shared Claude sessions
- **Custom Commands**: User-defined shortcuts
- **Export Options**: Save conversations in multiple formats

### Technical Improvements

- **Performance**: Optimize memory usage and response times
- **Error Recovery**: Enhanced error handling and retry logic
- **Testing**: Comprehensive test coverage
- **Security**: Enhanced token management and permissions

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Code Guidelines

- Use TypeScript for all new code
- Follow existing formatting and patterns
- Add JSDoc comments for public APIs
- Include tests for new features
- Update documentation as needed

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

This project is completely original and contains no code from other projects. All implementations are created from scratch under the MIT license.

## 🆘 Support

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/MichaelAyles/claude-code-comm-bot/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/MichaelAyles/claude-code-comm-bot/discussions)
- **📚 Documentation**: This README and inline code comments
- **💬 Community**: GitHub Discussions for questions and tips

---

**Disclaimer**: This project is not affiliated with Anthropic, Discord, or Microsoft. Claude Code is a trademark of Anthropic. Discord is a trademark of Discord Inc. VS Code is a trademark of Microsoft Corporation.