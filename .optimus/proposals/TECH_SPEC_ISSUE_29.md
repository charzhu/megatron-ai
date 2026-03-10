# Technical Spec: Issue #29 (T1/T2/T3 Arc Refactor)

## 1. Objective
Implement the architecture defined in `PROPOSAL_UNIFY_AGENTS_PERSONAS.md`.
- **T1 = Agent** (Lives in `.optimus/agents/`)
- **T2 = Role** (Lives in `optimus-plugin/roles/`)
- **T3 = Base LLM** (No file)

## 2. Required Changes

### A. Rename Directories & Update Paths
1. `src/mcp/worker-spawner.ts`:
   - Change `t1Path` from `.optimus/personas/` to `.optimus/agents/`.
   - Change `t2Path` from `optimus-plugin/agents/` to `optimus-plugin/roles/`.
2. `optimus-plugin/bin/commands/init.js`: 
   - Scaffold should create `.optimus/roles` (if global) or `optimus-plugin/roles`. Actually `init.js` scaffolds the project, so it should copy from `optimus-plugin/scaffold/roles` (rename from `personas`) to `.optimus/agents/`. Wait, `pm.md` is a T1 Master Agent, so it goes to `.optimus/agents/pm.md`.
3. `optimus-plugin/package.json` / file structure:
   - Rename `optimus-plugin/scaffold/personas` to `optimus-plugin/scaffold/roles`.
   - Rename `optimus-plugin/agents` to `optimus-plugin/roles`.

### B. Backward Compatibility (Migration)
In `worker-spawner.ts`, before checking `t1Path` or `t2Path`:
- Auto-migrate T1: If `.optimus/personas/` exists but `.optimus/agents/` does not, rename the directory.
- Auto-migrate T2: If `optimus-plugin/agents/` exists but `optimus-plugin/roles/` does not, rename it.

### C. Enhanced Instantiation Logic (T2 -> T1)
Currently, `worker-spawner.ts` does: `fs.writeFileSync(t1Path, fs.readFileSync(t2Path, 'utf8'));`
We need to enhance this so the new T1 file gets a "Project Memory" section:
```typescript
const content = fs.readFileSync(t2Path, 'utf8');
const date = new Date().toISOString();
const enhancedContent = content + \`

## Project Memory & Experience
*Agent instantiated from T2 Role on \${date}*
\`;
fs.writeFileSync(t1Path, enhancedContent);
```

### D. Safe Concurrent T1 Creation
To avoid race conditions where multiple T3s try to instantiate T2 -> T1 at the exact same moment:
- Check if file exists.
- Write to a `.tmp` file and rename atomically `fs.renameSync()`, or just rely on `existsSync` with a try/catch. Since it's a basic fs operation, atomic rename (`fs.writeFileSync` to temp, then `fs.renameSync` to target) is safer.

## 3. Scope
This spec strictly covers the directory refactor, migration logic, and T2->T1 cascade updating. Advanced memory write-locks (`blackboard_update_state` with SQLite) are deferred to a separate MCP Service Abstraction PR.