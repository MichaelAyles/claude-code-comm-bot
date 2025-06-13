# Claude Code Communication Bot - Usage Guidelines

This document provides guidelines for using the Claude Code Communication Bot MCP server effectively.

## Quick Reference

### Essential Commands

- **Build and test**: `npm run build && npm test`
- **Start server**: `npm start`
- **Development mode**: `npm run dev`
- **Lint code**: `npm run lint`
- **Type check**: `npm run typecheck`

### Environment Setup

Always ensure your `.env` file is properly configured before starting:

```bash
# Check if .env exists
ls -la .env

# Copy from example if needed
cp .env.example .env
```

## MCP Server Integration

### Adding to Claude Code Configuration

Add this to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "claude-comm-bot": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/your/claude-code-comm-bot",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Available Tools

1. **sendMessage**: Send messages to Discord/Telegram
2. **sendStatusUpdate**: Send formatted status updates
3. **requestInput**: Request user input with timeout

## Usage Patterns

### Sending Updates

Use `sendMessage` for general updates:
```javascript
await sendMessage({
  message: "Starting deployment process...",
  platform: "discord"
});
```

### Progress Updates

Use `sendStatusUpdate` for progress tracking:
```javascript
await sendStatusUpdate({
  status: "Building project",
  details: "Compiling TypeScript files",
  progress: 45
});
```

### User Interaction

Use `requestInput` when you need user decisions:
```javascript
const response = await requestInput({
  prompt: "Deploy to production? (yes/no)",
  timeout: 300
});
```

## Bot Configuration

### Discord Setup

1. Create Discord application at https://discord.com/developers/applications
2. Create bot and copy token
3. Invite bot to server with "Send Messages" permission
4. Get channel ID (enable Developer Mode → right-click channel → Copy ID)

### Telegram Setup

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Copy bot token
4. Get chat ID by messaging bot and visiting: 
   `https://api.telegram.org/bot<TOKEN>/getUpdates`

## Troubleshooting

### Common Issues

1. **Bot offline**: Check if server is running with `npm start`
2. **No messages sent**: Verify tokens and IDs in `.env`
3. **Permission errors**: Ensure bot has proper permissions
4. **Timeout errors**: Check network connectivity

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Log Locations

- **macOS**: `~/Library/Logs/claude-comm-bot/`
- **Linux**: `~/.local/share/logs/claude-comm-bot/`

## Development

### Testing Locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Test the MCP server
npm test
```

### File Structure

```
src/
├── index.js          # Main MCP server entry point
├── config/           # Configuration management
├── platforms/        # Discord/Telegram integrations
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

## Best Practices

### Message Formatting

- Use clear, concise messages
- Include context for status updates
- Use urgent flag sparingly for critical issues
- Format code blocks with backticks

### Error Handling

- Always handle connection errors gracefully
- Provide fallback communication methods
- Log errors for debugging
- Retry failed operations when appropriate

### Security

- Never commit `.env` files
- Use environment variables for all secrets
- Limit bot permissions to minimum required
- Monitor bot activity logs

## Integration Examples

### Build Process Integration

```javascript
// At start of build
await sendMessage({ message: "🔨 Build started" });

// During build
await sendStatusUpdate({
  status: "Building",
  progress: 50,
  details: "Compiling TypeScript"
});

// On completion
await sendMessage({ 
  message: "✅ Build completed successfully",
  urgent: false 
});
```

### Deployment Integration

```javascript
// Request permission
const proceed = await requestInput({
  prompt: "Ready to deploy to production. Continue? (yes/no)",
  timeout: 600
});

if (proceed.toLowerCase() === 'yes') {
  await sendMessage({ message: "🚀 Deployment started" });
  // ... deployment logic
}
```

## Support

For issues or questions:
- Check logs in the appropriate log directory
- Enable debug mode for detailed logging
- Verify bot tokens and permissions
- Test with simple messages first

Remember: This MCP server enables remote monitoring and control of your Claude Code sessions. Use it responsibly and ensure your bot tokens are kept secure.