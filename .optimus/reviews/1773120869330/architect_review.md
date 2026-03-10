● Read optimus-code\.optimus\proposals\ARCH_REVIEW_REQ.md
  └ 20 lines read

● Read optimus-code\.optimus\personas\architect.md
  └ 13 lines read

● List directory optimus-code
  └ 31 files found

● Explore: Explore MCP server architecture
  ● Read optimus-code\src\managers\MemoryManager.ts
    └ 55 lines read
  ● Read optimus-code\README.md lines 1-100
    └ 73 lines read

---

# 🏛️ Architect Review — `ARCH_REVIEW_REQ.md`
**Session:** `4f56ed52-343e-4d2e-b46d-a28779968932` | **Reviewer:** T1 Architect | **Date:** 2026-03-10

---

## Executive Assessment

This is a well-intentioned proposal, but it diagnoses symptoms while under-specifying the root causes. The three review objectives are the *right* questions, but the proposal lacks the specificity needed to action them. My critique follows.

---

## 🔴 Critical Findings (Reject without mitigation)

### 1. File-System Race Conditions — Real, Not Theoretical

The proposal calls this "theoretical." It is not. Direct code analysis reveals:

- **`MemoryManager.ts`** uses `fs.appendFileSync()` on `.optimus/state/memory.md` with **zero locking**. When `dispatch_council` fires `Promise.all()` across 6+ simultaneous workers, all of them can call `appendFileSync` concurrently. On Node.js, synchronous FS calls serialize *within a single process*, but workers spawn separate CLI processes (via `GitHubCopilotAdapter`). Cross-process writes to the same file with no advisory lock = **guaranteed corruption at scale**.

- **`SharedTaskStateManager`**: The `getTasks() → modify → saveTasks()` pattern uses async `globalState.update()` without a write mutex. Two concurrent turns calling `completeTurn()` will silently overwrite each other's state.

- **TOCTOU in `worker-spawner.ts`**: `fs.existsSync()` → `fs.mkdirSync()` for persona localization. Under concurrent council dispatch, two workers localizing the same persona simultaneously will collide.

**Required fix before accepting:** Introduce a cross-process file lock (e.g., `proper-lockfile` npm package) for all shared `.optimus/` writes, and serialize `globalState` mutations through a promise chain or async mutex.

---

### 2. The In-Memory Task Queue is a Reliability Liability

`ChatViewProvider.ts` uses a plain JavaScript array (`taskQueue: []`) with manual `finally`-block processing. This queue **lives entirely in the VS Code extension host process**. It has no:
- Persistence (VS Code crash → queue lost)
- Backpressure (unbounded array growth under load)
- Dead-letter handling (failed tasks silently drop)

This is acceptable for a prototype, but is a hard blocker for any multi-tenant or remote-client architecture described in Epic #13.

---

### 3. No Agent Timeout or Circuit Breaker

`worker-spawner.ts` spawns CLI subprocesses with `Promise.all()` and no timeout. A single hung Claude/Copilot CLI worker blocks the entire council result indefinitely. There is no:
- `Promise.race()` with a deadline
- Process kill signal on timeout
- Partial result recovery

**Blast radius:** One flaky LLM API call starves the entire council dispatch, blocks the UI, and leaks orphaned child processes.

---

## 🟡 Architectural Bottlenecks

### 4. stdio-Only MCP Transport is a Dead End for Remote Clients

The MCP server uses `StdioServerTransport` exclusively. This is correct and sufficient for a **local VS Code extension**. But Epic #13 (multi-tenant frontend) cannot be built on top of stdio without a complete transport rewrite. The proposal asks whether to add an HTTP overlay — the answer is: **yes, but not on the current monolith**.

Recommendation: The MCP server should remain stdio-native for local VS Code use. A separate, thin **HTTP/WebSocket gateway** (e.g., `Fastify` + `ws`) should wrap the same tool handlers and serve remote clients. Do not conflate the two transports in `mcp-server.ts` — that leads to a bloated single process trying to serve two very different clients.

### 5. `.optimus/tasks/` as State Store is Unqueryable

Flat markdown files in `.optimus/tasks/` work fine for human inspection but are operationally blind:
- No way to query "all in-progress tasks for session X"
- No atomic updates
- No transaction support
- File enumeration as a query mechanism is O(n) I/O

