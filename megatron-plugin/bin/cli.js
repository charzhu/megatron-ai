#!/usr/bin/env node

/**
 * Megatron Swarm CLI
 * 
 * Commands:
 *   megatron init       - Bootstrap a .megatron/ workspace in current directory
 *   megatron upgrade    - Upgrade skills, roles, and config from plugin source
 *   megatron serve      - Start the MCP server (stdio transport)
 *   megatron version    - Print version
 */

const path = require('path');
const fs = require('fs');

const command = process.argv[2];

switch (command) {
  case 'init':
    require('./commands/init')();
    break;

  case 'upgrade':
    require('./commands/upgrade')();
    break;

  case 'serve':
    // Launch the MCP server directly
    require(path.join(__dirname, '..', 'dist', 'mcp-server.js'));
    break;

  case 'version': {
    const pkgV = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    console.log(`megatron-swarm v${pkgV.version}`);

    // Build date from compile-time metadata
    const buildMetaPath = path.join(__dirname, '..', 'dist', 'build-meta.json');
    try {
      const meta = JSON.parse(fs.readFileSync(buildMetaPath, 'utf8'));
      console.log(`Build date:   ${meta.buildDate}`);
    } catch {
      console.log(`Build date:   unknown`);
    }

    // Skills from installed package
    const skillsDir = path.join(__dirname, '..', 'skills');
    try {
      const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();
      console.log(`Skills (${skills.length}):   ${skills.join(', ')}`);
    } catch {
      console.log(`Skills:       none found`);
    }
    break;
  }

  case '--version':
  case '-v': {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    console.log(`megatron-swarm v${pkg.version}`);
    break;
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    console.log(`
Megatron Swarm CLI — Universal Multi-Agent Orchestrator (MCP)

Usage:
  megatron init        Bootstrap .megatron/ workspace in current directory
  megatron upgrade     Upgrade skills, roles, and config from plugin source
  megatron serve       Start MCP server (stdio transport)
  megatron version     Print version

Docs: https://github.com/cloga/megatron-ai
`);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    console.error(`Run 'megatron help' for usage information.`);
    process.exit(1);
}
