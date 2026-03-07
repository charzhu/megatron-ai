import { PersistentAgentAdapter } from './PersistentAgentAdapter';
import { ANSI_RE } from '../utils/textParsing';

// Copilot CLI uses ● (U+25CF filled circle) and tree-drawing chars for tool trace lines
// Also handle ⏺ (U+23FA) and • (U+2022) for robustness
const COPILOT_PROCESS_LINE_RE = /^[●⏺•└│├▶→]/;

export class GitHubCopilotAdapter extends PersistentAgentAdapter {
    constructor(id: string = 'github-copilot', name: string = '🛸 GitHub Copilot', modelFlag: string = '', modes?: string[]) {
        super(id, name, modelFlag, '?>', modes);
    }

    protected shouldUseStructuredOutput(mode: string): boolean {
        return mode === 'plan';
    }

    protected getNonInteractiveCommand(mode: string, prompt: string): { cmd: string, args: string[] } {
        const command = super.getNonInteractiveCommand(mode, prompt);
        if (this.shouldUseStructuredOutput(mode)) {
            command.args.push('--output-format', 'json', '--stream', 'on');
        }
        return command;
    }

    protected extractStructuredUsageLog(event: any): string | undefined {
        if (event?.type !== 'result' || !event?.usage) {
            return undefined;
        }

        const usage = event.usage;
        const lines = [
            typeof usage.premiumRequests === 'number' ? `Premium requests: ${usage.premiumRequests}` : '',
            typeof usage.totalApiDurationMs === 'number' ? `API duration: ${usage.totalApiDurationMs}ms` : '',
            typeof usage.sessionDurationMs === 'number' ? `Session duration: ${usage.sessionDurationMs}ms` : '',
            usage.codeChanges ? `Code changes: ${JSON.stringify(usage.codeChanges)}` : '',
        ].filter(Boolean);

        return lines.length > 0 ? lines.join('\n') : undefined;
    }

    extractThinking(rawText: string): { thinking: string; output: string; usageLog?: string } {
        if (!rawText) { return { thinking: '', output: '' }; }

        const lines = rawText.split(/\r?\n|\r/);
        const processLines: string[] = [];
        const outputLines: string[] = [];
        const logLines: string[] = [];
        let outputStarted = false;

        for (const line of lines) {
            const clean = line.replace(ANSI_RE, '').trim();
            // [LOG] lines are usage stats — capture separately regardless of position.
            // May appear as "> [LOG] ..." (stderr-decorated) or plain "[LOG] ..." (stdout).
            // Use a loose match to tolerate leading whitespace or invisible chars after ANSI strip.
            if (/\[LOG\]/i.test(clean)) {
                logLines.push(clean);
                continue;
            }
            if (!outputStarted) {
                if (clean === '' || COPILOT_PROCESS_LINE_RE.test(clean) || clean.startsWith('> [') || clean.startsWith('[')) {
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
        return {
            thinking: processBlock ? '```text\n' + processBlock + '\n```' : '',
            output: outputLines.join('\n').trim(),
            usageLog: logLines.length > 0 ? logLines.join('\n') : this.lastUsageLog
        };
    }

    protected getSpawnCommand(mode: string): { cmd: string, args: string[] } {
        const args: string[] = [];
        const cwd = PersistentAgentAdapter.getWorkspacePath();
        args.push('--add-dir', cwd);
        
        if (mode === 'plan') {
            // -p flag already prevents file modifications; no extra flags needed
        } else if (mode === 'agent') {
            args.push('--allow-all');
            args.push('--no-ask-user');
        }
        
        return { cmd: 'copilot', args };
    }
}
