# QA Report: Issue #63 — T3-to-T2 Precipitation System

**QA Engineer:** qa-engineer (T1 Instance)
**Date:** 2026-03-11
**Branch:** `feature/issue-63-t3-precipitation`
**Commit:** `1719623`

---

## 1. T2 Frontmatter Engine/Model Binding

### 1.1 Frontmatter Presence in T2 Role Files

| File | `engine` | `model` | Verdict |
|------|----------|---------|---------|
| `.megatron/roles/chief-architect.md` | `claude-code` | `claude-opus-4.6-1m` | **PASS** |
| `.megatron/roles/qa-engineer.md` | `claude-code` | `claude-opus-4.6-1m` | **PASS** |

Both T2 role files contain correct YAML frontmatter with valid `engine` and `model` fields.

### 1.2 Frontmatter Reading in `worker-spawner.ts`

**Location:** `src/mcp/worker-spawner.ts:339-343`

```typescript
if (t1Content) {
    const fm = parseFrontmatter(t1Content);
    if (fm.frontmatter.engine) activeEngine = fm.frontmatter.engine;
    if (fm.frontmatter.session_id) activeSessionId = fm.frontmatter.session_id;
    if (fm.frontmatter.model) activeModel = fm.frontmatter.model;
}
```

**Verdict: PASS** — Correctly reads `engine`, `model`, and `session_id` from frontmatter and overrides defaults.

### 1.3 Adapter Selection via `getAdapterForEngine`

**Location:** `src/mcp/worker-spawner.ts:276-281`

```typescript
function getAdapterForEngine(engine: string, sessionId?: string, model?: string): AgentAdapter {
    if (engine === 'copilot-cli') {
        return new GitHubCopilotAdapter(sessionId, '🛸 GitHub Copilot', model);
    }
    return new ClaudeCodeAdapter(sessionId, '🦖 Claude Code', model);
}
```

**Verdict: PASS** — Correctly passes `model` to both adapter constructors. Falls back to `ClaudeCodeAdapter` for any engine that is not `copilot-cli`, including the default `claude-code`.

### 1.4 Fallback When Frontmatter is Missing or Malformed

**Test Case:** What if frontmatter is absent or has no `engine`/`model` fields?

- `activeEngine` defaults to `parsedRole.engine || 'claude-code'` (line 319). If there's no role spec engine AND no frontmatter engine, it falls back to `'claude-code'`. **PASS**.
- `activeModel` defaults to `parsedRole.model` (line 320), which is `undefined` if not specified. This `undefined` is then passed to `getAdapterForEngine`. **PASS** — adapters should handle `undefined` model gracefully.

**Test Case:** What if frontmatter YAML is syntactically malformed (e.g. missing the closing `---`)?

- `parseFrontmatter` uses regex `/^---\n([\s\S]*?)\n---\n([\s\S]*)$/`. If no match, it returns `{ frontmatter: {}, body: content }`. The caller then skips all `if (fm.frontmatter.engine)` checks. Defaults are retained. **PASS**.

### 1.5 T1 Agent Files Without `model` Field

The T1 `pm.md` agent file has `engine: claude-code` but NO `model` field. In this case:
- `fm.frontmatter.model` is `undefined`, so `activeModel` remains as `parsedRole.model` (also `undefined` for standard role names).
- `getAdapterForEngine` receives `model=undefined`. This is acceptable only if adapters handle `undefined` gracefully (e.g. using their own default model).

**Verdict: PASS (conditional)** — Works correctly, but relies on adapter constructors gracefully handling `undefined` model.

### Section 1 Overall: **PASS**

---

## 2. T3 Usage Tracking

### 2.1 `trackT3Usage()` Function

**Location:** `src/mcp/worker-spawner.ts:77-89`

Logic review:
- Creates entry if not exists with zero counters. **PASS**.
- Increments `invocations` unconditionally; increments `successes` or `failures` based on boolean. **PASS**.
- Updates `lastUsed` timestamp. **PASS**.
- Overwrites `engine` on every call. Overwrites `model` only if provided (truthy). **PASS**.