The proposal correctly identifies SQLite as the remedy. **This is the right call.** SQLite with WAL mode provides:
- Single-writer, multi-reader semantics (solves the race condition above)
- `SELECT`/`UPDATE` atomicity
- Zero network overhead
- Works perfectly in a VS Code extension context

**Migrate `.optimus/tasks/` and `SharedTaskStateManager` to a single SQLite DB** (`~/.optimus/optimus.db`). Keep markdown files as human-readable export artifacts only.

---

## 🟠 Developer Experience Friction

### 6. The 1500-Line `ChatViewProvider.ts` is an Antipattern

This file handles: WebView HTML generation, message routing, task queuing, session management, agent delegation, image attachment processing, streaming, and memory management. It is a God Object.

DX impact: New contributors cannot reason about it. Every feature addition risks unintended side effects across unrelated concerns. Refactor into:
- `WebViewRenderer.ts` — HTML/JS generation only
- `MessageRouter.ts` — postMessage dispatch
- `SessionManager.ts` — session history and memory
- `AgentOrchestrator.ts` — delegation, council, queue

### 7. Prompt Files Written to Disk for CLI Arg Limit Workaround

`PersistentAgentAdapter.ts` writes prompts to `.optimus/runtime-prompts/` to bypass CLI argument length limits. This is a pragmatic hack that:
- Leaks sensitive prompt content to the filesystem
- Requires cleanup logic (which may fail)
- Introduces more TOCTOU exposure

**Preferred pattern:** Use `stdin` piping instead of temp files where the CLI supports it, or move to an in-process SDK call.

---

## 🔵 Security Risks

### 8. Prompt Injection via `.optimus/` File Reads

Persona files, memory files, and task files are read directly into LLM prompts without sanitization. If any external content (e.g., a PR description from GitHub, a code comment) is written into `memory.md` or a task file, an attacker can inject instructions into the agent's system prompt.

This is not hypothetical — the system already syncs GitHub Issue content into `.optimus/state/TODO.md`. A malicious issue body = prompt injection.

**Mitigation:** Sanitize/fence all externally-sourced content before appending to prompt-injected files. Use structured JSON task files instead of freeform markdown for machine-read state.

### 9. `.env` in the Project Root

`dotenv` loads from `.env` which (per `.gitignore` inspection) likely contains API keys. No secrets management beyond `.gitignore` is in place. For any multi-tenant architecture, these secrets must move to a proper secrets store (VS Code `SecretStorage` API, or a vault).

---

## 📋 Responses to the Three Review Objectives

| Objective | Recommendation |
|---|---|
| **IPC & Subprocess Control** | Add `proper-lockfile` for cross-process FS locks. Add `Promise.race()` timeouts on all worker spawns (30s recommended). Implement a persistent task queue backed by SQLite (see below). |
| **VS Code vs. Web Architecture** | Keep stdio MCP for VS Code. Build a separate `@optimus/gateway` package (Fastify + WebSocket) that imports the same tool handlers. Do NOT fork `mcp-server.ts` — share the tool layer. |
| **Agent State Machine** | **Migrate to SQLite immediately.** WAL mode resolves the race condition without introducing external dependencies. Schema: `tasks`, `sessions`, `memory_entries`, `council_runs`. Keep `.optimus/` for human-readable exports only. |

---

## 🏁 Final Recommendation: **HYBRID — Accept with Required Conditions**

The proposal's diagnosis is accurate but incomplete, and the architecture has real (not theoretical) correctness bugs that must be fixed before any expansion. 

**Accept** the strategic direction: SQLite state, HTTP gateway for remote clients, subprocess hardening.

**Reject** any expansion work (Epic #13, remote clients, multi-tenancy) until:
1. ✅ File-system race conditions are resolved (locking or SQLite migration)
2. ✅ Worker timeout/circuit-breaker is implemented
3. ✅ `ChatViewProvider.ts` is decomposed (DX pre-requisite for safe future work)
4. ✅ Prompt injection surface is audited and fenced

The foundation is sound. Ship stability before scale.


> [LOG] 
Total usage est:        1 Premium request
API time spent:         2m 10s
Total session time:     2m 27s
Total code changes:     +0 -0
Breakdown by AI model:
 claude-sonnet-4.6       86.2k in, 2.8k out, 73.2k cached (Est. 1 Premium request)
 claude-haiku-4.5        458.5k in, 5.9k out, 377.5k cached (Est. 0 Premium requests)