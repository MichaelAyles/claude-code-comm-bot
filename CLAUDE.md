# Claude Code System Instructions for claude-discord-chat Extension

## Project Overview

You are working on a VS Code extension called "Claude Discord Chat" that integrates Claude AI chat functionality with Discord notifications. The extension allows users to chat with Claude directly in VS Code while mirroring conversations to Discord for remote monitoring.

## Key Technical Details

### Architecture
- **ClaudeService**: Manages Claude AI sessions and API communication
- **DiscordService**: Handles Discord bot connection and message mirroring
- **ChatProvider**: Provides the webview-based chat interface in VS Code

### Important Files
- `src/extension.ts`: Main extension entry point
- `src/claude/ClaudeService.ts`: Claude AI integration
- `src/discord/DiscordService.ts`: Discord bot functionality
- `src/webview/ChatProvider.ts`: Chat UI and command handling
- `package.json`: Extension manifest and configuration

### Current Version
The extension is currently at version 0.1.6. Always increment the version in package.json when making releases.

## Development Guidelines

### Code Style
- Use TypeScript for all code
- Follow existing patterns in the codebase
- Use async/await for asynchronous operations
- Handle errors gracefully with try/catch blocks
- Add proper type annotations

### VS Code Extension Best Practices
- Use the VS Code API correctly (vscode namespace)
- Dispose of resources properly to prevent memory leaks
- Store sensitive data (like Discord tokens) in VS Code configuration
- Use webviews for complex UI (already implemented in ChatProvider)
- Follow VS Code extension activation best practices

### Discord Integration
- Discord bot tokens should NEVER be hardcoded or committed
- Use discord.js v14 patterns (already in dependencies)
- Handle Discord connection errors gracefully
- Implement proper reconnection logic
- Filter messages appropriately based on channel/user IDs

### User Experience
- Provide clear error messages
- Include helpful command suggestions (like /config)
- Show connection status in the UI
- Make the Discord setup wizard user-friendly
- Display version number in welcome messages

## Build and Release Process

### Building
```bash
npm run compile     # Compile TypeScript
npm run package     # Create VSIX file
```

### Testing
```bash
npm run lint        # Run linter
npm run typecheck   # Type checking
# Press F5 in VS Code to test
```

### Release Process
1. Update version in package.json
2. Update CLAUDE.md if needed
3. Build: `npm run compile && npm run package`
4. Test the VSIX locally
5. Commit changes
6. Create git tag: `git tag v0.1.X`
7. Push tag to trigger GitHub Actions

### GitHub Actions
The project uses GitHub Actions for automated releases. The workflow:
- Triggers on version tags (v*.*.*)
- Builds the extension
- Runs tests with xvfb-run for headless VS Code testing
- Creates GitHub release with VSIX file
- Requires write permissions for releases

## Common Issues and Solutions

### CI/Build Issues
- Use `npx vsce package` to ensure vsce is found
- Add `permissions: contents: write` to GitHub Actions for releases
- Use `xvfb-run -a npm test` for VS Code tests in CI

### Extension Issues
- Always check VS Code version compatibility (requires ^1.95.0)
- Ensure all dependencies are properly installed
- Check for proper disposal of resources
- Verify Discord bot has correct permissions

## Security Considerations

- Never commit Discord bot tokens or API keys
- Use VS Code's configuration API for sensitive data
- Validate all user inputs
- Sanitize messages before displaying in webview
- Follow VS Code security best practices

## Future Improvements

When implementing new features:
- Maintain backward compatibility
- Update documentation (README.md)
- Add user-facing commands to package.json
- Consider performance impact
- Test on multiple VS Code versions

Remember: This is a VS Code extension, not a standalone application. Always work within VS Code's extension framework and guidelines.