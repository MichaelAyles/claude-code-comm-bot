import * as vscode from 'vscode';
import { DiscordService, DiscordMessage } from '../discord/DiscordService';
import { ClaudeService, ClaudeMessage } from '../claude/ClaudeService';

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
                    case 'sendToDiscord':
                        this.handleSendToDiscord(message.content, message.urgent);
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
            const timestamp = new Date().toLocaleTimeString();
            this._discordService.sendMessage(`[${timestamp}] ${content}`).catch(console.error);
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
        } else {
            this.addMessage('system', `Unknown command: ${command}. Type /help for available commands.`);
        }
    }

    private async startConfigurationWizard() {
        this.addMessage('system', `🔧 **Discord Configuration Wizard**

Let me guide you through setting up Discord integration step by step.

**Step 1: Discord Bot Setup**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section
4. Copy your bot token

Once you have your bot token, I'll help you configure it...`);

        // Request bot token
        const tokenInput = await vscode.window.showInputBox({
            prompt: 'Enter your Discord bot token',
            password: true,
            placeHolder: 'Your bot token from Discord Developer Portal'
        });

        if (!tokenInput) {
            this.addMessage('system', '❌ Configuration cancelled. You can restart with /config anytime.');
            return;
        }

        // Save bot token
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        await config.update('botToken', tokenInput, vscode.ConfigurationTarget.Global);
        await config.update('enabled', true, vscode.ConfigurationTarget.Global);

        this.addMessage('system', `✅ Bot token saved!

**Step 2: Choose Message Filtering**
You can configure the bot to:
- **Option A**: Listen to a specific Discord channel
- **Option B**: Only respond to your direct messages
- **Option C**: Listen to all messages (not recommended for production)

Which would you prefer?`);

        const filterChoice = await vscode.window.showQuickPick([
            { label: 'Specific Channel', description: 'Listen only to messages in one Discord channel', value: 'channel' },
            { label: 'Direct Messages Only', description: 'Only respond to DMs from you', value: 'user' },
            { label: 'All Messages', description: 'Listen to all messages (testing only)', value: 'all' }
        ], {
            placeHolder: 'Choose how to filter Discord messages'
        });

        if (!filterChoice) {
            this.addMessage('system', '❌ Configuration cancelled. Your bot token is saved, but message filtering is not configured.');
            return;
        }

        if (filterChoice.value === 'channel') {
            await this.configureChannelId();
        } else if (filterChoice.value === 'user') {
            await this.configureUserId();
        } else {
            // Clear both IDs for all messages
            await config.update('channelId', '', vscode.ConfigurationTarget.Global);
            await config.update('userId', '', vscode.ConfigurationTarget.Global);
            this.addMessage('system', '⚠️ **All Messages Mode**: Bot will listen to all Discord messages. This is recommended for testing only!');
        }

        // Test connection
        this.addMessage('system', `🔌 **Testing Discord connection...**`);

        try {
            await this._discordService.connect();
            this.addMessage('system', `🎉 **Configuration Complete!**

✅ Discord bot connected successfully
✅ Message filtering configured
✅ Auto-mirroring enabled

**Next Steps:**
1. Invite your bot to your Discord server with proper permissions:
   - Send Messages
   - Read Message History
   - View Channel
2. Test by sending a message in your configured channel/DM
3. Type /status to check connection details

**Quick Commands:**
- \`/help\` - Show available commands
- \`/status\` - Show connection status
- \`/config\` - Re-run this setup wizard`);

        } catch (error) {
            this.addMessage('error', `❌ **Connection Failed**: ${error}

Please check:
1. Bot token is correct
2. Bot has proper permissions (Message Content Intent enabled)
3. Bot is invited to your server

You can re-run /config to try again.`);
        }
    }

    private async configureChannelId() {
        this.addMessage('system', `📋 **Channel Configuration**

To get your Discord channel ID:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on your desired channel
3. Click "Copy ID"
4. Paste it here

**Note**: Make sure your bot has permission to view and send messages in this channel!`);

        const channelId = await vscode.window.showInputBox({
            prompt: 'Enter Discord Channel ID',
            placeHolder: 'Right-click channel → Copy ID',
            validateInput: (value) => {
                if (!value) return 'Channel ID is required';
                if (!/^\d+$/.test(value)) return 'Channel ID should only contain numbers';
                if (value.length < 17 || value.length > 20) return 'Channel ID should be 17-20 digits';
                return null;
            }
        });

        if (channelId) {
            const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
            await config.update('channelId', channelId, vscode.ConfigurationTarget.Global);
            await config.update('userId', '', vscode.ConfigurationTarget.Global); // Clear user ID
            this.addMessage('system', `✅ Channel ID configured: ${channelId}`);
        }
    }

    private async configureUserId() {
        this.addMessage('system', `👤 **User Configuration**

To get your Discord user ID:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on your username/avatar
3. Click "Copy ID"
4. Paste it here

**Note**: The bot will only respond to direct messages from this user ID.`);

        const userId = await vscode.window.showInputBox({
            prompt: 'Enter your Discord User ID',
            placeHolder: 'Right-click your username → Copy ID',
            validateInput: (value) => {
                if (!value) return 'User ID is required';
                if (!/^\d+$/.test(value)) return 'User ID should only contain numbers';
                if (value.length < 17 || value.length > 20) return 'User ID should be 17-20 digits';
                return null;
            }
        });

        if (userId) {
            const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
            await config.update('userId', userId, vscode.ConfigurationTarget.Global);
            await config.update('channelId', '', vscode.ConfigurationTarget.Global); // Clear channel ID
            this.addMessage('system', `✅ User ID configured: ${userId}`);
        }
    }

    private showHelp() {
        this.addMessage('system', `🆘 **Available Commands**

**Claude AI:**
- \`/stop\` - Stop current Claude request
- \`/new\` or \`/newsession\` - Start new Claude session
- \`/session\` - Show current session info

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
- Check status bar for connection indicators`);
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

    private async handleSendToDiscord(content: string, urgent: boolean = false) {
        try {
            await this._discordService.sendMessage(content, urgent);
            this.addMessage('system', `Message sent to Discord${urgent ? ' (urgent)' : ''}`);
        } catch (error) {
            this.addMessage('error', `Failed to send to Discord: ${error}`);
        }
    }

    private addMessage(type: string, content: string) {
        const message = {
            type,
            content,
            timestamp: new Date()
        };
        
        this.messages.push(message);
        
        this.sendToWebview({
            type: 'message',
            messageType: type,
            content: content,
            timestamp: message.timestamp.toLocaleTimeString()
        });
    }

    private sendToWebview(data: any) {
        this._panel?.webview.postMessage(data);
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

        .discord-status {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .discord-status.connected {
            background-color: rgba(46, 204, 113, 0.1);
            color: #2ecc71;
            border: 1px solid rgba(46, 204, 113, 0.3);
        }

        .discord-status.disconnected {
            background-color: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border: 1px solid rgba(231, 76, 60, 0.3);
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

        .btn-urgent {
            background-color: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
            border-color: rgba(231, 76, 60, 0.3);
        }

        .btn-urgent:hover {
            background-color: rgba(231, 76, 60, 0.2);
        }

        .discord-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Claude Discord Chat</h2>
        <div id="discordStatus" class="discord-status disconnected">
            <span>●</span>
            <span>Discord Disconnected</span>
        </div>
    </div>
    
    <div class="chat-container">
        <div id="messages" class="messages">
            <div class="message system">
                <div class="message-header">
                    System
                    <span class="message-timestamp" id="welcomeTime"></span>
                </div>
                Welcome to Claude Discord Chat! Start a conversation below.
                
                💡 **Quick Start:** Type /config to set up Discord integration, or /help for available commands.
            </div>
        </div>
        
        <div class="input-container">
            <div class="input-row">
                <input type="text" id="messageInput" class="input-field" placeholder="Type your message..." />
                <button id="sendBtn" class="btn btn-primary">Send</button>
            </div>
            <div class="discord-controls">
                <input type="text" id="discordInput" class="input-field" placeholder="Send message to Discord..." />
                <button id="sendDiscordBtn" class="btn btn-secondary">Send to Discord</button>
                <button id="sendUrgentBtn" class="btn btn-urgent">Send Urgent</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const discordInput = document.getElementById('discordInput');
        const sendBtn = document.getElementById('sendBtn');
        const sendDiscordBtn = document.getElementById('sendDiscordBtn');
        const sendUrgentBtn = document.getElementById('sendUrgentBtn');
        const discordStatus = document.getElementById('discordStatus');

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
            
            messageDiv.innerHTML = \`
                <div class="message-header">
                    \${icon} \${typeLabel}
                    <span class="message-timestamp">\${timestamp}</span>
                </div>
                \${content}
            \`;
            
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

        function sendToDiscord(urgent = false) {
            const content = discordInput.value.trim();
            if (content) {
                vscode.postMessage({
                    type: 'sendToDiscord',
                    content: content,
                    urgent: urgent
                });
                discordInput.value = '';
            }
        }

        sendBtn.addEventListener('click', sendMessage);
        sendDiscordBtn.addEventListener('click', () => sendToDiscord(false));
        sendUrgentBtn.addEventListener('click', () => sendToDiscord(true));

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        discordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendToDiscord(e.shiftKey);
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
                    } else {
                        inputField.disabled = false;
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Send';
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