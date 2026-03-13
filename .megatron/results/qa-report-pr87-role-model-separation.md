# QA Report — PR #87: Role-Model Separation & Tool Overflow Fix

**Branch**: `feature/issue-76-role-model-separation-and-tool-overflow`
**QA Engineer**: qa-engineer (T1)
**Date**: 2026-03-11
**Commit**: `3f22102`

---

## 1. Model-Name-as-Role Guard (`mcp-server.ts`)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| `claude-3-opus` | REJECT | `MODEL_NAME_PATTERNS.test()` = `true` → throws McpError | **PASS** |
| `gpt-5.4` | REJECT | matched | **PASS** |
| `gemini-3.0-pro` | REJECT | matched | **PASS** |
| `opus-4.6` | REJECT | matched | **PASS** |
| `sonnet-3.5` | REJECT | matched | **PASS** |
| `security-architect` | ACCEPT | `false` — no match | **PASS** |
| `meta-system-architect` | ACCEPT | `false` — no match | **PASS** |
| `prompt-engineering-lead` | ACCEPT | `false` — no match | **PASS** |
| `qa-engineer` | ACCEPT | `false` — no match | **PASS** |
| Error message is actionable | Must mention `role_model` | Message: `"Use a descriptive role like 'security-architect' and pass the model via role_model instead."` | **PASS** |

**Regex**: `/^(claude|gpt|gemini|llama|mistral|phi|o1|o3|copilot|opus|sonnet|haiku)[-_.\s]?\d/i`

All 10 checks verified via runtime Node.js execution.

---

## 2. `normalizeRoleSpecs()` (`mcp-server.ts`)

| Test Case | Expected | Result | Status |
|-----------|----------|--------|--------|
| Plain string array `['architect', 'dev']` | `[{role:'architect'}, {role:'dev'}]` | Correct | **PASS** |
| Structured objects `[{role:'architect', role_model:'claude-opus-4-6-1m'}]` | Preserve all fields | Correctly returns `{role, role_model}` with `role_engine`, `role_description` preserved | **PASS** |
| Mixed array `['dev', {role:'architect', role_engine:'copilot-cli'}]` | Both parsed | Correct | **PASS** |
| Invalid: `null` entry | Throw McpError | Throws `"Invalid role entry: null"` | **PASS** |
| Invalid: `number` entry | Throw McpError | Throws error | **PASS** |
| Invalid: `{noRole: true}` (object without `role`) | Throw McpError | Throws error | **PASS** |

All 6 cases verified via runtime Node.js execution.

---

## 3. `--strict-mcp-config` (`ClaudeCodeAdapter.ts`)

| Check | Expected | Result | Status |
|-------|----------|--------|--------|
| `--strict-mcp-config` always pushed to args | Unconditional push | Line 87: `command.args.push('--strict-mcp-config')` — executed before any try/catch | **PASS** |
| Inline `--mcp-config` JSON is valid | Valid JSON with `mcpServers.megatron-swarm` | Lines 91-103: `JSON.stringify({mcpServers:{'megatron-swarm':{command:'node',args:[absolutePath],env:...}}})` — valid MCP config format | **PASS** |
| Absolute paths used | `path.join()` for all paths | `mcpServerJs = path.join(workspacePath, 'megatron-plugin', 'dist', 'mcp-server.js')` and `path.join(workspacePath, '.env')` | **PASS** |
| No unused `fs` import | `fs` not imported | Only imports: `PersistentAgentAdapter`, `AgentMode`, `path` — no `fs` | **PASS** |
| No unused `path` import | `path` is used | Used on lines 90, 91, 98 | **PASS** |
| `findProjectMcpConfigs` fully removed | No references in codebase | `grep` across entire `src/` returns 0 matches | **PASS** |

---

## 4. MasterInfo Data Chain

| Check | Location | Expected | Result | Status |
|-------|----------|----------|--------|--------|
| `TaskRecord.role_specs` field | `TaskManifestManager.ts:179` | `role_specs?: RoleSpec[]` | Present | **PASS** |
| `TaskRecord.master_info` field | `TaskManifestManager.ts:182` | `{description?, engine?, model?, requiredSkills?}` | Present with correct shape | **PASS** |
| `delegate_task_async` extracts master info | `mcp-server.ts:766` | Builds `masterInfo` from `role_description/engine/model/required_skills` | Correctly constructs and stores in `createTask()` | **PASS** |
| `council-runner.ts` reads `role_specs` | `council-runner.ts:1362` | `task.role_specs \|\| task.roles!` passed to `dispatchCouncilConcurrent` | Falls back to `roles` for backward compat | **PASS** |
| `dispatchCouncilConcurrent()` converts `RoleSpec → MasterRoleInfo` | `worker-spawner.ts:2078-2081` | Each `RoleSpec` → `MasterRoleInfo` with `engine/model/description` | Correct conversion, only creates if fields present | **PASS** |
| `spawnWorker()` enriches `masterInfo.description` | `worker-spawner.ts:2060-2063` | Falls back to role-derived description if Master didn't provide | `masterInfo?.description \|\| "Expert council reviewer..."` | **PASS** |
| T1 placeholder includes body, not just header | `worker-spawner.ts:1990-1995` | `fallbackBody = masterInfo?.description \|\| personaContext` | Template: `# FormattedRole\n\n${fallbackBody}` — includes full description | **PASS** |

---

## 5. Regression Checks

| Check | Expected | Result | Status |
|-------|----------|--------|--------|
| Build compiles cleanly | `npm run build` exits 0 | `Done in 75ms — 121.1kb dist/mcp-server.js` | **PASS** |
| `dispatch_council` (sync) uses `normalizeRoleSpecs` | Backward compat with string arrays | `mcp-server.ts:843`: `normalizeRoleSpecs(roles)` → passes `RoleSpec[]` to `dispatchCouncilConcurrent()` which handles both `string` and `RoleSpec` at line 2078 | **PASS** |
| `delegate_task` (sync) path not broken | Still delegates correctly | `mcp-server.ts:954-997`: extracts all params, calls `delegateTaskSingle()` with `masterInfo` | **PASS** |

---

## Findings & Observations

### Non-Blocking Finding (Severity: LOW)

**`validateRoleName()` not applied to `delegate_task` / `delegate_task_async` single-role parameter.**

- `normalizeRoleSpecs()` (which calls `validateRoleName`) is only used in `dispatch_council` and `dispatch_council_async` (array-of-roles).
- The `delegate_task` handler at `mcp-server.ts:954` and `delegate_task_async` at `mcp-server.ts:759` accept a single `role` string but do NOT call `validateRoleName()` on it.
- **Impact**: A model name like `gpt-5.4` could be passed as `role` to `delegate_task`. `sanitizeRoleName()` in `worker-spawner.ts` would strip the dot, producing role `gpt-54`, which is a nonsensical but technically non-breaking path.
- **Recommendation**: Add `validateRoleName(role)` at the top of both `delegate_task` and `delegate_task_async` handlers for consistent enforcement. This is a non-blocking enhancement for a follow-up PR.

---

## Verdict

All **25 test cases** across 5 categories: **PASS**
One non-blocking finding identified (LOW severity, follow-up recommended).

**APPROVED FOR MERGE** ✅