### 2.2 `loadT3UsageLog()` / `saveT3UsageLog()`

**Location:** `src/mcp/worker-spawner.ts:60-75`

- `loadT3UsageLog`: Uses try-catch with empty catch block; returns `{}` on any error (file not found, parse error). **PASS** — defensive.
- `saveT3UsageLog`: Creates directory with `{ recursive: true }` if it doesn't exist. **PASS**.

### 2.3 JSON Structure Validation

The `T3UsageEntry` interface defines:
```typescript
interface T3UsageEntry {
    role: string;
    invocations: number;
    successes: number;
    failures: number;
    lastUsed: string;
    engine: string;
    model?: string;
}
```

The JSON is keyed by role name (`Record<string, T3UsageEntry>`). Structure is clean and correct.

**Verdict: PASS**

### 2.4 Race Condition: Concurrent Writes to `t3-usage-log.json`

**BUG FOUND — SEVERITY: MEDIUM**

The `trackT3Usage()` function performs a **read-modify-write** cycle:
1. `loadT3UsageLog()` — reads from disk
2. Modifies in-memory object
3. `saveT3UsageLog()` — writes to disk

This is **NOT atomic**. If two async task workers (e.g., spawned via `delegate_task_async` or `dispatchCouncilConcurrent`) finish near-simultaneously for different T3 roles, the following race condition can occur:

1. Worker A reads `{}` from file
2. Worker B reads `{}` from file
3. Worker A writes `{ "role-a": {...} }`
4. Worker B writes `{ "role-b": {...} }` — **overwrites Worker A's entry**

The `AgentLockManager` only locks per-role (not globally), so two DIFFERENT T3 roles completing concurrently will bypass the lock.

**Mitigation present:** The `ConcurrencyGovernor` limits to 3 concurrent workers, but does NOT serialize file access. The `AgentLockManager.acquireLock(role)` is per-role, so two different roles can write concurrently.

**Impact:** Lost T3 usage data entries. Precipitation could be delayed if counters are reset by an overwrite.

**Recommendation:** Use a file-level lock or a single mutex for all T3 log operations, not per-role locking.

### 2.5 Missing `.megatron/state/` Directory

`saveT3UsageLog()` at line 73 creates the directory:
```typescript
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
```

**Verdict: PASS** — Handles missing directory correctly.

### Section 2 Overall: **CONDITIONAL PASS** (race condition bug exists; see 2.4)

---

## 3. Auto-Precipitation Logic

### 3.1 `checkAndPrecipitate()` Function

**Location:** `src/mcp/worker-spawner.ts:98-137`

### 3.2 Threshold Verification

Constants:
```typescript
const PRECIPITATION_THRESHOLD = 3;
const PRECIPITATION_SUCCESS_RATE = 0.8;
```

Check logic:
```typescript
if (!entry || entry.invocations < PRECIPITATION_THRESHOLD) return null;
const successRate = entry.successes / entry.invocations;
if (successRate < PRECIPITATION_SUCCESS_RATE) return null;
```

**Test Case: 3 invocations, 2 successes = 66.67%**
- `successRate = 2/3 = 0.6667`
- `0.6667 < 0.8` → returns `null`. **PASS — correctly does NOT precipitate.**

**Test Case: 3 invocations, 3 successes = 100%**
- `successRate = 3/3 = 1.0`
- `1.0 >= 0.8` → proceeds to precipitation. **PASS.**

**Test Case: 5 invocations, 4 successes = 80%**
- `successRate = 4/5 = 0.8`
- `0.8 < 0.8` is `false` → proceeds. **PASS — 80% exactly meets threshold.**

**Test Case: 2 invocations, 2 successes**
- `2 < 3` → returns `null`. **PASS — below invocation threshold.**

**Test Case: 3 invocations, 0 successes**
- `successRate = 0/3 = 0.0`
- `0.0 < 0.8` → returns `null`. **PASS.**

