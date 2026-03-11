const fs = require('fs');
const m = JSON.parse(fs.readFileSync('.optimus/state/task-manifest.json', 'utf8'));

const entries = Object.entries(m).sort((a, b) => (b[1].startTime || 0) - (a[1].startTime || 0));

console.log('\n📋 Spartan Swarm Task Dashboard\n');
console.log('Status     | Type              | Role                          | Task Summary');
console.log('-'.repeat(120));

for (const [id, t] of entries) {
    const status = (t.status || '?').padEnd(10);
    const type = (t.type || '?').padEnd(17);
    const role = (t.role || (t.roles ? t.roles.join(', ') : '?')).padEnd(29);
    
    // Extract first meaningful line of task_description as summary
    let summary = '';
    if (t.type === 'dispatch_council') {
        summary = t.proposal_path ? 'Proposal: ' + require('path').basename(t.proposal_path) : '(council)';
    } else {
        const desc = t.task_description || '';
        const firstLine = desc.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0] || '';
        summary = firstLine.substring(0, 60);
        if (firstLine.length > 60) summary += '...';
    }
    
    const elapsed = t.startTime ? Math.round((Date.now() - t.startTime) / 1000) + 's ago' : '';
    const gh = t.github_issue_number ? ' (#' + t.github_issue_number + ')' : '';
    
    console.log(status + ' | ' + type + ' | ' + role + ' | ' + summary + gh);
}

// Running tasks detail
const running = entries.filter(([, t]) => t.status === 'running');
if (running.length > 0) {
    console.log('\n🔄 Currently Running:');
    for (const [id, t] of running) {
        const elapsed = Math.round((Date.now() - t.startTime) / 1000);
        const stale = elapsed > 600 ? ' ⚠️ STALE (>10min)' : '';
        console.log('  ' + id + ' | ' + (t.role || t.roles?.join(', ')) + ' | ' + elapsed + 's' + stale);
    }
}

// Failed tasks
const failed = entries.filter(([, t]) => t.status === 'failed');
if (failed.length > 0) {
    console.log('\n❌ Failed:');
    for (const [id, t] of failed) {
        console.log('  ' + id + ' | ' + (t.error_message || 'unknown error'));
    }
}

console.log('\nTotal: ' + entries.length + ' tasks | Running: ' + running.length + ' | Failed: ' + failed.length);
