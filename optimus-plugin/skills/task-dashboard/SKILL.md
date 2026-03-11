---
name: task-dashboard
description: Teaches Master Agent how to inspect the swarm's task history, running agents, and delegation audit trail.
---

# Task Dashboard (Swarm Observability)

This skill teaches you how to inspect the current state of all background tasks, running agents, and delegation history within the Optimus Spartan Swarm.

## When to Use

- Before delegating to check if a similar task is already running
- After dispatching async tasks to monitor progress
- When the user asks "what's going on?" or "what is the swarm doing?"
- To audit past delegations and council reviews
- To identify stale/crashed agents

## Data Sources

All swarm state lives in `.optimus/state/` and `.optimus/agents/`:

| Source | Path | What It Contains |
|--------|------|-----------------|
| **Task Manifest** | `.optimus/state/task-manifest.json` | All delegate_task and dispatch_council records (status, role, output_path, timestamps) |
| **T1 Agent Status** | `.optimus/agents/<name>.md` frontmatter `status` field | `running` = currently executing, `idle` = available |
| **T3 Usage Log** | `.optimus/state/t3-usage-log.json` | Invocation counts, success rates per dynamic role |
| **Lock Files** | `.optimus/agents/<name>.lock` | Which agents are currently locked by a running process |

## How to Read Task Manifest

Read `.optimus/state/task-manifest.json`. Each entry has:

```json
{
  "task_xxx": {
    "type": "delegate_task" | "dispatch_council",
    "status": "running" | "completed" | "verified" | "partial" | "failed",
    "role": "qa-engineer",          // for delegate_task
    "roles": ["chief-architect", "security"],  // for dispatch_council
    "output_path": ".optimus/reports/...",
    "startTime": 1773197118716,
    "github_issue_number": 70
  }
}
```

### Status Meanings

| Status | Meaning |
|--------|---------|
| `running` | Task is currently executing in background |
| `completed` | Process exited successfully, output may exist |
| `verified` | Output path confirmed to exist and be non-empty |
| `partial` | Process exited but output is missing or empty |
| `failed` | Task errored out (check `error_message`) |

## How to Present a Dashboard

When asked to show swarm status, read the task manifest and present a summary table:

1. **Running tasks** — List all `status: running` entries with their role, type, and elapsed time
2. **Recent completions** — Show the last 5 completed/verified tasks
3. **Failed tasks** — Highlight any failed tasks with their error messages
4. **Agent status** — Read T1 agent `.md` files and report which ones have `status: running` vs `idle`
5. **Stale detection** — If a task has been `running` for over 10 minutes, flag it as potentially stale

## How to Check Specific Tasks

Use the `check_task_status` MCP tool with the `taskId` for real-time status of a specific task.

## Anti-Patterns

- Do NOT read the entire task-manifest into the user's chat — summarize it
- Do NOT poll task-manifest in a loop — read it once and present
- Do NOT delete or modify task-manifest entries — it's an append-only audit log
