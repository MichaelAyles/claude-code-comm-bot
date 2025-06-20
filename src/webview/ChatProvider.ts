import * as vscode from 'vscode';
import { DiscordService, DiscordMessage } from '../discord/DiscordService';
import { ClaudeService, ClaudeMessage } from '../claude/ClaudeService';
import * as path from 'path';

export class ChatProvider implements vscode.Disposable {
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private messages: Array<{type: string, content: string, timestamp: Date}> = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _discordService: DiscordService,
        private readonly _claudeService: ClaudeService
    ) {
        // Listen for Discord messages
        this._discordService.onMessageReceived((message: DiscordMessage) => {
            console.log('ChatProvider received Discord message:', message);
            this.addMessage('discord', `**${message.author.username}**: ${message.content}`);
            
            // Forward Discord message to Claude without adding duplicate user message
            this._claudeService.sendMessage(message.content, false).catch((error) => {
                this.addMessage('error', `Failed to send Discord message to Claude: ${error}`);
            });
        });

        // Listen for Discord status changes
        this._discordService.onStatusChange((connected: boolean) => {
            this.sendToWebview({
                type: 'discordStatus',
                connected: connected
            });
        });

        // Listen for Claude messages
        this._claudeService.onMessageReceived((message: ClaudeMessage) => {
            console.log('ChatProvider received Claude message:', message);
            this.addMessage(message.type, message.content);
            
            // Auto-mirror Claude responses to Discord if enabled
            const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
            if (config.get<boolean>('autoMirror') && this._discordService.isConnected()) {
                // Only mirror main responses, not thinking or tool use details
                if (message.type === 'assistant') {
                    this._discordService.sendMessage(`Claude: ${message.content}`).catch(console.error);
                } else if (message.type === 'error') {
                    this._discordService.sendMessage(`Claude (Error): ${message.content}`).catch(console.error);
                }
            }
        });

        // Listen for Claude processing state changes
        this._claudeService.onProcessingChanged((processing: boolean) => {
            this.sendToWebview({
                type: 'processing',
                processing: processing
            });
        });

        // Listen for Claude session changes
        this._claudeService.onSessionChanged((sessionId: string) => {
            this.sendToWebview({
                type: 'sessionInfo',
                sessionId: sessionId
            });
        });

        // Listen for token updates
        this._claudeService.onTokensUpdated((tokens: {input: number, output: number, cost: number}) => {
            this.sendToWebview({
                type: 'tokensUpdate',
                tokens: tokens
            });
        });
    }

    public show() {
        const column = vscode.ViewColumn.Two;

        if (this._panel) {
            this._panel.reveal(column);
            return;
        }

        this._panel = vscode.window.createWebviewPanel(
            'claudeDiscordChat',
            'Claude Discord Chat',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        this._panel.webview.html = this.getHtmlForWebview();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.type) {
                    case 'sendMessage':
                        this.handleSendMessage(message.content);
                        break;
                }
            },
            null,
            this._disposables
        );

        // Send initial state
        setTimeout(() => {
            this.sendToWebview({
                type: 'discordStatus',
                connected: this._discordService.isConnected()
            });

            // Send existing messages
            this.messages.forEach(msg => {
                this.sendToWebview({
                    type: 'message',
                    messageType: msg.type,
                    content: msg.content,
                    timestamp: msg.timestamp.toLocaleTimeString()
                });
            });
        }, 100);
    }

    private handleSendMessage(content: string) {
        this.addMessage('user', content);

        // Handle special commands
        if (content.startsWith('/')) {
            this.handleCommand(content);
            return;
        }
        
        // Auto-mirror to Discord if enabled
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        if (config.get<boolean>('autoMirror') && this._discordService.isConnected()) {
            this._discordService.sendMessage(`User: ${content}`).catch(console.error);
        }

        // Send message to Claude
        this._claudeService.sendMessage(content).catch((error) => {
            this.addMessage('error', `Failed to send message to Claude: ${error}`);
        });
    }

    private async handleCommand(command: string) {
        const cmd = command.toLowerCase().trim();
        
        if (cmd === '/config' || cmd === '/setup') {
            await this.startConfigurationWizard();
        } else if (cmd === '/help') {
            this.showHelp();
        } else if (cmd === '/status') {
            this.showStatus();
        } else if (cmd === '/stop') {
            this._claudeService.stopCurrentRequest();
            this.addMessage('system', '⏹️ Stopped current Claude request');
        } else if (cmd === '/new' || cmd === '/newsession') {
            this._claudeService.newSession();
            this.addMessage('system', '🆕 Started new Claude session');
        } else if (cmd === '/session') {
            this.showSessionInfo();
        } else if (cmd === '/limits' || cmd === '/cost') {
            this.showLimitsInfo();
        } else if (cmd === '/usage' || cmd.startsWith('/usage ')) {
            this.showUsageInfo(cmd);
        } else {
            this.addMessage('system', `Unknown command: ${command}. Type /help for available commands.`);
        }
    }

    private async startConfigurationWizard() {
        this.addMessage('system', `🔧 **Discord Configuration Guide**

Follow these steps to set up Discord integration:

**Step 1: Create a Discord Bot**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Reset Token" and copy the bot token
5. Enable "Message Content Intent" under "Privileged Gateway Intents"

**Step 2: Create/Find Your Discord Channel**
1. Create a new channel in your Discord server (or use an existing one)
2. Make sure your bot has permission to read and send messages in this channel

**Step 3: Enable Developer Mode & Get IDs**
1. In Discord, go to Settings → Advanced → Enable "Developer Mode"
2. Right-click on your desired channel → "Copy ID" (this is your Channel ID)
3. Right-click on your username → "Copy ID" (this is your User ID, optional)

**Step 4: Configure in VS Code Settings**
1. Press **Cmd+,** (Mac) or **Ctrl+,** (Windows/Linux) to open VS Code settings
2. Search for "**discord bot**" in the settings search bar
3. Configure the following settings:
   - **Discord Bot Token**: Paste your bot token from Step 1
   - **Channel ID**: Paste your channel ID from Step 3 (optional - leave empty to listen to all channels)
   - **User ID**: Paste your user ID from Step 3 (optional - leave empty to listen to all users)
   - **Enabled**: Check this box to enable Discord integration
   - **Auto Mirror**: Check this box to automatically send Claude conversations to Discord

**Step 5: Invite Your Bot to Your Server**
1. In the Discord Developer Portal, go to OAuth2 → URL Generator
2. Select "bot" scope and these permissions:
   - Send Messages
   - Read Message History
   - View Channel
3. Copy the generated URL and open it in your browser
4. Select your server and authorize the bot

**That's it!** Your Discord bot should now be connected. Use **/status** to check the connection status.

**Pro Tips:**
- Leave Channel ID empty to listen to all channels where the bot has permissions
- Leave User ID empty to respond to messages from any user
- Use **/status** to verify your configuration is working`);
    }

    private showHelp() {
        this.addMessage('system', `🆘 **Available Commands**

**Claude AI:**
- \`/stop\` - Stop current Claude request
- \`/new\` or \`/newsession\` - Start new Claude session
- \`/session\` - Show current session info
- \`/limits\` or \`/cost\` - Show usage limits and cost projections
- \`/usage\` - Show actual usage for today
- \`/usage daily\` - Show daily usage breakdown  
- \`/usage monthly\` - Show monthly usage breakdown

**Discord Configuration:**
- \`/config\` - Run Discord setup wizard
- \`/status\` - Show current connection status

**Usage:**
- Send messages normally to chat with Claude AI
- Messages are auto-mirrored to Discord (if enabled)
- Use Discord controls below to send direct Discord messages
- Use \`@filename\` to reference files in your workspace

**Tips:**
- Enable "Auto Mirror" in settings to sync all conversations to Discord
- Configure channel or user ID for message filtering
- Check status bar for connection indicators
- Monitor costs with \`/limits\` to stay within budget
- Track actual usage with \`/usage\` commands`);
    }

    private showSessionInfo() {
        const session = this._claudeService.getCurrentSession();
        const processing = this._claudeService.isCurrentlyProcessing();

        if (!session) {
            this.addMessage('system', '📄 **No Active Session**\n\nStart a conversation to create a new session.');
            return;
        }

        this.addMessage('system', `📄 **Current Session Info**

**Session ID:** ${session.sessionId || 'New session (no ID yet)'}
**Started:** ${session.startTime.toLocaleString()}
**Messages:** ${session.messages.length}
**Total Cost:** $${session.totalCost.toFixed(4)}
**Tokens:** ${session.totalTokensInput + session.totalTokensOutput} (${session.totalTokensInput} in, ${session.totalTokensOutput} out)
**Status:** ${processing ? '🔄 Processing...' : '✅ Ready'}

Use \`/new\` to start a fresh session or continue chatting to maintain context.`);
    }

    private showLimitsInfo() {
        const session = this._claudeService.getCurrentSession();
        const currentTokens = session ? session.totalTokensInput + session.totalTokensOutput : 0;
        const currentCost = session ? session.totalCost : 0;
        
        // Calculate usage projections
        const hoursElapsed = session ? (Date.now() - session.startTime.getTime()) / (1000 * 60 * 60) : 1;
        const costPerHour = hoursElapsed > 0 ? currentCost / hoursElapsed : 0;
        const dailyProjection = costPerHour * 24;
        const monthlyProjection = dailyProjection * 30;
        
        // Token limits for different models
        const contextWindows = {
            'Claude 3 Opus': '200K tokens',
            'Claude 3.5 Sonnet': '200K tokens',
            'Claude 3 Haiku': '200K tokens'
        };
        
        // Rate limits
        const rateLimits = {
            'Requests per minute': '5 (Pro), 10 (Max)',
            'Tokens per minute': '40K (Pro), 80K (Max)',
            'Tokens per day': '1M (Pro), 5M (Max)'
        };

        this.addMessage('system', `📊 **Usage Limits & Cost Information**

**Current Session Usage:**
- **Tokens Used:** ${currentTokens.toLocaleString()} tokens
- **Session Cost:** $${currentCost.toFixed(4)}
- **Context Usage:** ~${Math.round((currentTokens / 200000) * 100)}% of max context

**Cost Projections:**
- **Per Hour:** $${costPerHour.toFixed(2)}
- **Per Day:** $${dailyProjection.toFixed(2)}
- **Per Month:** $${monthlyProjection.toFixed(2)}

**Model Context Windows:**
${Object.entries(contextWindows).map(([model, limit]) => `- ${model}: ${limit}`).join('\n')}

**Rate Limits:**
${Object.entries(rateLimits).map(([limit, value]) => `- ${limit}: ${value}`).join('\n')}

**💡 Tips to Manage Usage:**
- Use \`/new\` to start fresh sessions when switching tasks
- Be specific in your queries to reduce back-and-forth
- Clear context between unrelated tasks
- Break complex tasks into smaller chunks
- Monitor costs with \`/limits\` regularly

**📈 Usage Facts:**
- Average daily cost: ~$6 per developer
- 90% of users stay under $12/day
- Monthly average: $50-60 with Sonnet 4

Type \`/session\` for current session details or \`/new\` to reset.`);
    }

    private showUsageInfo(command: string) {
        const usage = this._claudeService.getUsageStats();
        const parts = command.split(' ');
        const subcommand = parts[1] || 'today';

        if (subcommand === 'daily') {
            this.showDailyUsage(usage);
        } else if (subcommand === 'monthly') {
            this.showMonthlyUsage(usage);
        } else if (subcommand === 'clear' && parts[2] === 'confirm') {
            this._claudeService.clearUsageStats();
            this.addMessage('system', '🗑️ **Usage Statistics Cleared**\n\nAll historical usage data has been cleared.');
        } else {
            // Show today's usage by default
            this.showTodayUsage(usage);
        }
    }

    private showTodayUsage(stats: any) {
        const today = new Date().toISOString().split('T')[0];
        const todayData = stats.daily[today] || {
            cost: 0,
            tokensInput: 0,
            tokensOutput: 0,
            sessions: 0,
            requests: 0
        };

        // Get current month data
        const currentMonth = today.substring(0, 7);
        const monthData = stats.monthly[currentMonth] || {
            cost: 0,
            tokensInput: 0,
            tokensOutput: 0,
            sessions: 0,
            requests: 0
        };

        this.addMessage('system', `📊 **Actual Usage Statistics**

**Today (${today}):**
- **Cost:** $${todayData.cost.toFixed(4)}
- **Tokens:** ${(todayData.tokensInput + todayData.tokensOutput).toLocaleString()} (${todayData.tokensInput.toLocaleString()} in, ${todayData.tokensOutput.toLocaleString()} out)
- **Requests:** ${todayData.requests}
- **Sessions:** ${todayData.sessions}

**This Month (${currentMonth}):**
- **Cost:** $${monthData.cost.toFixed(2)}
- **Tokens:** ${(monthData.tokensInput + monthData.tokensOutput).toLocaleString()}
- **Requests:** ${monthData.requests}
- **Sessions:** ${monthData.sessions}

**All Time:**
- **Total Cost:** $${stats.allTime.cost.toFixed(2)}
- **Total Tokens:** ${(stats.allTime.tokensInput + stats.allTime.tokensOutput).toLocaleString()}
- **Total Requests:** ${stats.allTime.requests}
- **Total Sessions:** ${stats.allTime.sessions}

💡 **Commands:**
- \`/usage daily\` - View daily breakdown
- \`/usage monthly\` - View monthly breakdown
- \`/limits\` - View projections and limits`);
    }

    private showDailyUsage(stats: any) {
        const days = Object.keys(stats.daily).sort().reverse().slice(0, 7); // Last 7 days
        
        let dailyBreakdown = '📅 **Daily Usage (Last 7 Days)**\n\n';
        let totalWeekCost = 0;
        
        days.forEach(date => {
            const data = stats.daily[date];
            totalWeekCost += data.cost;
            dailyBreakdown += `**${date}:**\n`;
            dailyBreakdown += `  💰 Cost: $${data.cost.toFixed(4)}\n`;
            dailyBreakdown += `  🔢 Tokens: ${(data.tokensInput + data.tokensOutput).toLocaleString()}\n`;
            dailyBreakdown += `  📨 Requests: ${data.requests}\n`;
            dailyBreakdown += `  💬 Sessions: ${data.sessions}\n\n`;
        });
        
        dailyBreakdown += `**7-Day Total:** $${totalWeekCost.toFixed(2)}\n`;
        dailyBreakdown += `**Daily Average:** $${(totalWeekCost / Math.min(days.length, 7)).toFixed(2)}`;
        
        this.addMessage('system', dailyBreakdown);
    }

    private showMonthlyUsage(stats: any) {
        const months = Object.keys(stats.monthly).sort().reverse().slice(0, 12); // Last 12 months
        
        let monthlyBreakdown = '📆 **Monthly Usage (Last 12 Months)**\n\n';
        let totalYearCost = 0;
        
        months.forEach(month => {
            const data = stats.monthly[month];
            totalYearCost += data.cost;
            monthlyBreakdown += `**${month}:**\n`;
            monthlyBreakdown += `  💰 Cost: $${data.cost.toFixed(2)}\n`;
            monthlyBreakdown += `  🔢 Tokens: ${(data.tokensInput + data.tokensOutput).toLocaleString()}\n`;
            monthlyBreakdown += `  📨 Requests: ${data.requests}\n`;
            monthlyBreakdown += `  💬 Sessions: ${data.sessions}\n\n`;
        });
        
        monthlyBreakdown += `**12-Month Total:** $${totalYearCost.toFixed(2)}\n`;
        monthlyBreakdown += `**Monthly Average:** $${(totalYearCost / Math.min(months.length, 12)).toFixed(2)}`;
        
        this.addMessage('system', monthlyBreakdown);
    }

    private showStatus() {
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const enabled = config.get<boolean>('enabled');
        const hasToken = !!config.get<string>('botToken');
        const channelId = config.get<string>('channelId');
        const userId = config.get<string>('userId');
        const autoMirror = config.get<boolean>('autoMirror');
        const connected = this._discordService.isConnected();

        let filterStatus = 'All messages';
        if (channelId) filterStatus = `Channel: ${channelId}`;
        if (userId) filterStatus = `User: ${userId}`;

        this.addMessage('system', `📊 **Current Status**

**Discord Integration:** ${enabled ? '✅ Enabled' : '❌ Disabled'}
**Connection:** ${connected ? '🟢 Connected' : '🔴 Disconnected'}
**Bot Token:** ${hasToken ? '✅ Configured' : '❌ Missing'}
**Message Filter:** ${filterStatus}
**Auto Mirror:** ${autoMirror ? '✅ Enabled' : '❌ Disabled'}

${!enabled || !hasToken ? '\n⚠️ Run `/config` to set up Discord integration' : ''}
${enabled && hasToken && !connected ? '\n⚠️ Connection issue - check bot token and permissions' : ''}`);
    }

    private addMessage(type: string, content: string) {
        // Clean up excessive whitespace while preserving intentional formatting
        const cleanContent = content
            .replace(/\n{3,}/g, '\n\n')     // Replace 3+ newlines with double newlines
            .replace(/^\s+|\s+$/g, '')      // Trim leading/trailing whitespace
            .replace(/[ \t]+$/gm, '')       // Remove trailing spaces on each line
            .replace(/\n\s*\n\s*\n/g, '\n\n'); // Clean up lines with only whitespace
        
        const message = {
            type,
            content: cleanContent,
            timestamp: new Date()
        };
        
        this.messages.push(message);
        
        this.sendToWebview({
            type: 'message',
            messageType: type,
            content: cleanContent,
            timestamp: message.timestamp.toLocaleTimeString()
        });
    }

    private sendToWebview(data: any) {
        this._panel?.webview.postMessage(data);
    }

    private getVersion(): string {
        try {
            const packagePath = path.join(this._extensionUri.fsPath, 'package.json');
            const fs = require('fs');
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            return packageJson.version || '0.1.0';
        } catch (error) {
            console.error('Failed to read version from package.json:', error);
            return '0.1.0';
        }
    }

    private getHtmlForWebview(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Discord Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-panel-background);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .status-indicators {
            display: flex;
            gap: 12px;
        }

        .claude-status, .discord-status {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .claude-status.connected {
            background-color: rgba(46, 204, 113, 0.1);
            color: #2ecc71;
            border: 1px solid rgba(46, 204, 113, 0.3);
        }

        .claude-status.disconnected {
            background-color: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border: 1px solid rgba(231, 76, 60, 0.3);
        }

        .discord-status.connected {
            background-color: rgba(100, 149, 237, 0.1);
            color: #6495ed;
            border: 1px solid rgba(100, 149, 237, 0.3);
        }

        .discord-status.disconnected {
            background-color: rgba(128, 128, 128, 0.1);
            color: #808080;
            border: 1px solid rgba(128, 128, 128, 0.3);
        }

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            font-size: 14px;
        }

        .message {
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid;
            word-wrap: break-word;
        }

        .message.user {
            background-color: rgba(100, 149, 237, 0.1);
            border-left-color: #6495ed;
        }

        .message.claude {
            background-color: rgba(46, 204, 113, 0.1);
            border-left-color: #2ecc71;
        }

        .message.discord {
            background-color: rgba(114, 137, 218, 0.1);
            border-left-color: #7289da;
        }

        .message.system {
            background-color: rgba(128, 128, 128, 0.1);
            border-left-color: #808080;
            font-style: italic;
        }

        .message.error {
            background-color: rgba(231, 76, 60, 0.1);
            border-left-color: #e74c3c;
        }

        .message.thinking {
            background-color: rgba(255, 193, 7, 0.1);
            border-left-color: #ffc107;
            font-style: italic;
        }

        .message.tool_use {
            background-color: rgba(100, 149, 237, 0.1);
            border-left-color: #6495ed;
        }

        .message.tool_result {
            background-color: rgba(40, 167, 69, 0.1);
            border-left-color: #28a745;
        }

        .message.assistant {
            background-color: rgba(46, 204, 113, 0.1);
            border-left-color: #2ecc71;
        }

        .message-header {
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .message-timestamp {
            font-size: 11px;
            opacity: 0.7;
            font-weight: normal;
        }

        .message-content {
            white-space: pre-line;
            line-height: 1.4;
            margin-top: 0;
        }

        .message-content:empty {
            display: none;
        }

        .input-container {
            padding: 16px 20px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-panel-background);
        }

        .input-row {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .input-field {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: 14px;
        }

        .btn {
            padding: 8px 16px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: transparent;
            color: var(--vscode-foreground);
            border-color: var(--vscode-panel-border);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

    </style>
</head>
<body>
    <div class="header">
        <h2>Claude Discord Chat</h2>
        <div class="status-indicators">
            <div id="claudeStatus" class="claude-status connected">
                <span>●</span>
                <span>Claude Ready</span>
            </div>
            <div id="discordStatus" class="discord-status disconnected">
                <span>●</span>
                <span>Discord Disconnected</span>
            </div>
        </div>
    </div>
    
    <div class="chat-container">
        <div id="messages" class="messages">
            <div class="message system">
                <div class="message-header">
                    System
                    <span class="message-timestamp" id="welcomeTime"></span>
                </div>
                Welcome to Claude Discord Chat v${this.getVersion()}! Start a conversation below.
                
                💡 **Quick Start:** Type /config to set up Discord integration, or /help for available commands.
            </div>
        </div>
        
        <div class="input-container">
            <div class="input-row">
                <input type="text" id="messageInput" class="input-field" placeholder="Type your message..." />
                <button id="sendBtn" class="btn btn-primary">Send</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const discordStatus = document.getElementById('discordStatus');
        const claudeStatus = document.getElementById('claudeStatus');

        // Set welcome timestamp
        document.getElementById('welcomeTime').textContent = new Date().toLocaleTimeString();

        function addMessage(type, content, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            let typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            let icon = '';
            
            switch(type) {
                case 'user':
                    typeLabel = 'You';
                    icon = '👤';
                    break;
                case 'assistant':
                    typeLabel = 'Claude AI';
                    icon = '🤖';
                    break;
                case 'discord':
                    typeLabel = 'Discord';
                    icon = '💬';
                    break;
                case 'thinking':
                    typeLabel = 'Claude (thinking)';
                    icon = '💭';
                    break;
                case 'tool_use':
                    typeLabel = 'Tool Execution';
                    icon = '🔧';
                    break;
                case 'tool_result':
                    typeLabel = 'Tool Result';
                    icon = '📋';
                    break;
                case 'system':
                    typeLabel = 'System';
                    icon = 'ℹ️';
                    break;
                case 'error':
                    typeLabel = 'Error';
                    icon = '❌';
                    break;
            }
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = content; // Use textContent to preserve formatting and prevent XSS
            
            messageDiv.innerHTML = \`
                <div class="message-header">
                    \${icon} \${typeLabel}
                    <span class="message-timestamp">\${timestamp}</span>
                </div>
            \`;
            messageDiv.appendChild(messageContent);
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function sendMessage() {
            const content = messageInput.value.trim();
            if (content) {
                vscode.postMessage({
                    type: 'sendMessage',
                    content: content
                });
                messageInput.value = '';
            }
        }

        sendBtn.addEventListener('click', sendMessage);

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'message':
                    addMessage(message.messageType, message.content, message.timestamp);
                    break;
                    
                case 'discordStatus':
                    if (message.connected) {
                        discordStatus.className = 'discord-status connected';
                        discordStatus.innerHTML = '<span>●</span><span>Discord Connected</span>';
                    } else {
                        discordStatus.className = 'discord-status disconnected';
                        discordStatus.innerHTML = '<span>●</span><span>Discord Disconnected</span>';
                    }
                    break;
                    
                case 'processing':
                    // Update UI based on Claude processing state
                    const inputField = document.getElementById('messageInput');
                    const sendBtn = document.getElementById('sendBtn');
                    
                    if (message.processing) {
                        inputField.disabled = true;
                        sendBtn.disabled = true;
                        sendBtn.textContent = 'Processing...';
                        claudeStatus.className = 'claude-status connected';
                        claudeStatus.innerHTML = '<span>●</span><span>Claude Processing...</span>';
                    } else {
                        inputField.disabled = false;
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Send';
                        claudeStatus.className = 'claude-status connected';
                        claudeStatus.innerHTML = '<span>●</span><span>Claude Ready</span>';
                    }
                    break;
                    
                case 'sessionInfo':
                    console.log('Session info updated:', message.sessionId);
                    break;
                    
                case 'tokensUpdate':
                    console.log('Tokens updated:', message.tokens);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose() {
        if (this._panel) {
            this._panel.dispose();
            this._panel = undefined;
        }

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}