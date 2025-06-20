"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const DiscordService_1 = require("./discord/DiscordService");
const ClaudeService_1 = require("./claude/ClaudeService");
const ChatProvider_1 = require("./webview/ChatProvider");
let discordService;
let claudeService;
let chatProvider;
function activate(context) {
    console.log('Claude Discord Chat extension is now active!');
    // Initialize services
    discordService = new DiscordService_1.DiscordService();
    claudeService = new ClaudeService_1.ClaudeService();
    chatProvider = new ChatProvider_1.ChatProvider(context.extensionUri, discordService, claudeService);
    // Register commands
    const openChatCommand = vscode.commands.registerCommand('claude-discord-chat.openChat', () => {
        chatProvider.show();
    });
    const connectDiscordCommand = vscode.commands.registerCommand('claude-discord-chat.connectDiscord', async () => {
        try {
            await discordService.connect();
            vscode.window.showInformationMessage('Connected to Discord!');
        }
        catch (error) {
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
    discordService.onStatusChange((connected) => {
        if (connected) {
            discordStatusItem.text = "$(vm-active) Discord";
            discordStatusItem.tooltip = "Discord: Connected";
            discordStatusItem.backgroundColor = undefined;
        }
        else {
            discordStatusItem.text = "$(plug) Discord";
            discordStatusItem.tooltip = "Discord: Disconnected";
            discordStatusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    });
    // Auto-connect if configured
    const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
    if (config.get('enabled') && config.get('botToken')) {
        discordService.connect().catch(console.error);
    }
    context.subscriptions.push(openChatCommand, connectDiscordCommand, disconnectDiscordCommand, statusBarItem, discordStatusItem, discordService, claudeService, chatProvider);
}
function deactivate() {
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
//# sourceMappingURL=extension.js.map