### 3.3 Skip If T2 Already Exists

```typescript
const t2Path = path.join(t2Dir, `${role}.md`);
if (fs.existsSync(t2Path)) return null; // Already a T2
```

**Verdict: PASS** — Correctly skips if file already exists.

### 3.4 Generated T2 Template Validity

The template generated at lines 117-132:

```markdown
---
role: ${role}
tier: T2
description: "Auto-precipitated from T3 after ${entry.invocations} successful invocations"
engine: ${engine}
model: ${model || 'claude-opus-4.6-1m'}
precipitated: ${new Date().toISOString()}
---
# ${formattedRole}
...
```

**Issues Found:**

**BUG — SEVERITY: LOW (Misleading text):**
The `description` field says "after N **successful** invocations" but `entry.invocations` is the TOTAL count (successes + failures), not just successes. The description should say "after N total invocations" or use `entry.successes` instead.

**Frontmatter validity:** The YAML frontmatter uses the custom `parseFrontmatter` parser which handles this format correctly. The `precipitated` field contains an ISO timestamp — valid. **PASS.**

**Role name formatting:**
```typescript
const formattedRole = role.split(/[-_]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
```
Converts `security-auditor` to `Security Auditor`. **PASS.**

### 3.5 Boundary: Precipitation Fires on the SAME Call as Tracking

In `delegateTaskSingle()` (lines 433-438):
```typescript
trackT3Usage(workspacePath, role, true, activeEngine, activeModel);
const precipitated = checkAndPrecipitate(workspacePath, role, activeEngine, activeModel);
```

The tracking and check happen sequentially in the same synchronous block. This means the 3rd successful invocation will trigger precipitation on that same call. **PASS — correct behavior.**

### 3.6 `checkAndPrecipitate` Re-reads from Disk

Note that `checkAndPrecipitate` calls `loadT3UsageLog()` again at line 99, re-reading from disk. This is safe because `trackT3Usage()` just wrote to disk synchronously. However, combined with the race condition in Section 2.4, a concurrent write from another role could produce stale reads.

**Verdict: PASS (for single-role serial execution), subject to race condition caveat in 2.4.**

### Section 3 Overall: **CONDITIONAL PASS** (minor description text bug; depends on race condition fix from Section 2)

---

## 4. roster_check Enhancement

### 4.1 T2 Engine/Model Display

**Location:** `src/mcp/mcp-server.ts:783-802`

```typescript
const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (fmMatch) {
    const lines = fmMatch[1].split('\n');
    const engineLine = lines.find(l => l.startsWith('engine:'));
    const modelLine = lines.find(l => l.startsWith('model:'));
    ...
}
```

**Verdict: PASS** — Correctly extracts engine/model from frontmatter and displays as `roleName → engine / model`.

**Note:** Uses a separate regex parser from `parseFrontmatter` in worker-spawner.ts. This is slight code duplication but functionally correct. Not a bug, just a maintenance concern.

### 4.2 T3 Usage Stats Section

**Location:** `src/mcp/mcp-server.ts:811-826`

```typescript
const t3LogPath = path.join(workspace_path, '.megatron', 'state', 't3-usage-log.json');
if (fs.existsSync(t3LogPath)) {
    try {
        const t3Log = JSON.parse(fs.readFileSync(t3LogPath, 'utf8'));
        const entries = Object.values(t3Log) as any[];
        if (entries.length > 0) { ... }
    } catch {}
}
```

**Verdict: PASS** — Wrapped in try-catch, handles missing file (existsSync check), handles empty entries array.

### 4.3 Precipitation Ready Indicator

```typescript
const precipNote = e.invocations >= 3 && rate >= 80 ? ' ⬆️ Ready for precipitation' : '';
```

**BUG — SEVERITY: LOW (Cosmetic inconsistency):**
This check uses `rate >= 80` (integer percentage) while the actual precipitation logic uses `successRate < 0.8` (float ratio). However `Math.round((e.successes / e.invocations) * 100)` at line 820 rounds to integer, so `rate >= 80` is functionally equivalent for all practical cases EXCEPT edge rounding:

