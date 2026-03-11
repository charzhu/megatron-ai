---
name: council-review
description: Orchestrates a parallel Map-Reduce architectural review by spawning multiple specialized expert agents to critique a proposal.
---

This project utilizes an artifact-driven "Blackboard Pattern". The actual "Experts" are implemented by the underlying Optimus MCP Subsystem which spins up physically isolated, concurrent background CLI worker processes (The Spartan Workers).

## How to execute a Council Review:

### Step 1: Draft the Initial Proposal (The Scatter)
1. Do your initial analysis of the user's request.
2. Draft your preliminary design.
3. Write this design securely to the Blackboard as a markdown file. To prevent parallel conflicts from multiple requests running at the same time, give it a unique name per task: e.g., `.optimus/proposals/PROPOSAL_<task_topic>.md`.

### Step 2: Roster Inspection (Pre-Flight)
1. Call `roster_check` with the current `workspace_path` to inspect available T1 agents, T2 roles, T3 engines, and skills.
2. Based on the proposal topic, decide which expert roles to summon. You can use:
   - **Existing T2 roles** if they match the needed expertise
   - **New descriptive role names** for dynamic T3 outsourcing (e.g., `security-expert`, `performance-expert`)
3. For each role, consider what `role_description` and `role_engine`/`role_model` are appropriate. The system will auto-create T2 templates on first use.

Commonly requested dynamic roles:
- `performance-expert`: Evaluates Big-O complexity, database query counts.
- `security-expert`: Checks for injection vectors, auth/authz bypass.
- `refactoring-architect`: Identifies code smelles, outlines clean abstractions.

### Step 3: Request the Council Dispatch via MCP Tool
1. Tell the user you have finalized the `PROPOSAL_<task_topic>.md` and are requesting the Orchestrator to dispatch the expert council.
2. You MUST use your available MCP tool `dispatch_council_async` (preferred) or `dispatch_council` to trigger the underlying concurrency engine.
3. Pass the `proposal_path`, the `roles` (array of strings), and the `workspace_path`.

**(Experts are instantiated on-demand via the T3→T2→T1 lifecycle. Just use descriptive role names — the system handles the rest.)**

### Step 4: Non-Blocking Status Check and Result Collection (The Gather)
1. If using `dispatch_council_async`, the tool will return a `taskId`. Treat this as a fire-and-forget background task.
2. Do **NOT** block the main flow with manual waiting or sleep commands. Do **NOT** pause just to wait for completion.
3. Instead, tell the user the council is running asynchronously and that `check_task_status` can be used later to inspect progress or completion.
4. If you need the results in the same session, poll with `check_task_status` only when useful, while continuing other productive work in the meantime.
5. The status tool will return a precise folder path matching the isolated execution timestamp (e.g., `.optimus/reviews/<timestamp>/`).
6. Once the task is marked `completed`, read the generated review files from that directory (e.g., `<role>_review.md`).

### Step 5: Arbitration and Action (The Arbiter)
Analyze the gathered reviews.
- **If there are NO blockers**: Implement the suggestions and output the final `.optimus/TODO.md` file (the implementation backlog).
- **If there are FATAL conflicts**: Create `.optimus/CONFLICTS.md` outlining the opposing viewpoints cleanly, pause, and ask the User to arbitrate.