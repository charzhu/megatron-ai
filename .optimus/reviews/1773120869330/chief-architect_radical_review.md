● Read optimus-code\.optimus\proposals\ARCH_REVIEW_REQ.md
  └ 20 lines read

---

## Architectural Review — ARCH_REVIEW_REQ.md
**Reviewer:** Chief Architect (Radical / T3 Zero-Shot Outsource)
**Date:** 2026-03-10

---

### Executive Summary

This proposal describes a real system under active extension. The pain points are honestly identified and the review objectives are well-scoped. However, the architecture as described carries **three critical structural risks** that must be resolved before any "next-gen expansion" can be safely layered on top. My verdict: **Hybrid (Accept with Mandatory Structural Preconditions)**.

---

### Critique by Domain

---

#### 1. IPC & Concurrency — ⚠️ CRITICAL RISK

**The Problem:**
The MCP daemon uses stdio streams as its IPC channel. Stdio is inherently *single-stream, unbuffered by default, and non-multiplexed*. When multiple concurrent agents write to stdout simultaneously (e.g., two swarm workers resolving at the same time), you get **interleaved JSON/text frames** — a classic race condition that can corrupt all in-flight messages simultaneously.

**Specific Risks:**
- No lock management = no linearizability guarantee on task dispatch.
- No request queuing = unbounded concurrency, susceptible to process exhaustion.
- No crash-recovery handshake = if the MCP daemon crashes mid-task, agents hang or silently orphan their work.

**Recommendation:**
- Implement a **strict FIFO task queue** with priority lanes (critical / normal / background). Use a library like `p-queue` (Node.js) with concurrency limits.
- Add a **sequence ID + acknowledgement protocol** to every MCP message frame so the caller can detect dropped or out-of-order responses.
- Add a **supervisor heartbeat**: the VS Code extension should ping the MCP daemon every N seconds; if no pong, restart and replay in-flight tasks from a persisted queue snapshot.

---

#### 2. Context Truncation & Resume Semantics — ⚠️ HIGH RISK (DX Friction)

**The Problem:**
Sub-agents hitting token limits with no resume semantics is not just a DX inconvenience — it is an **architectural correctness failure**. Any task that spans multiple LLM calls without a durable checkpoint can produce *partial commits, half-written files, or silent no-ops* that appear successful.

**Specific Risks:**
- No checkpoint = no idempotency. Re-running a truncated agent may double-apply side effects (duplicate GitHub issue comments, duplicate file writes).
- Resume without context = agent re-executes from scratch, wasting tokens and diverging from prior context.

**Recommendation:**
- Define a **Checkpoint Protocol**: every agent must persist its last known good state (current step, file diffs applied, tools called) to `.optimus/tasks/<task-id>/checkpoint.json` before issuing any destructive or external call.
- On restart, the agent reads its checkpoint and fast-forwards. This is the same pattern used by durable workflow engines (Temporal, Azure Durable Functions).
- Token budget awareness should be a **first-class concern**: agents should self-report remaining capacity and proactively hand off to a continuation agent before truncation, not after.

---

#### 3. VS Code vs. Web / HTTP Architecture — ⚠️ MODERATE RISK (Premature Expansion)

**The Problem:**
The proposal asks whether to bridge stdio MCP to WebSockets/HTTP to support remote clients (Epic #13). This is architecturally sound in *intent* but dangerous in *sequencing*. Adding a remote transport layer on top of an unqueued, unrecoverable stdio daemon is building a second floor on a house with no foundation.

**Specific Risks:**
- HTTP/WS overlay without auth = unauthenticated local daemon becomes network-exposed. Any process on the machine (or LAN if bound to 0.0.0.0) can send arbitrary MCP commands.
- Multi-tenant without session isolation = agents from different users sharing the same `.optimus/` directory will clobber each other's state.
- WebSocket reconnection storms can flood the MCP queue if the queue is unbounded.

**Recommendation:**
- **Do not expose HTTP/WS until the queue and crash-recovery work is complete.** Sequence matters.
- When the HTTP layer is added, it must include: mTLS or token-based auth, per-session sandboxed working directories, and rate limiting at the transport layer.
- Consider an **adapter pattern**: keep stdio as the internal canonical transport; write a thin HTTP/WS adapter that translates external requests into queued stdio messages. This preserves local CLI usability and avoids re-architecting the core.

---

#### 4. Agent State Machine — Disk vs. SQLite — ⚠️ MODERATE RISK

**The Problem:**
Flat-file state in `.optimus/tasks/` is simple but does not provide atomic writes, concurrent read safety, or queryable history. Under concurrent agent execution, two agents writing to the same task file without locking will produce **last-write-wins corruption**.

**Specific Risks:**
- Node.js `fs.writeFile` is not atomic on Windows (no `O_TMPFILE` equivalent by default).
- No transactional semantics = partial state updates are visible to other readers mid-write.
- No indexing = as task history grows, file-scan overhead grows linearly.

**Recommendation:**
- **Migrate to SQLite** (via `better-sqlite3`). It provides atomic WAL-mode writes, concurrent readers, and a queryable schema — with zero network dependency and a single file artifact.
- Keep `.optimus/tasks/` for human-readable markdown artifacts (summaries, proposals), but all *machine-readable state* (status, checkpoints, tool call logs) should live in SQLite.
- Define a minimal schema: `tasks(id, status, checkpoint_json, created_at, updated_at)` and `events(task_id, agent_id, event_type, payload, timestamp)`.

---

#### 5. Security Risks Not Mentioned in the Proposal — 🔴 UNADDRESSED

The proposal does not mention security at all. For a system that:
- Executes arbitrary code via sub-agent delegation
- Writes to the local filesystem
- Interacts with GitHub via MCP tools (which carry OAuth tokens)

...the following risks are **unacceptable to leave unaddressed**:

- **Prompt Injection:** A malicious file in the repo could inject instructions into an agent's context, causing it to exfiltrate tokens or make unauthorized GitHub API calls.
- **Token Leakage:** If the MCP daemon logs stdio verbosely (common during debugging), GitHub tokens in tool call parameters will appear in plaintext logs.
- **Unconstrained Tool Scope:** There is no mention of tool call whitelisting per agent role. A Marketing agent should not have `git push` capability.

**Recommendation:**
- Implement a **capability manifest** per agent persona: explicitly enumerate which MCP tools each role is permitted to call. Reject out-of-scope calls at the dispatcher layer.
- Sanitize all external file content before injecting into agent context.
- Rotate and scope GitHub tokens to minimum required permissions.

---

### Final Verdict

| Domain | Status |
|---|---|
| IPC & Concurrency | ❌ Must fix before expansion |
| Context Resume | ❌ Must fix before expansion |
| HTTP/WS Transport | ⏸ Defer until above resolved |
| State Machine (SQLite) | ✅ Accept — migrate now |
| Security | ❌ Must address in parallel |

**Recommendation: HYBRID**

Accept the SQLite state migration immediately. Accept the HTTP/WS expansion *conditionally* — it is the right long-term direction but must not proceed until the task queue, crash recovery, and security capability manifests are in place. The core architecture is sound in concept; the risks are all in the execution layer and can be resolved incrementally without a full rewrite.


> [LOG] 
Total usage est:        1 Premium request
API time spent:         48s
Total session time:     54s
Total code changes:     +0 -0
Breakdown by AI model:
 claude-sonnet-4.6       40.1k in, 2.1k out, 31.2k cached (Est. 1 Premium request)