- 4 successes / 5 invocations = 0.8 → `Math.round(80) = 80` → `80 >= 80` = true. Correct.
- 7 successes / 9 invocations = 0.7778 → `Math.round(77.78) = 78` → `78 >= 80` = false. Correct (would not precipitate).

This is functionally correct but the duplicated threshold logic is fragile. If someone changes `PRECIPITATION_SUCCESS_RATE` to 0.75, they'd also need to update the roster_check handler.

**Verdict: PASS (with maintenance concern)**

### 4.4 Missing/Empty `t3-usage-log.json`

- Missing file: `fs.existsSync` returns false, block is skipped entirely. **PASS.**
- Empty file (`{}`): `Object.values({})` returns `[]`, `entries.length > 0` is false, block skipped. **PASS.**
- Corrupted JSON: Caught by `try {} catch {}`. **PASS.**

### Section 4 Overall: **PASS**

---

## 5. Edge Cases

### 5.1 Role Names with Special Characters or Spaces

**File path construction:**
```typescript
const t2Path = path.join(t2Dir, `${role}.md`);
```

If `role = "my role"` (with space), this creates `my role.md` on disk. On Windows this works; on some systems it could cause issues with shell commands but the code uses `fs` APIs directly, not shell commands.

If `role = "../escape"`, then `t2Path = path.join(t2Dir, "../escape.md")`, which resolves to the PARENT of the roles directory. **This is a path traversal vulnerability.**

**BUG FOUND — SEVERITY: HIGH (Path Traversal)**

The `role` parameter comes directly from user/MCP input without sanitization. A malicious role name like `../../config/system-instructions` could overwrite arbitrary files within the workspace.

**Affected locations:**
- `worker-spawner.ts:107` — `checkAndPrecipitate()` writes to `path.join(t2Dir, \`${role}.md\`)`
- `worker-spawner.ts:316-317` — T1/T2 path resolution: `path.join(t1Dir, \`${role}.md\`)` / `path.join(t2Dir, \`${role}.md\`)`
- `mcp-server.ts:209` — Lock file: `path.join(this.lockDir, \`${role}.lock\`)`

**Impact:** An attacker (or malformed MCP request) could write files outside the intended directories.

