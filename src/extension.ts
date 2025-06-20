import * as vscode from 'vscode';
import { DiscordService } from './discord/DiscordService';
import { ClaudeService } from './claude/ClaudeService';
import { ChatProvider } from './webview/ChatProvider';

let discordService: DiscordService;
let claudeService: ClaudeService;
let chatProvider: ChatProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Claude Discord Chat extension is now active!');

    // Initialize services
    discordService = new DiscordService();
    claudeService = new ClaudeService();
    chatProvider = new ChatProvider(context.extensionUri, discordService, claudeService);

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('claude-discord-chat.openChat', () => {
        chatProvider.show();
    });

    const connectDiscordCommand = vscode.commands.registerCommand('claude-discord-chat.connectDiscord', async () => {
        try {
            await discordService.connect();
            vscode.window.showInformationMessage('Connected to Discord!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect to Discord: ${error}`);
        }
    });

    const disconnectDiscordCommand = vscode.commands.registerCommand('claude-discord-chat.disconnectDiscord', () => {
        discordService.disconnect();
        vscode.window.showInformationMessage('Disconnected from Discord');
    });

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(comment-discussion) Claude Chat";
    statusBarItem.tooltip = "Open Claude Discord Chat";
    statusBarItem.command = 'claude-discord-chat.openChat';
    statusBarItem.show();

    // Discord status item
    const discordStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    discordStatusItem.text = "$(plug) Discord";
    discordStatusItem.tooltip = "Discord: Disconnected";
    discordStatusItem.command = 'claude-discord-chat.connectDiscord';
    discordStatusItem.show();

    // Update Discord status
    discordService.onStatusChange((connected: boolean) => {
        if (connected) {
            discordStatusItem.text = "$(vm-active) Discord";
            discordStatusItem.tooltip = "Discord: Connected";
            discordStatusItem.backgroundColor = undefined;
        } else {
            discordStatusItem.text = "$(plug) Discord";
            discordStatusItem.tooltip = "Discord: Disconnected";
            discordStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    });

    // Auto-connect if configured
    const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
    if (config.get<boolean>('enabled') && config.get<string>('botToken')) {
        discordService.connect().catch(console.error);
    }

    context.subscriptions.push(
        openChatCommand,
        connectDiscordCommand,
        disconnectDiscordCommand,
        statusBarItem,
        discordStatusItem,
        discordService,
        claudeService,
        chatProvider
    );
}

export function deactivate() {
    if (discordService) {
        discordService.disconnect();
    }
    if (claudeService) {
        claudeService.dispose();
    }
    if (chatProvider) {
        chatProvider.dispose();
    }
}