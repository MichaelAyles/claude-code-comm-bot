import * as vscode from 'vscode';
import * as cp from 'child_process';

export interface ClaudeMessage {
    type: 'user' | 'assistant' | 'system' | 'thinking' | 'tool_use' | 'tool_result' | 'error';
    content: string;
    timestamp: Date;
    metadata?: any;
}

export interface ClaudeSession {
    sessionId: string;
    startTime: Date;
    messages: ClaudeMessage[];
    totalCost: number;
    totalTokensInput: number;
    totalTokensOutput: number;
}

export class ClaudeService implements vscode.Disposable {
    private _onMessageReceived = new vscode.EventEmitter<ClaudeMessage>();
    private _onSessionChanged = new vscode.EventEmitter<string>();
    private _onProcessingChanged = new vscode.EventEmitter<boolean>();
    private _onTokensUpdated = new vscode.EventEmitter<{input: number, output: number, cost: number}>();
    
    public readonly onMessageReceived = this._onMessageReceived.event;
    public readonly onSessionChanged = this._onSessionChanged.event;
    public readonly onProcessingChanged = this._onProcessingChanged.event;
    public readonly onTokensUpdated = this._onTokensUpdated.event;

    private currentSession: ClaudeSession | null = null;
    private currentProcess: cp.ChildProcess | null = null;
    private isProcessing = false;
    private terminal: vscode.Terminal | null = null;

    constructor() {
        // Initialize session management
        this.loadLatestSession();
    }

    public async sendMessage(message: string): Promise<void> {
        if (this.isProcessing) {
            throw new Error('Claude is already processing a message');
        }

        try {
            this.setProcessing(true);
            
            // Add user message to session
            this.addMessageToSession({
                type: 'user',
                content: message,
                timestamp: new Date()
            });

            await this.executeClaudeCommand(message);
        } catch (error) {
            this.setProcessing(false);
            this.addMessageToSession({
                type: 'error',
                content: `Error: ${error}`,
                timestamp: new Date()
            });
            throw error;
        }
    }

    private async executeClaudeCommand(message: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

        // Create or reuse terminal for Claude
        if (!this.terminal || this.terminal.exitStatus !== undefined) {
            this.terminal = vscode.window.createTerminal({
                name: 'Claude Code',
                cwd: cwd,
                iconPath: new vscode.ThemeIcon('robot'),
                isTransient: false
            });
        }

        // Show the terminal
        this.terminal.show(true);

        // Build command arguments
        const args = [
            '-p',
            '--output-format', 'stream-json',
            '--verbose',
            '--dangerously-skip-permissions'
        ];

        // Add session resume if we have a current session
        if (this.currentSession?.sessionId) {
            args.push('--resume', this.currentSession.sessionId);
            console.log('Resuming session:', this.currentSession.sessionId);
        } else {
            console.log('Starting new session');
        }

        console.log('Claude command args:', args);

        // Build full command for terminal display
        const fullCommand = `claude ${args.join(' ')}`;
        
        // Send command to terminal for visual feedback
        this.terminal.sendText(`echo "🤖 Starting Claude Code..."`);
        this.terminal.sendText(`echo "Command: ${fullCommand}"`);
        this.terminal.sendText(`echo "Message: ${message}"`);
        this.terminal.sendText(`echo ""`);

        // Spawn Claude process for JSON parsing
        this.currentProcess = cp.spawn('claude', args, {
            cwd: cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                FORCE_COLOR: '0',
                NO_COLOR: '1'
            }
        });

        // Send message to Claude's stdin (background process for JSON parsing)
        if (this.currentProcess.stdin) {
            this.currentProcess.stdin.write(message + '\n');
            this.currentProcess.stdin.end();
        }

        // Run interactive command in terminal for live output (this will prompt for input)
        this.terminal.sendText(fullCommand);

        let rawOutput = '';
        let errorOutput = '';

