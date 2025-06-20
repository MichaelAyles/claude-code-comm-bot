import * as vscode from 'vscode';
import { Client, GatewayIntentBits, Message, TextChannel, User } from 'discord.js';

export interface DiscordMessage {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
    };
    timestamp: Date;
}

export class DiscordService implements vscode.Disposable {
    private client: Client | null = null;
    private _onStatusChange = new vscode.EventEmitter<boolean>();
    private _onMessageReceived = new vscode.EventEmitter<DiscordMessage>();
    
    public readonly onStatusChange = this._onStatusChange.event;
    public readonly onMessageReceived = this._onMessageReceived.event;

    constructor() {
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('claude-discord-chat.discord')) {
                this.handleConfigChange();
            }
        });
    }

    private async handleConfigChange() {
        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const enabled = config.get<boolean>('enabled');
        
        if (enabled && !this.isConnected()) {
            try {
                await this.connect();
            } catch (error) {
                console.error('Auto-reconnect failed:', error);
            }
        } else if (!enabled && this.isConnected()) {
            this.disconnect();
        }
    }

    public async connect(): Promise<void> {
        if (this.client) {
            this.disconnect();
        }

        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const token = config.get<string>('botToken');

        if (!token) {
            throw new Error('Discord bot token not configured. Please set it in VS Code settings.');
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.setupEventHandlers();

        try {
            await this.client.login(token);
        } catch (error) {
            this.client = null;
            throw error;
        }
    }

    private setupEventHandlers() {
        if (!this.client) return;

        this.client.on('ready', () => {
            console.log(`Discord bot logged in as ${this.client?.user?.tag}`);
            console.log('Bot user ID:', this.client?.user?.id);
            console.log('Discord intents:', this.client?.options.intents);
            this._onStatusChange.fire(true);
        });

        this.client.on('messageCreate', (message: Message) => {
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

    private handleIncomingMessage(message: Message) {
        // Skip bot messages
        if (message.author.bot) return;

        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const channelId = config.get<string>('channelId');
        const userId = config.get<string>('userId');

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

        const discordMessage: DiscordMessage = {
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

    public async sendMessage(content: string, urgent: boolean = false): Promise<void> {
        if (!this.client?.isReady()) {
            throw new Error('Discord bot is not connected');
        }

        const config = vscode.workspace.getConfiguration('claude-discord-chat.discord');
        const channelId = config.get<string>('channelId');
        const userId = config.get<string>('userId');

        let target: TextChannel | User | null = null;

        if (channelId) {
            target = await this.client.channels.fetch(channelId) as TextChannel;
        } else if (userId) {
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

    public isConnected(): boolean {
        return this.client?.isReady() ?? false;
    }

    public disconnect() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
            this._onStatusChange.fire(false);
        }
    }

    public dispose() {
        this.disconnect();
        this._onStatusChange.dispose();
        this._onMessageReceived.dispose();
    }
}