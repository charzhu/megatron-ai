import { PersistentAgentAdapter } from './PersistentAgentAdapter';
import { ANSI_RE } from '../utils/textParsing';

// Claude CLI process line prefixes: spinning indicator (⏺), bullets (•), tree chars (└│├)
const CLAUDE_PROCESS_LINE_RE = /^[⏺●•└│├]/;

export class ClaudeCodeAdapter extends PersistentAgentAdapter {
    constructor(id: string = 'claude-code', name: string = '🦖 Claude Code', modelFlag: string = '', modes?: string[]) {
        super(id, name, modelFlag, '>', modes);
    }

    protected shouldUsePersistentSession(mode: string): boolean {
        return false;
    }

    protected shouldUseStructuredOutput(mode: string): boolean {
        return mode === 'plan' || mode === 'agent';
    }

    protected getNonInteractiveCommand(mode: string, prompt: string): { cmd: string, args: string[] } {
        const command = super.getNonInteractiveCommand(mode, prompt);
        if (this.shouldUseStructuredOutput(mode)) {
            command.args.push('--output-format', 'stream-json', '--include-partial-messages', '--verbose');
        }
        return command;
    }

    protected extractStructuredUsageLog(event: any): string | undefined {
        if (event?.type !== 'result' || !event?.usage) {
            return undefined;
        }

        const usage = event.usage;
        const lines = [
            typeof usage.input_tokens === 'number' ? `Input tokens: ${usage.input_tokens}` : '',
            typeof usage.output_tokens === 'number' ? `Output tokens: ${usage.output_tokens}` : '',
            typeof event.total_cost_usd === 'number' ? `Cost: $${event.total_cost_usd.toFixed(6)}` : '',
            typeof event.duration_ms === 'number' ? `Duration: ${event.duration_ms}ms` : '',
            event.modelUsage ? `Model usage: ${JSON.stringify(event.modelUsage)}` : '',
        ].filter(Boolean);

        return lines.length > 0 ? lines.join('\n') : undefined;
    }

    extractThinking(rawText: string): { thinking: string; output: string } {
        if (!rawText) { return { thinking: '', output: '' }; }

        // Extract <think>/<thinking>/<thought> XML blocks
        const tagRegex = /<(think|thinking|thought)>([\s\S]*?)<\/\1>/gi;
        const thinkingBlocks: string[] = [];
        let remaining = rawText;
        let match: RegExpExecArray | null;
        while ((match = tagRegex.exec(rawText)) !== null) {
            thinkingBlocks.push(match[2].trim());
            remaining = remaining.replace(match[0], '');
        }

        // Extract leading tool-trace lines that precede the final answer
        const lines = remaining.split(/\r?\n|\r/);
        const processLines: string[] = [];
        const outputLines: string[] = [];
        let outputStarted = false;

        for (const line of lines) {
            const clean = line.replace(ANSI_RE, '').trim();
            if (!outputStarted) {
                if (clean === '' || CLAUDE_PROCESS_LINE_RE.test(clean) || clean.startsWith('> [')) {
                    processLines.push(line);
                } else {
                    outputStarted = true;
                    outputLines.push(line);
                }
            } else {
                outputLines.push(line);
            }
        }

        while (processLines.length > 0 && processLines[processLines.length - 1].trim() === '') {
            outputLines.unshift(processLines.pop() as string);
        }

        const processBlock = processLines.join('\n').trim();
        if (processBlock) {
            thinkingBlocks.push('```text\n' + processBlock + '\n```');
        }

        return {
            thinking: thinkingBlocks.join('\n\n---\n\n'),
            output: outputLines.join('\n').trim()
        };
    }

    protected getSpawnCommand(mode: string): { cmd: string, args: string[] } {
        const args: string[] = [];
        const cwd = PersistentAgentAdapter.getWorkspacePath();
        args.push('--add-dir', cwd);

        if (this.modelFlag) {
            args.push('--model', this.modelFlag);
        }

        if (mode === 'plan') {
            args.push('--permission-mode', 'plan');
        } else if (mode === 'agent') {
            args.push('--dangerously-skip-permissions');
        }

        return { cmd: 'claude', args };
    }
}
