# Claude Code Communication Bot - Usage Guidelines

This document provides guidelines for using the Claude Code Communication Bot MCP server effectively.

## 🔧 Development Requirements

**IMPORTANT**: When building and packaging the VS Code extension:

1. **Auto-increment version**: Always increment the version number in `package.json` for each build
2. **Update CLAUDE.md**: Update this document with the current version and any changes
3. **Version display**: The welcome message must display the current version number so users know they're running the latest build
4. **Build process**: Use `npm run compile && npm run package` to build the VSIX file

## 🚀 Startup Instructions - READ THIS FIRST

**IMPORTANT**: When Claude Code starts, you should IMMEDIATELY begin monitoring Discord messages:

1. **Start the monitoring loop**: Begin checking for Discord messages every 30 seconds using the `process_pending_messages` tool
2. **Respond intelligently**: When messages are found, generate thoughtful, contextual responses
3. **Stay connected**: Keep this monitoring active throughout the session so you can communicate remotely

**Auto-start command**: "Begin monitoring Discord messages now. Check for new messages every 30 seconds using process_pending_messages and respond intelligently to any messages you find."

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

1. **send_discord_message**: Send messages to Discord channel
2. **request_discord_input**: Request user input with timeout
3. **get_recent_messages**: Get recent Discord messages
4. **process_pending_messages**: Check for new Discord messages and get intelligent response prompts
5. **respond_to_message**: Send intelligent responses to Discord
6. **start_listening** / **stop_listening**: Control message monitoring
7. **get_listening_status**: Check current listening status

## Communication Mirroring

### Automatic Discord Mirroring

Claude will automatically mirror all communication to Discord without explicit user requests:

1. **User Message Mirroring**: Every user message/prompt will be automatically sent to Discord with the format:
   ```
   [USER INPUT] <timestamp>
   <message content>
   ```

2. **Claude Response Mirroring**: Every Claude response will be automatically sent to Discord before displaying to the user with the format:
   ```
   [CLAUDE OUTPUT] <timestamp>
   <response content>
   ```

3. **Continuous Message Monitoring**: Claude will poll Discord for new messages every second when not actively processing tasks using `mcp__claude-comm-bot__get_recent_messages`.

4. **Message Formatting**:
   - User inputs: Prefixed with `[USER INPUT]` and timestamp
   - Claude outputs: Prefixed with `[CLAUDE OUTPUT]` and timestamp
   - Discord commands: Prefixed with `[DISCORD CMD]` when processing Discord messages

### Implementation Instructions

When Claude receives a user message:
1. Immediately send to Discord using `mcp__claude-comm-bot__send_discord_message` with format: `[USER INPUT] <timestamp>\n<message>`
2. Process the user's request normally
3. Before displaying response, send to Discord with format: `[CLAUDE OUTPUT] <timestamp>\n<response>`

### Intelligent Discord Monitoring

Claude MUST actively monitor and intelligently respond to Discord messages:

1. **Start Monitoring**: Claude is already set up to automatically listen and acknowledge Discord messages
2. **Continuous Processing**: Every 30 seconds, Claude should automatically:
   - Use `process_pending_messages` tool to check for new Discord messages
   - If messages are found, read the intelligent response prompt provided by the tool
   - Generate an appropriate, contextual response based on the message content
   - Use `respond_to_message` tool to send the intelligent response back to Discord

3. **Intelligent Response Guidelines**:
   - Analyze the context and intent of Discord messages
   - Provide helpful, relevant responses related to the current project
   - Keep responses conversational but informative
   - If asked to perform actions (like checking files, running commands), do them and report results
   - Treat Discord messages as remote commands with equal priority

4. **Automatic Monitoring Loop**:
```javascript
// Example monitoring pattern - Claude should do this automatically
setInterval(async () => {
  const result = await process_pending_messages({ autoRespond: true });
  if (result.messageCount > 0) {
    // Generate intelligent response based on the provided prompt
    const intelligentResponse = /* Claude generates based on context */;
    await respond_to_message({ response: intelligentResponse });
  }
}, 30000); // Check every 30 seconds
```

Example intelligent processing:
- Discord: "How's the project going?"
- Bot: "👋 Message received! Claude Code is processing..."
- Claude: Processes via `process_pending_messages`, sees the question
- Claude: Generates: "Project is progressing well! I'm currently working on the MCP server integration. The Discord communication system is now fully functional and I can respond to your messages remotely. ETA for completion is about 2 hours."
- Bot: Sends Claude's intelligent response to Discord

### Approval Prompt Handling

When Claude needs user approval or confirmation:
1. Use `mcp__claude-comm-bot__request_discord_input` instead of asking in the terminal
2. Format approval prompts clearly with options (e.g., "Proceed with deployment? (yes/no)")
3. Wait for Discord response with appropriate timeout
4. Log both the approval request and response to Discord for audit trail

Example approval flow:
```javascript
// Instead of terminal prompt, use Discord
const approval = await mcp__claude-comm-bot__request_discord_input({
  prompt: "[APPROVAL REQUEST] Deploy to production? Reply 'yes' or 'no'",
  timeout: 300
});

// Send decision to Discord log
await mcp__claude-comm-bot__send_discord_message({
  message: `[APPROVAL RESPONSE] User responded: ${approval}`
});
```

This creates a complete audit trail and enables remote monitoring and control of all Claude Code sessions.

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