**Recommendation:** Sanitize role names: strip `/`, `\`, `..`, control characters. Validate that `path.resolve()` result stays within the expected parent directory.

### 5.2 Empty or Corrupted `t3-usage-log.json`

- **Empty file (0 bytes):** `JSON.parse('')` throws. Caught by `loadT3UsageLog()`'s empty catch block, returns `{}`. **PASS.**
- **Partial JSON (e.g., `{ "role":`):** `JSON.parse` throws. Caught, returns `{}`. **PASS — but the next `saveT3UsageLog` will overwrite the corrupted file with a clean object.** This is acceptable behavior.
- **Non-JSON content:** Same as above. **PASS.**

### 5.3 Simultaneous Precipitation Attempts for Same Role

Scenario: Two concurrent workers both complete successfully for the same T3 role, bringing it to threshold.

The `AgentLockManager` serializes same-role execution (line 410-411):
```typescript
const lockManager = getLockManager(workspacePath);
await lockManager.acquireLock(role);
```

So two workers for the SAME role will not run concurrently. The first writes the T3 log and potentially precipitates; the second will find the T2 file already exists and skip.

**Verdict: PASS** — Same-role locking prevents duplicate precipitation.

**However:** The in-memory lock manager is a module-level singleton (line 228-235). If two separate MCP server processes exist (e.g., multiple clients), the lock is not shared. This is a known limitation of the in-process lock design.

### 5.4 `parseFrontmatter` Edge Cases

- **No frontmatter at all** (file starts with `# Heading`): Regex doesn't match, returns `{ frontmatter: {}, body: content }`. **PASS.**
- **Frontmatter with colons in values** (e.g., `description: "claude-opus-4.6-1m: the best"`): `colonIdx = line.indexOf(':')` finds the FIRST colon, so key is `description` and value is `"claude-opus-4.6-1m: the best"` with quotes stripped. **PASS — handles correctly.**
- **Empty frontmatter block** (`---\n---\n`): `yamlBlock` is empty string, no lines parsed, returns empty frontmatter. **PASS.**
- **Windows line endings (`\r\n`)**: The regex uses `\n` literally. On Windows, if files have `\r\n`, the frontmatter values will retain trailing `\r`. This could cause `engine` to be `"claude-code\r"` which would NOT match `'copilot-cli'` in `getAdapterForEngine`, falling through to the `ClaudeCodeAdapter` default. For `claude-code` engine this accidentally works, but `copilot-cli\r !== 'copilot-cli'` would fail.

**BUG FOUND — SEVERITY: MEDIUM (Windows CRLF)**

If any `.md` file is saved with Windows line endings, `parseFrontmatter` will include `\r` in values since the regex and split only handle `\n`. The `trim()` on line 21 strips outer whitespace but `\r` within the value after the colon split is NOT trimmed because `value = line.slice(colonIdx + 1).trim()` DOES call trim which strips `\r`.

Wait — re-checking: `.trim()` removes `\r` (it strips all whitespace including `\r`). So this is actually safe.

**Revised Verdict: PASS** — `.trim()` handles `\r` correctly.

### Section 5 Overall: **FAIL** (path traversal vulnerability in 5.1)

---

## Summary Table

| # | Area | Verdict | Issues |
|---|------|---------|--------|
| 1 | T2 Frontmatter Engine/Model Binding | **PASS** | None |
| 2 | T3 Usage Tracking | **CONDITIONAL PASS** | Race condition on concurrent writes for different roles (medium) |
| 3 | Auto-Precipitation Logic | **CONDITIONAL PASS** | Misleading description text (low) |
| 4 | roster_check Enhancement | **PASS** | Duplicated threshold logic (maintenance concern) |
| 5 | Edge Cases | **FAIL** | Path traversal via unsanitized role names (high) |

---

## Bugs Found

### BUG-1: Race Condition in T3 Usage Log (MEDIUM)
- **Where:** `trackT3Usage()` in `worker-spawner.ts:77-89`
- **What:** Read-modify-write cycle on `t3-usage-log.json` is not atomic. Concurrent workers for different T3 roles can overwrite each other's entries.
- **Impact:** Lost usage data, delayed precipitation.
- **Fix:** Use a file-level mutex or flock for all T3 log write operations.

### BUG-2: Path Traversal via Unsanitized Role Names (HIGH)
- **Where:** `worker-spawner.ts:107`, `worker-spawner.ts:316-317`, `mcp-server.ts` lock file paths
- **What:** Role names containing `..` or `/` can escape the intended directory.
- **Impact:** Arbitrary file write within workspace boundaries.
- **Fix:** Sanitize role names: `role.replace(/[^a-zA-Z0-9_-]/g, '')` or validate that resolved path stays within parent.

### BUG-3: Misleading Precipitation Description (LOW)
- **Where:** `worker-spawner.ts:120`
- **What:** Says "after N successful invocations" but N is total invocations count, not successes.
- **Fix:** Change to `entry.successes` or change text to "after N total invocations".

---

## Final Recommendation

### **CONDITIONAL APPROVE**

The core T3-to-T2 precipitation system is well-designed and the happy path works correctly. Engine/model frontmatter binding is clean, threshold math is correct, and the roster_check display is functional.

**Blocking for merge:**
- **BUG-2 (Path Traversal)** must be fixed before merge. This is a security issue that allows writing files outside intended directories via crafted role names.

**Should fix (non-blocking):**
- **BUG-1 (Race Condition)** — acceptable risk for now given the ConcurrencyGovernor limit of 3 workers, but should be addressed before scaling.
- **BUG-3 (Description Text)** — trivial fix.

**Merge readiness:** Fix BUG-2, then APPROVE.
