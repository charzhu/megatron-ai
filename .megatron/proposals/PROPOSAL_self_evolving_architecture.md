# Proposal: Megatron Self-Evolving Agent & Skill Architecture

## Date: 2026-03-11

## Summary
Megatron has implemented a self-evolving multi-agent system with the following core architecture:

### 1. T3→T2→T1 Agent Lifecycle
- **T3 (Ephemeral)**: Zero-shot dynamic worker, no file persistence
- **T2 (Role Template)**: `.megatron/roles/<name>.md` with engine/model frontmatter binding. Created immediately on first T3 delegation. Master Agent can evolve over time.
- **T1 (Agent Instance)**: `.megatron/agents/<name>.md` frozen snapshot from T2 + session_id state. Created when task completes.

### 2. Master-Driven Structural Control
- Master Agent provides all T2 info: `role_description`, `role_engine`, `role_model`
- Engine/model resolution chain: Master override → frontmatter → available-agents.json → hardcoded fallback
- Master can update T2 templates to evolve the team. T1 instances are frozen.

### 3. Skill System with Pre-Flight Check
- Skills stored at `.megatron/skills/<name>/SKILL.md`
- `required_skills` parameter in `delegate_task` — system rejects if missing
- Found skills auto-injected into agent prompt
- Bootstrap meta-skills: `agent-creator` (team building) + `skill-creator` (capability creation)

### 4. Skill Dependency Hierarchy
- `delegate-task`: Base skill — owns roster inspection, role selection, skill checking, and dispatch
- `council-review`: Upper-layer — depends on delegate-task for selection logic, adds parallel dispatch + arbitration
- `agent-creator`: Meta — teaches the lifecycle
- `skill-creator`: Meta — teaches how to create new skills

### 5. Zero-Config Bootstrap
- `megatron init` ships no roles/agents — only config, skills, and mcp.json
- System self-bootstraps at runtime via T3→T2→T1 cascade

## Questions for Reviewers

1. **Lifecycle Completeness**: Is the T3→T2→T1 flow robust? Are there edge cases where T2 gets created but T1 never does (e.g., task fails before session capture)?
2. **Skill Dependency Graph**: Is the delegate-task → council-review layering correct? Should there be a formal dependency declaration mechanism (e.g., `depends_on` in SKILL.md frontmatter)?
3. **Meta-Skill Bootstrapping**: Is the "skill-creator creates all other skills" pattern sound? What happens if the skill-creator SKILL.md itself gets corrupted?
4. **T2 Evolution Safety**: Master can update T2 at any time. Should there be versioning or history? Could an update break active T1 instances?
5. **Engine Binding Flexibility**: Is the available-agents.json → frontmatter → Master override resolution chain the right priority? Should per-task engine override be possible independent of the role?
6. **Scalability**: With many T2 roles and skills, does roster_check return too much context? Should there be categorization or pagination?
7. **Security**: Role name sanitization prevents path traversal, but are there other attack vectors in the skill injection or frontmatter parsing?
