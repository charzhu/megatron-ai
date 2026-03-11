const fs = require('fs');
let c = fs.readFileSync('../src/mcp/mcp-server.ts', 'utf8');
const search = c.substring(c.indexOf('ames to spawn'), c.indexOf('.optimus/roles)\\\\n\";')+25);
console.log('Found:', search.length);
