---
name: feature-dev
description: Guided 7-phase feature development workflow. Use when the user requests a new feature, complex implementation, or multi-file change that needs codebase understanding, architecture design, and quality review. The Master Agent delegates to a PM, who orchestrates code-explorer, code-architect, code-reviewer, and dev roles.
---

# Feature Development Workflow

A structured 7-phase approach to building features. Instead of jumping straight
into code, this workflow ensures the codebase is understood, requirements are
clarified, architecture is designed, and quality is reviewed.

## Orchestration Model

```
User → Master Agent → PM (this skill)
                        ├─ Phase 2: dispatch_council → code-explorer ×2-3
                        ├─ Phase 4: dispatch_council → code-architect ×2-3
                        ├─ Phase 5: delegate_task   → dev
                        └─ Phase 6: dispatch_council → code-reviewer ×3
```

The PM reads user requirements, drives each phase, and delegates the heavy
lifting to specialists. The PM does NOT write code — the dev role does that.

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built.

The PM clarifies the feature request with the user:
1. What problem does this solve?
2. What should the feature do?
3. Any constraints or requirements?
4. Summarize understanding and confirm with user before proceeding.

No delegation needed — this is a conversation between the PM and the user.

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns.

**Action**: Use `dispatch_council_async` with 2-3 `code-explorer` roles.

Each explorer should focus on a different aspect:
- "Find features similar to [feature] and trace their implementation"
- "Map the architecture and abstractions for [feature area]"
- "Analyze the current implementation of [related existing feature]"

After the council completes, read the explorer reports and synthesize findings
for the user. Identify key files, patterns, and integration points.

---

## Phase 3: Clarifying Questions

**Goal**: Fill in gaps and resolve all ambiguities before designing.

Based on the exploration results, the PM identifies underspecified aspects:
- Edge cases and error handling
- Integration points with existing code
- Backward compatibility concerns
- Performance requirements
- Scope boundaries

Present all questions to the user in a clear list. **Wait for answers before
proceeding.** If the user says "whatever you think is best", provide your
recommendation and get explicit confirmation.

---

## Phase 4: Architecture Design

**Goal**: Design implementation approaches with trade-offs.

**Action**: Use `dispatch_council_async` with 2-3 `code-architect` roles, each
given a different focus:
- **Minimal changes**: Smallest diff, maximum reuse of existing code
- **Clean architecture**: Maintainability, elegant abstractions
- **Pragmatic balance**: Speed + quality

After the council completes, review all approaches, form an opinion on which
fits best, and present to the user with a recommendation. Ask which approach
they prefer.

---

## Phase 5: Implementation

**Goal**: Build the feature.

**Action**: Use `delegate_task_async` to the `dev` role with:
- The chosen architecture from Phase 4
- Key files identified in Phase 2
- User's answers from Phase 3
- Required skills: `["git-workflow"]`

The dev will:
1. Create a feature branch
2. Implement the chosen architecture
3. Build and verify
4. Create a PR

---

## Phase 6: Quality Review

**Goal**: Ensure code quality before merge.

**Action**: Use `dispatch_council_async` with 3 `code-reviewer` roles, each
with a different focus:
- **Simplicity & DRY**: Code quality and maintainability
- **Bugs & Correctness**: Functional correctness and logic errors
- **Conventions**: Project standards and patterns

After the council completes, consolidate findings. If there are critical issues,
delegate back to `dev` to fix them. If clean, proceed to merge.

---

## Phase 7: Summary

**Goal**: Wrap up and document what was accomplished.

The PM summarizes:
- What was built
- Key decisions made
- Files modified
- Suggested next steps (tests, documentation, follow-up features)

Update the VCS work item with the completion summary via `vcs_add_comment`.
