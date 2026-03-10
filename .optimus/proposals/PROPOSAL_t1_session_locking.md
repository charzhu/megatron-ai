# PROPOSAL: T1 Agent Session Locking & Concurrency Control

## Problem Statement
The Master Agent can theoretically send multiple back-to-back or concurrent tasks to the *same* T1 Agent (e.g., `chief-architect`). However, a single T1 Agent owns a single, stateful Session ID representing a single execution thread in the underlying CLI database.

Because a single Agent/Session can only do one thing at a time:
1. Pumping concurrent tasks into the exact same Session ID will cause the underlying CLI (e.g., Claude Code or Copilot) to potentially crash, hang, or result in an SQLite database lock.
2. We need a way to declare a T1 Agent "Busy" when executing, and queue, block, or redirect subsequent requests for the same identity until it is "Free".

## Core Architectures to Consider
How do we track and enforce these locks efficiently entirely within our decoupled Node.js MCP server without a heavy external database?

### Option A: The Filesystem Mutex (PID / Lockfile)
When `worker-spawner.ts` dispatches a task to `.optimus/agents/qa-engineer.md`:
- We write a lock file alongside it, e.g., `.optimus/agents/qa-engineer.md.lock`, containing the current `pid` of the assigned process.
- If another request asks for `qa-engineer`, the Spawner sees the lockfile, and either fails fast ("Agent is Busy") or queues the promise to wait.
- **Risk:** Stale locks if Node crashes. Requires robust crash/exit handlers to wipe the lockfile.

### Option B: Frontmatter State Writing
- Update the YAML frontmatter inside `qa-engineer.md` right before `spawn` happens: `status: busy`. Then write `status: free` upon exit.
- **Risk:** This triggers massive filesystem churn. File watches might freak out. It also introduces potential race conditions between read/writes if not synced atomically.

### Option C: Node.js In-Memory Map (The MCP Server Runtime State)
- We maintain a basic `Map<string, Promise>` or Set in `mcp-server.ts` or `worker-spawner.ts` (e.g., `activeAgents.add('qa-engineer')`).
- Since the Node.js MCP process is a persistent daemon that survives across the entire VS Code session, an in-memory map accurately reflects real-time status.
- **Risk:** It loses state if the MCP server restarts mid-task, essentially freeing up an agent while the spawned detached process might theoretically continue running in some edge cases.

## The Objective
Please review these approaches. Focus heavily on avoiding SQLite `SQLITE_BUSY` crashes while adhering to our "No heavy dependencies" rule. Pick the most robust option or propose a better Hybrid one, providing your strict recommendation on how to implement this lock.