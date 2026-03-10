/**
 * E2E Test Script: Invoke delegate_task via MCP stdio and verify session binding.
 * Tests Issue #44: Native Session ID Binding for T1 Agents.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const WORKSPACE = process.cwd();
const PM_PATH = path.join(WORKSPACE, '.optimus', 'agents', 'pm.md');

console.log('=== E2E Test: Native Session ID Binding via MCP ===\n');
console.log('Workspace:', WORKSPACE);
console.log('Target agent file:', PM_PATH);

// Read pm.md before test
const beforeContent = fs.readFileSync(PM_PATH, 'utf8');
console.log('\n--- pm.md BEFORE delegate_task ---');
console.log(beforeContent.substring(0, 200));
console.log('Has YAML frontmatter:', beforeContent.startsWith('---\n') || beforeContent.startsWith('---\r\n'));

// Check if claude CLI is available
const whereResult = require('child_process').spawnSync('where.exe', ['claude'], { encoding: 'utf8' });
if (whereResult.status !== 0) {
    console.log('\n[SKIP] Claude CLI not found on PATH. Cannot run live delegate_task test.');
    console.log('The unit tests above already validate the frontmatter functions.');
    console.log('To run this test, ensure `claude` is on your PATH.\n');
    process.exit(0);
}
console.log('\nClaude CLI found:', whereResult.stdout.trim().split('\n')[0]);

// Spawn MCP server
const serverProcess = spawn('node', [
    path.join(WORKSPACE, 'optimus-plugin', 'dist', 'mcp-server.js')
], {
    cwd: WORKSPACE,
    env: { ...process.env, OPTIMUS_WORKSPACE: WORKSPACE },
    stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
let messageCount = 0;

function sendMessage(msg: object) {
    const json = JSON.stringify(msg);
    const payload = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;
    serverProcess.stdin.write(payload);
}

function parseResponses(chunk: string) {
    responseBuffer += chunk;
    // Simple JSON-RPC line parser
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                handleResponse(parsed);
            } catch { }
        }
    }
}

function handleResponse(response: any) {
    messageCount++;
    console.log(`\n[Response #${messageCount}]`, JSON.stringify(response).substring(0, 300));

    if (response.id === 1) {
        // Initialize response received, send initialized notification
        sendMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });

        // Now call delegate_task with pm role
        console.log('\nSending delegate_task for pm role...');
        sendMessage({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'delegate_task',
                arguments: {
                    role: 'pm',
                    task_description: 'Say exactly this: "QA test complete. Session binding verified." Nothing else.',
                    output_path: path.join(WORKSPACE, '.optimus', 'results', 'qa-session-test.md'),
                    workspace_path: WORKSPACE
                }
            }
        });
    }

    if (response.id === 2) {
        console.log('\n--- delegate_task completed ---');
        console.log('Response:', JSON.stringify(response).substring(0, 500));

        // Check pm.md after
        setTimeout(() => {
            const afterContent = fs.readFileSync(PM_PATH, 'utf8');
            console.log('\n--- pm.md AFTER delegate_task ---');
            console.log(afterContent.substring(0, 400));
            console.log('\nHas YAML frontmatter:', afterContent.startsWith('---\n'));

            const fmMatch = afterContent.match(/^---\n([\s\S]*?)\n---/);
            if (fmMatch) {
                console.log('Frontmatter block:', fmMatch[1]);
                const hasEngine = /engine:/.test(fmMatch[1]);
                const hasSessionId = /session_id:/.test(fmMatch[1]);
                console.log('\nEngine present:', hasEngine);
                console.log('Session ID present:', hasSessionId);
                console.log('\n=== RESULT:', hasEngine && hasSessionId ? 'PASS' : 'FAIL', '===');
            } else {
                console.log('\n=== RESULT: FAIL (no frontmatter found) ===');
            }

            serverProcess.kill();
            process.exit(0);
        }, 1000);
    }
}

serverProcess.stdout.on('data', (data) => {
    parseResponses(data.toString());
});

serverProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.error('[MCP stderr]', msg.substring(0, 200));
});

// Start: send initialize
console.log('\nSending MCP initialize...');
sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'qa-e2e-test', version: '1.0.0' }
    }
});

// Timeout safety
setTimeout(() => {
    console.log('\n[TIMEOUT] Test exceeded maximum wait time.');
    const afterContent = fs.readFileSync(PM_PATH, 'utf8');
    console.log('pm.md current state:', afterContent.substring(0, 200));
    serverProcess.kill();
    process.exit(1);
}, 300000);
