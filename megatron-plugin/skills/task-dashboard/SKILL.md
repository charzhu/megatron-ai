---
name: task-dashboard
description: Teaches Master Agent how to inspect swarm runtime state, summarize task health, and flag stale or failed work.
---

# Task Dashboard (Swarm Observability)

This skill teaches you how to inspect background execution state in one pass and present a concise dashboard instead of raw logs.

## When to Use

- Before delegating new work (avoid duplicate dispatches)
- After async dispatches (progress and health checks)
- When the user asks for current swarm status
- During troubleshooting of stuck, partial, or failed tasks
- To audit recent council/delegation outcomes

## Data Sources

All swarm state lives in `.megatron/state/` and `.megatron/agents/`:

| Source | Path | What It Contains |
|--------|------|-----------------|
| **Task Manifest** | `.megatron/state/task-manifest.json` | All `delegate_task` and `dispatch_council` records (`status`, role/roles, output, timing, issue links) |
| **T1 Agent Status** | `.megatron/agents/<name>.md` frontmatter `status` field | `running` = currently executing, `idle` = available |
| **T3 Usage Log** | `.megatron/state/t3-usage-log.json` | Invocation counts, success rates per dynamic role |
| **Lock Files** | `.megatron/agents/<name>.lock` | Which agents are currently locked by a running process |

## Dashboard Procedure

### Step 1: Read Once, Do Not Poll

Read `.megatron/state/task-manifest.json` exactly once for the snapshot.

If a single task needs a live refresh, use `check_task_status` for that task only.

### Step 2: Normalize Entries

For each manifest entry:

- Determine task kind: `delegate_task` or `dispatch_council`
- Determine owner display:
  - `role` for `delegate_task`
  - `roles.join(', ')` for `dispatch_council`
- Compute elapsed time from `startTime`
- Keep `status`, `output_path`, and `github_issue_number` when present

If a field is missing, render `n/a` instead of dropping the row.

### Step 3: Build Health Summary

Compute counts for:

- `running`
- `completed`
- `verified`
- `partial`
- `failed`

Also produce:

- **Recent completions**: last 5 by newest `startTime` with status `completed` or `verified`
- **Stale running tasks**: `running` longer than 10 minutes
- **Failure list**: all `failed` entries with `error_message`

### Step 4: Cross-Check Agent Runtime State

Read `.megatron/agents/*.md` frontmatter status and compare with lock files:

- `status: running` + lock exists: healthy running
- `status: running` + no lock: possibly stale/abandoned
- `status: idle` + lock exists: lock leak candidate

### Step 5: Present Concisely

Use a concise report with three sections:

1. **Overview counts**
2. **Running / stale / failed highlights**
3. **Recent completions**

Never paste the raw manifest JSON into chat.

## Manifest Fields

Read `.megatron/state/task-manifest.json`. Each entry has:

```json
{
  "task_xxx": {
    "type": "delegate_task" | "dispatch_council",
    "status": "running" | "completed" | "verified" | "partial" | "failed",
    "role": "qa-engineer",          // for delegate_task
    "roles": ["chief-architect", "security"],  // for dispatch_council
    "output_path": ".megatron/reports/...",
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

When asked to show swarm status, use this compact format:

```markdown
## Swarm Task Dashboard

- Total: 18
- Running: 2
- Completed: 3
- Verified: 10
- Partial: 1
- Failed: 2

### Running
- task_... | role: qa-engineer | 4m 12s
- council_... | roles: chief-architect, security | 12m 04s | STALE

### Failed
- task_... | role: dev | error: MCP timeout

### Recent Completions (latest 5)
- task_... | verified | role: pm | #71
- council_... | completed | roles: architect, qa-engineer | #70
```

### Minimum Required Signals

Include at least:

- Running tasks with elapsed time
- Stale marker for `running > 10m`
- Failed tasks with `error_message`
- Last 5 completed/verified entries
- Count summary across all statuses

## How to Check Specific Tasks

Use `check_task_status` with `taskId` when:

- A task appears stale
- A user asks for a single task update
- A dependency requires confirmation before next step

Prefer targeted checks over repeated global polling.

## Anti-Patterns

- Do NOT dump the full manifest JSON into chat
- Do NOT poll in a loop; read once and summarize
- Do NOT mutate `.megatron/state/task-manifest.json` (append-only audit record)
- Do NOT claim a task is stuck without checking elapsed time and lock/frontmatter signals
- Do NOT block the conversation waiting for all background tasks to finish
