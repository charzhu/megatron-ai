---
name: feature-dev
description: Guided 7-phase feature development workflow. Use when the user requests a new feature, complex implementation, or multi-file change. Master Agent gathers requirements from the user, then delegates everything to PM who drives exploration, architecture, implementation, and review autonomously.
---

# Feature Development Workflow

A structured 7-phase approach to building features. No user interaction after
Phase 1 — Master Agent collects all requirements upfront, PM runs the rest
autonomously.

## Orchestration Model

```
User ↔ Master Agent (collect requirements)
           │
           ├─ Phase 1: delegate_task (sync) → PM (requirements review + questions)
           │            Master answers PM's questions, PM produces requirements doc
           │
           └─ delegate_task_async → PM (Phase 2-7, autonomous)
                ├─ Phase 2: dispatch_council (sync) → code-explorer ×2-3
                │            PM answers explorers' questions using requirements doc
                │            Output: requirements doc + project context
                ├─ Phase 3: dispatch_council (sync) → code-architect ×2-3
                │            PM summarizes, picks best approach
                ├─ Phase 4: delegate_task (sync) → dev
                ├─ Phase 5: dispatch_council (sync) → code-reviewer ×3
                └─ Phase 6: PM summarizes, updates VCS work item
```

---

## Phase 1: Requirements Alignment (Master Agent ↔ PM, sync)

**Who**: Master Agent delegates to PM using `delegate_task` (synchronous).

**Goal**: PM reviews the user's feature request and surfaces clarifying questions.
Master Agent answers them (the Master already has the user's full context).
PM produces a **requirements document**.

Flow:
1. Master Agent bundles the user's request into a task description for PM
2. PM reads the request and returns:
   - Confirmed understanding of what needs to be built
   - List of clarifying questions (edge cases, scope, constraints, integration points)
3. Master Agent answers all questions in one pass
4. PM produces a finalized requirements document at `.optimus/tasks/requirements_<feature>.md`

After this phase, no more user interaction needed.

---

## Phase 2: Codebase Exploration (PM → code-explorer ×2-3, council sync)

**Who**: PM uses `dispatch_council` (synchronous) with 2-3 `code-explorer` roles.

**Goal**: Understand how the codebase relates to the requirements.

Each explorer investigates a different aspect:
- "Find existing code related to [feature area], trace execution paths"
- "Map the architecture and integration points for [affected components]"
- "Identify patterns, conventions, and potential risks in [relevant modules]"

Explorers may surface questions about the codebase. PM answers these using the
requirements document from Phase 1 — providing business context that the
explorers lack.

**Output**: Requirements document enriched with project context — what files are
involved, what patterns to follow, what risks exist.

---

## Phase 3: Architecture Design (PM → code-architect ×2-3, council sync)

**Who**: PM uses `dispatch_council` (synchronous) with 2-3 `code-architect` roles.

**Goal**: Design the implementation approach.

PM provides each architect with:
- The enriched requirements doc (from Phase 2)
- Key files and patterns identified by explorers

Each architect proposes a design with a different focus:
- **Minimal changes**: Smallest diff, maximum reuse
- **Clean architecture**: Maintainability, elegant abstractions
- **Pragmatic balance**: Speed + quality

PM reads all proposals, selects the best approach (or synthesizes a hybrid),
and documents the chosen architecture.

---

## Phase 4: Implementation (PM → dev, sync)

**Who**: PM delegates to `dev` (or `senior-dev`) using `delegate_task` (synchronous).

**Goal**: Build the feature.

PM provides:
- The chosen architecture from Phase 3
- Key files identified in Phase 2
- Finalized requirements from Phase 1
- Required skills: `["git-workflow"]`

The dev will:
1. Create a feature branch
2. Implement the chosen architecture
3. Build and verify
4. Create and merge PR

---

## Phase 5: Quality Review (PM → code-reviewer ×3, council sync)

**Who**: PM uses `dispatch_council` (synchronous) with 3 `code-reviewer` roles.

**Goal**: Ensure code quality.

Each reviewer focuses on a different dimension:
- **Simplicity & DRY**: Code quality, duplication, maintainability
- **Bugs & Correctness**: Logic errors, edge cases, security
- **Conventions**: Project patterns, naming, error handling

If critical issues found → PM delegates back to `dev` for fixes, then re-reviews.
If clean → proceed to summary.

---

## Phase 6: Summary (PM)

**Who**: PM wraps up.

**Goal**: Document what was accomplished.

PM produces:
- What was built and why
- Key architecture decisions made
- Files created/modified
- Suggested next steps (tests, documentation, follow-up features)

Updates the VCS work item via `vcs_add_comment` with the completion summary.
