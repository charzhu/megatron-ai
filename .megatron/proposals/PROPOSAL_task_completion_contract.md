# PROPOSAL: Enforced Task Completion Contract via GitHub Issue State

## Problem Statement

When using `delegate_task_async`, the Master Agent dispatches work to a sub-agent and receives a Task ID. The current completion signal is:
1. `check_task_status` returns `completed` (based on process exit)
2. The output file exists at `output_path`

**However, neither guarantees the agent actually finished its job correctly.** The tech-lead for Issue #51 completed the process but wrote code directly to source files instead of the `output_path`. The QA agent may similarly "complete" (process exits) without actually writing its report.

Current failure modes:
- Agent process exits with code 0 but `output_path` is empty or missing
- Agent partially completes work (writes some files, misses others)
- Agent silently fails but process still exits cleanly
- No way for the Master to distinguish "completed successfully" from "ran but didn't do what was asked"

## Proposed Solution: GitHub Issue as Mandatory Completion Signal

### Core Principle
Every `delegate_task` / `delegate_task_async` call MUST be bound to a GitHub Issue. The agent's **contract** is not fulfilled until the Issue state reflects completion.

### Mechanism

#### Option A: Issue Comment as Completion Proof
- Each delegated task includes `github_issue_number` as a required parameter
- The agent MUST post a structured comment to the Issue upon completion:
  ```
  ## Agent Completion Report
  - **Role**: qa-engineer
  - **Task ID**: task_xxx
  - **Status**: PASS / FAIL / PARTIAL
  - **Artifacts**: [list of files created/modified]
  - **Summary**: <one-line result>
  ```
- `check_task_status` enhanced to verify BOTH process exit AND Issue comment existence

#### Option B: Issue Label/State Transition
- Agent must transition the Issue from `in-progress` → `review-needed` (or `done`)
- Master polls Issue state via `github_sync_board` or a new `github_get_issue_status` tool
- Simpler than Option A but less informative

#### Option C: Hybrid (Recommended)
- Process exit + output_path check remains the **fast path** (status: `completed`)
- GitHub Issue comment is the **verification layer** (status: `verified`)
- `check_task_status` returns a richer status:
  - `running` → process alive
  - `completed` → process exited, output_path exists
  - `verified` → GitHub Issue has agent completion comment
  - `failed` → process exited but output_path missing or Issue flagged

### Schema Change for `delegate_task_async`
```typescript
// New optional parameter
github_issue?: {
  owner: string;
  repo: string; 
  issue_number: number;
}
```

### Agent System Prompt Injection
When `github_issue` is provided, append to the agent's task prompt:
```
MANDATORY COMPLETION PROTOCOL:
Upon finishing your work, you MUST use the github_update_issue tool to post 
a completion comment on Issue #<N> with your status, artifacts list, and summary.
Your task is NOT considered complete until this comment is posted.
```

## Questions for Council
1. Is GitHub Issue the right "single source of truth" for completion, or is it over-engineering?
2. Should `github_issue` be required or optional on `delegate_task_async`?
3. How do we handle agents that don't have GitHub token access?
4. Should we add a timeout + auto-fail mechanism if the agent runs longer than X minutes without posting?
5. Does this create a circular dependency (agent needs MCP tools to report, but MCP server is also tracking the agent)?
