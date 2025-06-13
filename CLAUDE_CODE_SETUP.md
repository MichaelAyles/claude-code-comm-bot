# Claude Code MCP Setup - Complete Guide 🤖

This guide shows you exactly how to add the Communication Bot to Claude Code so you can receive messages while away from your computer.

## Part 1: Find Your Claude Code Configuration

### Step 1: Locate the Config File
Claude Code stores its MCP server configuration in one of these locations:

**For macOS/Linux:**
```bash
~/.config/claude-code/mcp_servers.json
```

**Alternative locations (if the above doesn't exist):**
```bash
~/.claude-code/mcp_servers.json
~/.claude/mcp_servers.json
```

### Step 2: Check if Config File Exists
Open your terminal and run:
```bash
# Check the main location
ls -la ~/.config/claude-code/

# If that doesn't exist, try these:
ls -la ~/.claude-code/
ls -la ~/.claude/
```

### Step 3: Create Config Directory (if needed)
If the directory doesn't exist, create it:
```bash
mkdir -p ~/.config/claude-code
```

## Part 2: Configure the MCP Server

### Step 4: Create or Edit mcp_servers.json

**If the file doesn't exist, create it:**
```bash
touch ~/.config/claude-code/mcp_servers.json
```

**Open the file in your preferred editor:**
```bash
# Using nano (beginner-friendly)
nano ~/.config/claude-code/mcp_servers.json

# Or using VSCode
code ~/.config/claude-code/mcp_servers.json

# Or using vim
vim ~/.config/claude-code/mcp_servers.json
```

### Step 5: Add the Configuration

**If the file is empty (new file), add this:**
```json
{
  "mcpServers": {
    "claude-comm-bot": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/Users/tribune/Desktop/Projects/claude-code-comm-bot",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**If you already have other MCP servers, add just the new entry:**
```json
{
  "mcpServers": {
    "existing-server-name": {
      "command": "python",
      "args": ["-m", "existing_server"]
    },
    "claude-comm-bot": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/Users/tribune/Desktop/Projects/claude-code-comm-bot",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 6: Update the Path
**IMPORTANT:** Change the `cwd` path to match where you put the project:

- If you followed the guide exactly, use: `/Users/tribune/Desktop/Projects/claude-code-comm-bot`
- If you put it somewhere else, use that path instead

**To find your exact path:**
```bash
cd /path/to/your/claude-code-comm-bot
pwd
# Copy the output and use it as your "cwd" value
```

### Step 7: Save the File
- **In nano:** Press `Ctrl+X`, then `Y`, then `Enter`
- **In VSCode:** Press `Cmd+S` (Mac) or `Ctrl+S` (Windows/Linux)
- **In vim:** Press `Esc`, then type `:wq` and press `Enter`

## Part 3: Test the Setup

### Step 8: Restart Claude Code
1. **Quit Claude Code completely** (not just close the window)
   - On Mac: `Cmd+Q`
   - On Windows/Linux: `Alt+F4` or File → Exit
2. **Wait 5 seconds**
3. **Start Claude Code again**

### Step 9: Verify MCP Server is Running
When Claude Code starts, it should automatically start your communication bot. Check these places:

**In your terminal (where you ran `npm start`):**
```
✅ Good signs:
Discord bot logged in as YourBot#1234
Discord platform initialized successfully
MCP Server started successfully

❌ Bad signs:
Error messages about tokens, permissions, or file not found
```

**In Discord:**
- Your bot should show as "Online" (green dot)
- The bot should appear in your server's member list

### Step 10: Test the Tools
In Claude Code, you should now have access to these new tools:
- `sendMessage` - Send messages to Discord/Telegram
- `sendStatusUpdate` - Send formatted status updates
- `requestInput` - Ask you questions and wait for responses

**Test it by asking Claude Code:**
> "Send me a test message using the sendMessage tool"

You should receive a message in your Discord channel!

## Part 4: Alternative Configuration Methods

### Method 1: Using Claude Code CLI Arguments
Instead of the config file, you can start Claude Code with MCP servers directly:
```bash
claude-code --mcp-server claude-comm-bot="node src/index.js" --mcp-cwd="/path/to/your/project"
```

### Method 2: Environment Variables
Some Claude Code installations support environment variables:
```bash
export CLAUDE_MCP_SERVERS='{"claude-comm-bot":{"command":"node","args":["src/index.js"],"cwd":"/path/to/project"}}'
claude-code
```

## Troubleshooting

### "MCP server not found"
- Double-check the `cwd` path in your config
- Make sure the path exists and contains `src/index.js`
- Verify you saved the config file properly

### "Command not found: node"
- Install Node.js from https://nodejs.org
- Make sure Node.js is in your PATH
- Try using the full path: `/usr/local/bin/node` or `/usr/bin/node`

### "Permission denied"
- Make sure the `src/index.js` file is executable:
  ```bash
  chmod +x /path/to/your/project/src/index.js
  ```

### "Cannot find module"
- Make sure you ran `npm install` in your project directory
- Check that `node_modules` folder exists in your project

### "Bot token invalid"
- Go back to your `.env` file and check your Discord bot token
- Follow the DISCORD_SETUP.md guide to get a fresh token

### Tools don't appear in Claude Code
- Restart Claude Code completely
- Check Claude Code logs for MCP server errors
- Make sure your config file has valid JSON syntax

### Multiple MCP servers conflict
Make sure each server has a unique name in your config:
```json
{
  "mcpServers": {
    "server-one": { ... },
    "claude-comm-bot": { ... },
    "another-server": { ... }
  }
}
```

## Advanced Configuration

### Custom Environment Variables
You can add custom environment variables to your MCP server:
```json
{
  "mcpServers": {
    "claude-comm-bot": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/Users/tribune/Desktop/Projects/claude-code-comm-bot",
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "debug",
        "CUSTOM_VAR": "custom_value"
      }
    }
  }
}
```

### Multiple Communication Bots
You can run multiple instances for different projects:
```json
{
  "mcpServers": {
    "comm-bot-project1": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/project1/claude-code-comm-bot",
      "env": {
        "DISCORD_CHANNEL_ID": "123456789012345678"
      }
    },
    "comm-bot-project2": {
      "command": "node",
      "args": ["src/index.js"],
      "cwd": "/path/to/project2/claude-code-comm-bot",
      "env": {
        "DISCORD_CHANNEL_ID": "987654321098765432"
      }
    }
  }
}
```

## You're Done! 🎉

Your Claude Code Communication Bot is now integrated with Claude Code! 

**What happens now:**
- When you use Claude Code, you can ask it to send you updates
- Claude Code can notify you about build status, errors, or completion
- You can receive prompts and respond from Discord while away from your computer
- Claude Code will automatically start your communication bot when it launches

**Example usage:**
- "Send me a message when the build completes"
- "Ask me if I want to deploy to production" 
- "Send me status updates as you work on this feature"

**Security reminder:**
- Your bot tokens are stored in the `.env` file
- Never commit this file to version control
- Keep your Discord server private or use a dedicated channel