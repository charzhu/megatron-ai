---
name: agent-creator
description: Teaches the Master Agent how to build, select, and evolve the agent team. Use when creating new roles, selecting specialists for a task, or evolving existing role descriptions. Also use when delegate_task fails because a role has weak or missing context.
---

# Agent Creator

You are building and managing a team of specialized AI agents. Each new role you
create becomes a persistent member of the project's workforce — its description
directly shapes how well the agent performs. Invest in quality descriptions the
same way you would invest in writing a good job posting.

## Core Process

**1. Inspect the Roster**

Before creating or selecting a role, always call `roster_check` to see who's
already available. This returns T1 agents (with session history), T2 roles
(reusable templates), and the engine/model pool.

**2. Select or Create the Role**

Match the task to an existing role, or create a new one:
- **Existing T1/T2**: Prefer roles that already have project context
- **New role**: Invent a hyphenated name (e.g., `data-pipeline-engineer`) and
  provide a rich description

**3. Write the Role Description**

This is the most important step. The `role_description` you provide becomes the
agent's entire persona. Follow this structure:

```
{role title} responsible for {domain}.

Core Responsibilities:
- {specific action with concrete deliverable}
- {specific action with concrete deliverable}
- {specific action with concrete deliverable}
- {specific action with concrete deliverable}

Quality Standards:
- {what "done well" looks like}
- {constraints or boundaries}
```

**Example** — compare the quality difference:

```
❌ Bad:  "A developer who writes code"
✅ Good: "Backend Developer specializing in Node.js API development.

         Core Responsibilities:
         - Implement REST and GraphQL endpoints following project conventions
         - Write integration tests covering happy paths and error cases
         - Ensure all database queries use parameterized inputs (SQL injection prevention)
         - Follow Conventional Commits and create PRs via git-workflow skill

         Quality Standards:
         - All code must build cleanly before PR creation
         - Error handling with actionable messages, not generic catches"
```

**4. Delegate with Full Context**

Pass everything via `delegate_task_async`:

```json
{
  "role": "backend-dev",
  "role_description": "<your rich description>",
  "role_engine": "claude-code",
  "task_description": "<the specific task>",
  "required_skills": ["git-workflow"],
  "output_path": ".optimus/reports/<output>.md",
  "workspace_path": "<project root>"
}
```

Omit `role_model` unless you have a specific reason — the system picks the best
available model automatically.

## Role Naming

- Lowercase, hyphenated: `security-auditor`, not `SecurityAuditor`
- Descriptive: `api-integration-specialist`, not `dev2`
- Characters allowed: `[a-zA-Z0-9_-]`

## Evolution

Roles are living documents. After observing an agent's performance:
- Re-delegate with an improved `role_description` to update the T2 template
- Switch `role_engine` if a different engine performs better for that domain
- Review the roster periodically to retire unused roles

## Anti-Patterns

- **Thin descriptions**: A one-sentence `role_description` produces a nearly
  useless agent. Always provide 3-5 bullet responsibilities.
- **Skipping roster_check**: You'll create duplicate roles or miss existing
  specialists who already have project context.
- **Invalid models**: Only use models listed in `available-agents.json`. The
  system rejects unknown models with a pre-flight error.
- **Editing T1 files**: Agent instance files (`.optimus/agents/`) are managed by
  the system. Edit the T2 role template instead.
