# Proposal v3: T3/T2/T1 Three-Layer Agent Architecture

## Background
Through multiple rounds of discussion and council review, the Persona/Agent model has been refined. The key breakthrough: T3 is not a "fallback" or "temporary worker" — it IS the standard LLM agent that already exists. Each tier adds a layer of specialization on top.

## The Three-Layer Model

```
T3: Standard Base LLM — Raw LLM capability. "You are an architect." Works out of the box. Zero state.
T2: Role (Template)   — Curated template layered on T3. Adds principles, constraints, behavior norms. Stateless.
T1: Agent (Instance)  — T2 Role instantiated in a project. Adds project session, experience, and memory. Stateful.
```

### Analogy:
```
T3 = A random senior engineer you pull off the street     (competent, generic)
T2 = A company's "Senior Architect" Job Description/Playbook (aligned, principled, but abstract)
T1 = The Architect who has been on YOUR project for 3 months (experienced, contextual, has memory)
```

### Tier Definition Table:

| Tier | Name | What it IS | Where it lives | State | Example |
|------|------|-----------|----------------|-------|---------|
| T3 | Base LLM | Raw baseline LLM | Nowhere (implicit in LLM) | Stateless | "You are an architect. Review this proposal." |
| T2 | Role | Curated role template with principles | `optimus-plugin/roles/` | Stateless (read-only) | architect.md with core_principles, constraints |
| T1 | Agent | Role + project memory & context | `.optimus/agents/` | Stateful (knowledge, experience) | architect.md with 3-month project history |

### The Cascade is Additive, Not Degrading:
```
T1 = T2 + Project Memory (Learnings, Bug fixes, Codebase context)
T2 = T3 + Role Principles (Coding standards, Job responsibilities)
T3 = Base LLM capability (Claude/GPT raw intellect)
```

Old mental model (WRONG):
  "T3 is an inferior fallback when T2 is missing"

New mental model (CORRECT):
  "T3 is what every LLM already is. T2 adds value. T1 adds more value.
   Even without T2 or T1, T3 is still competent — it's Claude/GPT being themselves."

### What This Changes:

| Aspect | Old Design | New Design |
|--------|-----------|------------|
| T3 meaning | "Temporary worker, fallback" | "Base LLM, the raw baseline" |
| T2 meaning | "Global agent" | "Role — stateless template with domain principles" |
| T1 meaning | "Local persona" | "Agent — Stateful instance = T2 + Project Memory" |
| Auto-generation | "Panic: no persona found, generate" | "Normal: T3 is base. T3 is **forbidden** from writing T2 roles." |
| Directory: plugin | `optimus-plugin/agents/` | `optimus-plugin/roles/` (pure templates) |
| Directory: project| `.optimus/personas/` | `.optimus/agents/` (stateful entities) |

### The Lifecycle Flow:
```
User: "Find an architect to review this"

1. Check .optimus/agents/architect.md     → Found? → T1 Agent (has memory & project experience)
2. Check plugin/roles/architect.md        → Found? → Instantiate T2→T1 (new to project, create memory)
3. Neither exists?                        → T3 Base LLM (raw capability)
```

### Role (T2) File Format — Minimal, Principled:
```markdown
---
role: architect
tier: T2
---
# Architect
You are a software architect.

## Responsibilities
- Produce architectural reviews and identify structural bottlenecks
- Evaluate security attack surfaces and performance risks
- Provide actionable technical recommendations

## Constraints
- Never couple business logic to UI frameworks
- All state management must flow through the blackboard (.optimus/)
- Fail loudly; never swallow errors silently
```

### Agent (T1) File Format — T2 + Project Memory:
```markdown
---
role: architect
tier: T1
role_source: optimus-plugin/roles/architect.md
session_id: 4f56ed52-343e-4d2e-b46d-a28779968932
created_at: 2026-03-10T01:28:47.988Z
---
# Architect (Project Instance)

## Project Memory & Experience
- [x] Reviewed CWE-22 path traversal fix in dispatch_council
- [x] Adopted the "Issue First" tracking protocol
- [x] Understood T1/T2/T3 cascade architecture
```

### Tool + Skill Pairing Rule:
Every MCP tool must ship with a paired Skill (operation manual). This is orthogonal to the T3/T2/T1 hierarchy:
```
MCP Tool (capability)    ←→    Skill (instruction manual)
dispatch_council         ←→    council-review/SKILL.md
delegate_task            ←→    delegate-task/SKILL.md
append_memory            ←→    (needs skill)
github_create_issue      ←→    (needs skill)
```

Skills are NOT personas. Skills teach HOW to use tools. Personas define WHO you are.

## Architecture Review Decisions (2026-03-10)

Following a Map-Reduce Swarm Council execution against this document, the following binding decisions were reached:

1. **Terminology Lock**: `T2 = Role` and `T1 = Agent`. The word "Persona" is officially deprecated because it implies human narrative/memory which belongs to T1, not the stateless T2.
2. **Security & State Gate**: `T3` is **strictly forbidden** from writing or auto-generating T2 Roles. Permitting arbitrary file creation in the plugin's namespace enables prompt-injection and non-deterministic behavior.
3. **Concurrency Safety**: T1 instance files act as the project memory store. Because multiple Swarm sub-agents may run concurrently, file updates (`append_memory` mechanics) must use locking or append-only structures to prevent concurrent overwrite collisions.

## Outstanding Technical Tasks (Issues)
- Rename local/plugin directories (`personas/` -> `roles/` & `agents/`).
- Refactor `worker-spawner.ts` to implement the instantiation sequence without overwriting T1 context.
- Introduce memory atomicity / locking mechanism for stateful T1 instances (Agent Memory).
