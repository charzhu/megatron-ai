#!/usr/bin/env node

/**
 * postinstall hook for @anthropic-ai/megatron-swarm-mcp
 * 
 * After npm install, this script provides guidance on how to register
 * the MCP server with Claude Code.
 */

const path = require('path');

const pluginRoot = path.resolve(__dirname, '..');
const serverPath = path.join(pluginRoot, 'dist', 'mcp-server.js');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║        🤖 Megatron Swarm MCP Plugin — Installed!            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  To register with any MCP Client (Goose, Cursor, Claude):    ║
║                                                              ║
║    Command: node                                             ║
║    Args:    ${serverPath}      ║
║                                                              ║
║  To bootstrap a workspace with Megatron agents/skills:        ║
║                                                              ║
║    npx megatron init                                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
