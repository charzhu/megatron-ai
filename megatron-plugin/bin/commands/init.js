#!/usr/bin/env node

/**
 * `megatron init` — Bootstrap a .megatron/ workspace in the current directory.
 * 
 * Copies starter personas, config, and creates required subdirectories.
 * Appends .megatron ignore entries to .gitignore if not already present.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✅ Created ${path.relative(process.cwd(), destPath)}`);
      } else {
        console.log(`  ⏭️  Skipped ${path.relative(process.cwd(), destPath)} (already exists)`);
      }
    }
  }
}

module.exports = function init() {
  const cwd = process.cwd();
  const megatronDir = path.join(cwd, '.megatron');
  const scaffoldDir = path.resolve(__dirname, '..', '..', 'scaffold');
  const pluginRoot = path.resolve(__dirname, '..', '..');

  console.log('\n🤖 Megatron Swarm — Initializing workspace...\n');

  // 0. Perform V3 Architecture Migrations
  const legacyPersonasDir = path.join(megatronDir, 'personas');
  const newAgentsDir = path.join(megatronDir, 'agents');
  if (fs.existsSync(legacyPersonasDir) && !fs.existsSync(newAgentsDir)) {
    try {
      fs.renameSync(legacyPersonasDir, newAgentsDir);
      console.log('  🔄 Migrated legacy .megatron/personas/ to .megatron/agents/');
    } catch(e) {
      console.error('  ⚠️ Failed to migrate legacy personas folder:', e.message);
    }
  }

  // 1. Create required subdirectories
  // Most agents are auto-generated at runtime via the T3→T2→T1 Cascade.
  // Only the PM (Master Agent) is pre-installed — it bootstraps the entire
  // workflow and cannot be dynamically generated since it's the entry point.
  const dirs = ['config', 'skills', 'agents', 'tasks', 'reports', 'reviews', 'memory', 'state', 'system'];
  for (const dir of dirs) {
    const dirPath = path.join(megatronDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  📁 Created .megatron/${dir}/`);
    }
  }

  // 2. Copy scaffold config (system instructions — single source of truth)
  const configSrc = path.join(scaffoldDir, 'config');
  if (fs.existsSync(configSrc)) {
    console.log('\n⚙️  Installing system config...');
    copyDirRecursive(configSrc, path.join(megatronDir, 'config'));
  }


  // 2.1 Copy scaffold system config (meta-crontab, cron-locks)
  const systemSrc = path.join(scaffoldDir, 'system');
  if (fs.existsSync(systemSrc)) {
    console.log('\n\u23f0 Installing system scheduler config...');
    copyDirRecursive(systemSrc, path.join(megatronDir, 'system'));
  }

  // 2.5 Copy plugin roles as starter T2 templates.
  // These provide rich persona definitions for common roles (architect, pm, qa-engineer, etc.)
  // so that council reviews and delegations have meaningful agent context from day one.
  // Roles are only copied if they don't already exist (won't overwrite user customizations).
  const rolesSrc = path.join(pluginRoot, 'roles');
  if (fs.existsSync(rolesSrc)) {
    console.log('\n👥 Installing starter role templates (T2 personas)...');
    copyDirRecursive(rolesSrc, path.join(megatronDir, 'roles'));
  }

  // 3. Copy plugin skills — these are the CORE deliverable.
  // Skills teach the AI how to use MCP tools (dispatch_council, delegate_task, etc.)
  // Without these, the AI has tools but no instruction manual.
  const skillsSrc = path.join(pluginRoot, 'skills');
  if (fs.existsSync(skillsSrc)) {
    console.log('\n📚 Installing skills (MCP tool operation manuals)...');
    copyDirRecursive(skillsSrc, path.join(megatronDir, 'skills'));
  }

  // 3.5 Generate or merge .vscode/mcp.json for VS Code / Copilot users
  const vscodeMcpDir = path.join(cwd, '.vscode');
  const vscodeMcpPath = path.join(vscodeMcpDir, 'mcp.json');
  if (!fs.existsSync(vscodeMcpDir)) {
    fs.mkdirSync(vscodeMcpDir, { recursive: true });
  }
  // Resolve the actual dist path relative to this CLI package
  const distPath = path.resolve(pluginRoot, 'dist', 'mcp-server.js');
  const megatronEntry = {
    type: "stdio",
    command: "node",
    args: [distPath],
    env: {
      "MEGATRON_WORKSPACE_ROOT": "${workspaceFolder}",
      "DOTENV_PATH": "${workspaceFolder}/.env",
      "PATH": "${env:PATH}"
    }
  };

  if (fs.existsSync(vscodeMcpPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(vscodeMcpPath, 'utf8'));
      const key = existing.servers ? 'servers' : 'mcpServers';
      if (!existing[key]) existing[key] = {};
      if (!existing[key]['megatron-swarm']) {
        existing[key]['megatron-swarm'] = megatronEntry;
        fs.writeFileSync(vscodeMcpPath, JSON.stringify(existing, null, 4), 'utf8');
        console.log('\n🔌 Merged megatron-swarm into existing .vscode/mcp.json');
      } else {
        console.log('\n⏭️  Skipped .vscode/mcp.json (megatron-swarm already configured)');
      }
    } catch (e) {
      console.log('\n⚠️  Could not parse existing .vscode/mcp.json, skipping merge');
    }
  } else {
    const mcpConfig = { servers: { "megatron-swarm": megatronEntry }, inputs: [] };
    fs.writeFileSync(vscodeMcpPath, JSON.stringify(mcpConfig, null, 4), 'utf8');
    console.log('\n🔌 Generated .vscode/mcp.json (MCP server config for VS Code / Copilot)');
  }
  console.log(`   📍 MCP server path: ${distPath}`);
  console.log('   💡 Users can change DOTENV_PATH to point to a different env file.');

  // 3.6 Register in ~/.copilot/mcp-config.json for standalone Copilot CLI
  const copilotMcpPath = path.join(os.homedir(), '.copilot', 'mcp-config.json');
  const copilotEntry = {
    command: "node",
    args: [distPath],
    env: {
      "MEGATRON_WORKSPACE_ROOT": cwd,
      "DOTENV_PATH": path.join(cwd, '.env')
    }
  };

  try {
    let copilotConfig = { mcpServers: {} };
    if (fs.existsSync(copilotMcpPath)) {
      copilotConfig = JSON.parse(fs.readFileSync(copilotMcpPath, 'utf8'));
      if (!copilotConfig.mcpServers) copilotConfig.mcpServers = {};
    }
    // Always update to point to current workspace
    copilotConfig.mcpServers['megatron-swarm'] = copilotEntry;
    fs.writeFileSync(copilotMcpPath, JSON.stringify(copilotConfig, null, 2), 'utf8');
    console.log(`\n🔌 Registered megatron-swarm in ~/.copilot/mcp-config.json (Copilot CLI)`);
  } catch (e) {
    console.log('\n⚠️  Could not update ~/.copilot/mcp-config.json — register manually with /mcp');
  }

  // 4. Append to .gitignore if needed
  const gitignorePath = path.join(cwd, '.gitignore');
  const optIgnorePath = path.join(scaffoldDir, '.gitignore-megatron');
  if (fs.existsSync(optIgnorePath)) {
    const ignoreEntries = fs.readFileSync(optIgnorePath, 'utf8');
    let existingIgnore = '';
    if (fs.existsSync(gitignorePath)) {
      existingIgnore = fs.readFileSync(gitignorePath, 'utf8');
    }
    if (!existingIgnore.includes('.megatron/reports/')) {
      fs.appendFileSync(gitignorePath, '\n# Megatron Swarm generated artifacts\n' + ignoreEntries);
      console.log('\n📝 Updated .gitignore with Megatron entries');
    }
  }

  // 5. Inject reference into existing AI client instruction files (do NOT create new ones)
  // Single source of truth: .megatron/config/system-instructions.md (also served via MCP Resource)
  const injectMarker = '<!-- megatron-instructions -->';
  const injectBlock = [
    injectMarker,
    '<!-- Auto-injected by megatron init — DO NOT EDIT this block -->',
    '## Megatron Swarm Instructions',
    '',
    'This project uses the [Megatron Swarm](https://github.com/cloga/megatron-ai) multi-agent orchestrator.',
    'System instructions are maintained in `.megatron/config/system-instructions.md` and served via MCP Resource `megatron://system/instructions`.',
    '',
    'Please read and follow `.megatron/config/system-instructions.md` for all workflow protocols.',
    '<!-- /megatron-instructions -->',
  ].join('\n');

  let injected = [];

  // Claude Code: CLAUDE.md (only if it already exists)
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    const existing = fs.readFileSync(claudeMdPath, 'utf8');
    if (!existing.includes(injectMarker)) {
      fs.appendFileSync(claudeMdPath, '\n\n' + injectBlock + '\n');
      injected.push('CLAUDE.md');
    }
  }

  // GitHub Copilot: .github/copilot-instructions.md (only if it already exists)
  const copilotPath = path.join(cwd, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotPath)) {
    const existing = fs.readFileSync(copilotPath, 'utf8');
    if (!existing.includes(injectMarker)) {
      fs.appendFileSync(copilotPath, '\n\n' + injectBlock + '\n');
      injected.push('.github/copilot-instructions.md');
    }
  }

  // Cursor: .cursor/rules/ (only if directory already exists)
  const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(cursorRulesDir)) {
    const cursorRulePath = path.join(cursorRulesDir, 'megatron.mdc');
    if (!fs.existsSync(cursorRulePath)) {
      fs.writeFileSync(cursorRulePath, injectBlock + '\n', 'utf8');
      injected.push('.cursor/rules/megatron.mdc');
    }
  }

  if (injected.length > 0) {
    console.log('\n🔗 Injected Megatron reference into existing client config(s):');
    for (const f of injected) console.log(`  → ${f}`);
  }

  console.log('\n✅ Workspace initialized! Your .megatron/ directory is ready.');
  console.log('   System instructions: .megatron/config/system-instructions.md (served via MCP Resource)');
  console.log('   Run `megatron serve` or configure your MCP client to start.\n');
};
