const m = JSON.parse(require('fs').readFileSync('.optimus/state/task-manifest.json','utf8'));
Object.entries(m).forEach(([id, t]) => {
    const status = (t.status || '?').padEnd(10);
    const type = (t.type || '?').padEnd(18);
    const role = t.role || (t.roles ? t.roles.join(',') : '?');
    const out = t.output_path || '';
    console.log(status + ' | ' + type + ' | ' + id + ' | ' + role + ' | ' + out);
});
