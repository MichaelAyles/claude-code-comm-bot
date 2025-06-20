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
exports.DiscordService = void 0;
const vscode = __importStar(require("vscode"));
const discord_js_1 = require("discord.js");
class DiscordService {
    client = null;
    _onStatusChange = new vscode.EventEmitter();
    _onMessageReceived = new vscode.EventEmitter();
    onStatusChange = this._onStatusChange.event;
    onMessageReceived = this._onMessageReceived.event;
    constructor() {
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('claude-discord-chat.discord')) {
                this.handleConfigChange();
            }
        });
    }
    async handleConfigChange() {
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const enabled = config.get('enabled');
        if (enabled && !this.isConnected()) {
            try {
                await this.connect();
            }
            catch (error) {
                console.error('Auto-reconnect failed:', error);
            }
        }
        else if (!enabled && this.isConnected()) {
            this.disconnect();
        }
    }
    async connect() {
        if (this.client) {
            this.disconnect();
        }
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const token = config.get('botToken');
        if (!token) {
            throw new Error('Discord bot token not configured. Please set it in VS Code settings.');
        }
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.DirectMessages
            ]
        });
        this.setupEventHandlers();
        try {
            await this.client.login(token);
        }
        catch (error) {
            this.client = null;
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.client)
            return;
        this.client.on('ready', () => {
            console.log(`Discord bot logged in as ${this.client?.user?.tag}`);
            console.log('Bot user ID:', this.client?.user?.id);
            console.log('Discord intents:', this.client?.options.intents);
            this._onStatusChange.fire(true);
        });
        this.client.on('messageCreate', (message) => {
            console.log('messageCreate event fired!', {
                messageId: message.id,
                content: message.content,
                author: message.author.username,
                isBot: message.author.bot,
                channelId: message.channelId
            });
            this.handleIncomingMessage(message);
        });
        this.client.on('error', (error) => {
            console.error('Discord client error:', error);
            vscode.window.showErrorMessage(`Discord error: ${error.message}`);
        });
        this.client.on('disconnect', () => {
            this._onStatusChange.fire(false);
        });
    }
    handleIncomingMessage(message) {
        // Skip bot messages
        if (message.author.bot)
            return;
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const channelId = config.get('channelId');
        const userId = config.get('userId');
        // Debug logging
        console.log('Received Discord message:', {
            messageId: message.id,
            channelId: message.channelId,
            authorId: message.author.id,
            authorUsername: message.author.username,
            content: message.content,
            configChannelId: channelId,
            configUserId: userId
        });
        // Filter messages based on configuration
        if (channelId && message.channelId !== channelId) {
            console.log(`Message filtered out: wrong channel. Expected: ${channelId}, Got: ${message.channelId}`);
            return;
        }
        if (userId && message.author.id !== userId) {
            console.log(`Message filtered out: wrong user. Expected: ${userId}, Got: ${message.author.id}`);
            return;
        }
        // If no configuration is set, accept all messages (for testing)
        if (!channelId && !userId) {
            console.log('No channel or user filter configured, accepting all messages');
        }
        const discordMessage = {
            id: message.id,
            content: message.content,
            author: {
                id: message.author.id,
                username: message.author.username
            },
            timestamp: message.createdAt
        };
        console.log('Firing message received event:', discordMessage);
        this._onMessageReceived.fire(discordMessage);
    }
    async sendMessage(content, urgent = false) {
        if (!this.client?.isReady()) {
            throw new Error('Discord bot is not connected');
        }
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const channelId = config.get('channelId');
        const userId = config.get('userId');
        let target = null;
        if (channelId) {
            target = await this.client.channels.fetch(channelId);
        }
        else if (userId) {
            target = await this.client.users.fetch(userId);
        }
        if (!target) {
            throw new Error('No Discord channel or user configured');
        }
        const formattedMessage = urgent ? `🚨 **${content}** 🚨` : content;
        if ('send' in target) {
            await target.send(formattedMessage);
        }
    }
    isConnected() {
        return this.client?.isReady() ?? false;
    }
    disconnect() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
            this._onStatusChange.fire(false);
        }
    }
    dispose() {
        this.disconnect();
        this._onStatusChange.dispose();
        this._onMessageReceived.dispose();
    }
}
exports.DiscordService = DiscordService;
//# sourceMappingURL=DiscordService.js.map