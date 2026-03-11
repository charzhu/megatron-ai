---
name: feature-dev
description: Guided 6-phase feature development workflow. Use when the user requests a new feature, complex implementation, or multi-file change. Master Agent gathers requirements from the user, delegates to PM who autonomously drives codebase exploration, architecture design, implementation, and quality review.
---

# Feature Development Workflow

Systematic approach to building features: understand the codebase deeply, clarify
all ambiguities upfront, design architecture with trade-offs, implement cleanly,
then review for quality. No guessing — every phase feeds concrete context into
the next.

## Core Principles

- **Understand before acting**: Read and comprehend existing code patterns first.
  When agents return file lists, read those files to build deep understanding.
- **Ask questions early**: Identify all ambiguities, edge cases, and underspecified
  behaviors. Ask specific, concrete questions rather than making assumptions.
- **Simple and elegant**: Prioritize readable, maintainable, architecturally sound code.

## Orchestration Model

```
User ↔ Master Agent (collect requirements)
           │
           ├─ Phase 1: delegate_task (sync) → PM
           │   PM reviews request, asks clarifying questions
           │   Master answers using user context
           │   PM writes requirements doc
           │
           └─ delegate_task_async → PM (Phase 2-6, autonomous)
                ├─ Phase 2: dispatch_council (sync) → code-explorer ×2-3
                ├─ Phase 3: dispatch_council (sync) → code-architect ×2-3
                ├─ Phase 4: delegate_task (sync) → dev
                ├─ Phase 5: dispatch_council (sync) → code-reviewer ×3
                └─ Phase 6: PM summarizes
```

---

## Phase 1: Requirements Alignment (Master ↔ PM, sync)

**Who**: Master delegates to PM using `delegate_task` (synchronous).

**Goal**: PM surfaces gaps, Master fills them, PM produces a requirements doc.

1. Master bundles the user's feature request into a task description for PM
2. PM returns:
   - Confirmed understanding of what needs to be built
   - Clarifying questions: edge cases, error handling, scope boundaries,
     integration points, backward compatibility, performance needs
3. Master answers all questions in one pass (Master has user context)
4. PM produces finalized requirements doc at `.optimus/tasks/requirements_<feature>.md`

After this phase, no more user interaction needed.

---

## Phase 2: Codebase Exploration (PM → code-explorer ×2-3, council sync)

**Who**: PM uses `dispatch_council` with 2-3 `code-explorer` roles.

**Goal**: Understand relevant code at both high and low levels.

Each explorer targets a different aspect. Example prompts:
- "Find features similar to [feature] and trace through their implementation
  comprehensively. Return a list of 5-10 key files."
- "Map the architecture and abstractions for [feature area], tracing execution
  paths. Include key files."
- "Analyze the current implementation of [existing related feature]. Include
  key files."

After explorers return, PM reads all identified files and synthesizes:
- Existing patterns and conventions to follow
- Key files and integration points
- Dependencies and potential risks

**Output**: Requirements doc enriched with project context.

---

## Phase 3: Architecture Design (PM → code-architect ×2-3, council sync)

**Who**: PM uses `dispatch_council` with 2-3 `code-architect` roles.

**Goal**: Design implementation with trade-offs.

PM provides each architect with the enriched requirements doc. Each architect
takes a different approach:
- **Minimal changes**: Smallest diff, maximum reuse of existing code
- **Clean architecture**: Maintainability, elegant abstractions
- **Pragmatic balance**: Speed + quality

PM reviews all proposals, forms an opinion on which fits best (considering
scope, urgency, complexity), selects the best approach or synthesizes a hybrid,
and documents the chosen architecture with rationale.

---

## Phase 4: Implementation (PM → dev, sync)

**Who**: PM delegates to `dev` using `delegate_task` (synchronous).

**Goal**: Build the feature.

PM provides:
- Chosen architecture from Phase 3
- Key files identified in Phase 2
- Finalized requirements from Phase 1
- Required skills: `["git-workflow"]`

The dev:
1. Creates a feature branch
2. Implements following chosen architecture and codebase conventions
3. Builds and verifies zero errors
4. Creates and merges PR

---

## Phase 5: Quality Review (PM → code-reviewer ×3, council sync)

**Who**: PM uses `dispatch_council` with 3 `code-reviewer` roles.

**Goal**: Catch issues before the feature ships.

Each reviewer focuses on a different dimension:
- **Simplicity & DRY**: Code quality, duplication, readability, elegance
- **Bugs & Correctness**: Logic errors, edge cases, security vulnerabilities
- **Conventions**: Project patterns, naming, error handling, test coverage

PM consolidates findings and identifies highest severity issues.
If critical issues found → delegate back to `dev` for fixes, re-review.
If clean → proceed to summary.

---

## Phase 6: Summary (PM)

**Who**: PM wraps up.

**Goal**: Document what was accomplished.

PM produces:
- What was built and why
- Key architecture decisions and trade-offs
- Files created and modified
- Suggested next steps (tests, documentation, follow-up features)

Updates the VCS work item via `vcs_add_comment` with completion summary.