        // Process stdout stream for JSON parsing
        if (this.currentProcess.stdout) {
            this.currentProcess.stdout.on('data', (data) => {
                rawOutput += data.toString();
                this.processJsonStream(rawOutput);
                // Keep only incomplete lines for next chunk
                const lines = rawOutput.split('\n');
                rawOutput = lines.pop() || '';
            });
        }

        // Process stderr stream
        if (this.currentProcess.stderr) {
            this.currentProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
                console.log('Claude stderr:', data.toString());
            });
        }

        // Handle process completion
        this.currentProcess.on('close', (code) => {
            console.log('Claude process closed with code:', code);
            console.log('Claude stderr output:', errorOutput);

            this.currentProcess = null;
            this.setProcessing(false);

            if (code !== 0 && errorOutput.trim()) {
                this.addMessageToSession({
                    type: 'error',
                    content: errorOutput.trim(),
                    timestamp: new Date()
                });
            }
        });

        // Handle process errors
        this.currentProcess.on('error', (error) => {
            console.log('Claude process error:', error.message);
            this.currentProcess = null;
            this.setProcessing(false);

            if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
                this.addMessageToSession({
                    type: 'error',
                    content: 'Claude Code CLI not found. Please install Claude Code first: https://www.anthropic.com/claude-code',
                    timestamp: new Date()
                });
            } else {
                this.addMessageToSession({
                    type: 'error',
                    content: `Error running Claude: ${error.message}`,
                    timestamp: new Date()
                });
            }
        });
    }

    private processJsonStream(rawOutput: string): void {
        const lines = rawOutput.split('\n');
        
        for (const line of lines) {
            if (line.trim()) {
                try {
                    const jsonData = JSON.parse(line.trim());
                    this.processJsonData(jsonData);
                } catch (error) {
                    console.log('Failed to parse JSON line:', line, error);
                }
            }
        }
    }

    private processJsonData(jsonData: any): void {
        console.log('Received JSON data:', jsonData);

        switch (jsonData.type) {
            case 'system':
                if (jsonData.subtype === 'init') {
                    console.log('System initialized');
                }
                break;

            case 'assistant':
                if (jsonData.message && jsonData.message.content) {
                    // Track token usage if available
                    if (jsonData.message.usage) {
                        this._onTokensUpdated.fire({
                            input: jsonData.message.usage.input_tokens || 0,
                            output: jsonData.message.usage.output_tokens || 0,
                            cost: 0 // Will be updated in result
                        });
                    }

                    // Process each content item
                    for (const content of jsonData.message.content) {
                        if (content.type === 'text' && content.text.trim()) {
                            this.addMessageToSession({
                                type: 'assistant',
                                content: content.text.trim(),
                                timestamp: new Date()
                            });
                        } else if (content.type === 'thinking' && content.thinking.trim()) {
                            this.addMessageToSession({
                                type: 'thinking',
                                content: content.thinking.trim(),
                                timestamp: new Date()
                            });
                        } else if (content.type === 'tool_use') {
                            this.addMessageToSession({
                                type: 'tool_use',
                                content: `🔧 Executing: ${content.name}`,
                                timestamp: new Date(),
                                metadata: {
                                    toolName: content.name,
                                    toolInput: content.input
                                }
                            });
                        }
                    }
                }
                break;

            case 'user':
                if (jsonData.message && jsonData.message.content) {
                    // Process tool results
                    for (const content of jsonData.message.content) {
                        if (content.type === 'tool_result') {
                            const resultContent = content.content || 'Tool executed successfully';
                            const isError = content.is_error || false;

                            this.addMessageToSession({
                                type: 'tool_result',
                                content: isError ? `❌ Tool Error: ${resultContent}` : `✅ ${resultContent}`,
                                timestamp: new Date(),
                                metadata: {
                                    isError: isError,
                                    toolUseId: content.tool_use_id
                                }
                            });
                        }
                    }
                }
                break;

            case 'result':
                if (jsonData.subtype === 'success') {
                    // Handle login errors
                    if (jsonData.is_error && jsonData.result && jsonData.result.includes('Invalid API key')) {
                        this.addMessageToSession({
                            type: 'error',
                            content: '🔐 Login Required: Your Claude API key is invalid or expired. Please run `claude login` in terminal.',
                            timestamp: new Date()
                        });
                        return;
                    }

                    // Capture session ID
                    if (jsonData.session_id) {
                        const isNewSession = !this.currentSession?.sessionId;
                        
                        if (isNewSession || this.currentSession?.sessionId !== jsonData.session_id) {
                            if (!this.currentSession) {
                                this.currentSession = {
                                    sessionId: jsonData.session_id,
                                    startTime: new Date(),
                                    messages: [],
                                    totalCost: 0,
                                    totalTokensInput: 0,
                                    totalTokensOutput: 0
                                };
                            } else {
                                this.currentSession.sessionId = jsonData.session_id;
                            }
                            
                            this._onSessionChanged.fire(jsonData.session_id);
                            console.log('Session ID updated:', jsonData.session_id);
                        }
                    }

                    // Update costs and tokens
                    if (this.currentSession) {
                        if (jsonData.total_cost_usd) {
                            this.currentSession.totalCost += jsonData.total_cost_usd;
                        }
                        // Token counts will be updated from usage events
                    }

                    this._onTokensUpdated.fire({
                        input: this.currentSession?.totalTokensInput || 0,
                        output: this.currentSession?.totalTokensOutput || 0,
                        cost: jsonData.total_cost_usd || 0
                    });

                    console.log('Request completed:', {
                        cost: jsonData.total_cost_usd,
                        duration: jsonData.duration_ms,
                        turns: jsonData.num_turns
                    });
                }
                break;
        }
    }

    private addMessageToSession(message: ClaudeMessage): void {
        if (!this.currentSession) {
            this.currentSession = {
                sessionId: '',
                startTime: new Date(),
                messages: [],
                totalCost: 0,
                totalTokensInput: 0,
                totalTokensOutput: 0
            };
        }

        this.currentSession.messages.push(message);
        this._onMessageReceived.fire(message);

        // Auto-save session
        this.saveSession();
    }

    private setProcessing(processing: boolean): void {
        this.isProcessing = processing;
        this._onProcessingChanged.fire(processing);
    }

    public stopCurrentRequest(): void {
        if (this.currentProcess) {
            console.log('Stopping Claude process...');
            
            // Send Ctrl+C to terminal to stop the interactive process
            if (this.terminal) {
                this.terminal.sendText('\x03'); // Ctrl+C
            }
            
            this.currentProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (this.currentProcess && !this.currentProcess.killed) {
                    console.log('Force killing Claude process...');
                    this.currentProcess.kill('SIGKILL');
                }
            }, 2000);

            this.currentProcess = null;
            this.setProcessing(false);

            this.addMessageToSession({
                type: 'system',
                content: '⏹️ Request stopped by user',
                timestamp: new Date()
            });
        }
    }

    public newSession(): void {
        this.currentSession = {
            sessionId: '',
            startTime: new Date(),
            messages: [],
            totalCost: 0,
            totalTokensInput: 0,
            totalTokensOutput: 0
        };

        this._onSessionChanged.fire('');
        console.log('Started new session');
    }

    public getCurrentSession(): ClaudeSession | null {
        return this.currentSession;
    }

    public isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    private async saveSession(): Promise<void> {
        // TODO: Implement session persistence to workspace storage
        // This would save conversations as JSON files similar to the original
        console.log('Session auto-save (not implemented yet)');
    }

    private async loadLatestSession(): Promise<void> {
        // TODO: Implement loading latest session from workspace storage
        console.log('Loading latest session (not implemented yet)');
    }

    public dispose(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
        }
        
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
        
        this._onMessageReceived.dispose();
        this._onSessionChanged.dispose();
        this._onProcessingChanged.dispose();
        this._onTokensUpdated.dispose();
    }
}