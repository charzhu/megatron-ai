# Proposal: T1 Pre-Creation + Session Backfill + Complete Self-Evolution Loop

## Date: 2026-03-11 (Updated Architecture)

## Context
This is a follow-up review to the earlier self-evolving architecture proposal. Several critical improvements have been made since then.

## Architecture Changes Since Last Review

### 1. T1 Placeholder Pre-Creation
**Before**: T1 was only created AFTER task completion AND only if session_id was returned.
**After**: T1 is created as a placeholder BEFORE task execution:
- `status: running` + `session_id: ''` at creation
- Backfilled to `status: idle` + `session_id: xxx` after completion
- T1 exists even if task crashes (stale lock cleanup handles this)

### 2. Master-Driven T2 Lifecycle
All T2 role info now comes structured from Master Agent via `delegate_task`:
- `role_description`: What the role does (written into T2 template body)
- `role_engine`: Which engine to use
- `role_model`: Which model
- Master can update T2 anytime (team evolution). T1 instances are frozen snapshots.

### 3. Skill Pre-Flight + Meta-Skill Bootstrap
- `required_skills` parameter: system verifies all exist before execution, rejects with missing list
- Found skills auto-injected into agent prompt
- Two meta-skills enable self-evolution:
  - `agent-creator`: teaches team building
  - `skill-creator`: teaches capability creation
- `delegate-task` skill is the base layer (owns selection + dispatch)
- `council-review` skill depends on `delegate-task` for roster logic (DRY)

### 4. Engine/Model Fallback Chain
Priority: Master override → T2 frontmatter → available-agents.json → `claude-code`

### 5. Zero-Config Init
No pre-installed roles or agents. System bootstraps at runtime via T3→T2→T1. Only ships config + skills.

## Questions for Technical Deep-Dive

### Concurrency & State
1. T1 placeholder has `status: running`. What if two concurrent tasks target the same role? The lock manager serializes same-role, but is the T1 status properly handled across async boundaries?
2. If a task crashes mid-execution, T1 stays `status: running` forever. The stale lock cleanup exists but only cleans `.lock` files, not the T1 frontmatter status. Should there be a reaper for stale `running` T1s?

### T2 Evolution Safety
3. Master can update T2 at any time. But if T2 is updated WHILE a T1 is being created from it (race condition between ensureT2Role and T1 placeholder creation), is the T1 consistent?
4. Should T2 updates trigger any notification to existing T1 instances? (Currently no — T1 is frozen.)

### Skill System Depth
5. Skills are injected as raw text into prompts. At scale (10+ skills), this bloats the context window. Should there be a skill selection/pruning mechanism?
6. The skill-creator creates skills based on Master's text description. But skill quality depends entirely on that description. Should there be a skill validation step?

### Meta-Architecture
7. The two meta-skills (agent-creator, skill-creator) are pre-installed. If they get corrupted, the system can't self-heal. Should they be checksummed or restorable from the plugin package?
8. Is the `delegate-task` → `council-review` layering sufficient, or should there be more formal dependency declaration (e.g., `depends_on` in SKILL.md frontmatter)?

### Observability
9. roster_check now shows T1/T2/T3/Skills. But there's no history view. Should there be a `task-history` or `agent-audit-log` for debugging delegation chains?
10. How does a human user (not Master Agent) understand what the swarm has been doing? Is the GitHub Issue trail sufficient?
