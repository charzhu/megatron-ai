# PM Arbiter — Unified Council Verdict

**Proposal:** `PROPOSAL_ado_github_workflow.md`
**Council:** `chief-architect`, `pm`, `ado-integration-specialist`
**Arbiter:** PM (T1)
**Date:** 2026-03-11

---

## Unified Council Verdict
**Decision**: APPROVED_WITH_CONDITIONS
**Consensus Level**: MAJORITY (2 of 3 reviewers delivered; ado-integration-specialist failed due to tool limit error)

### Key Agreements
- The **strategic goal is correct**: Optimus must support ADO alongside GitHub to widen its user base and fulfill the multi-platform orchestrator vision.
- The proposal as written is a **requirements sketch, not an architecture plan**. It lacks implementation path, risk matrix, rollback strategy, and acceptance criteria. Both reviewers independently flagged this.
- A **unified `vcs_*` abstraction layer is premature**. Both chief-architect and PM converge on this: do not create a polymorphic wrapper before a second concrete implementation exists. Add `ado_*` tools alongside `github_*` tools instead.
- A **unified data model is harmful**. Forcing GitHub Issues and ADO Work Items into a lowest-common-denominator schema loses the strengths of both platforms. Platform-native fields must be preserved.
- **Authentication design is absent**. Both reviewers flagged that "handle securely" is insufficient. ADO PATs carry broader blast radius than scoped GitHub tokens. Concrete token validation, minimum scope specification, and error handling for missing/expired credentials are required.
- **Backward compatibility is unaddressed**. Existing `github_*` tool references are baked into `CLAUDE.md`, agent persona files, and skill definitions. The migration path is not specified.
- **Concurrency risks exist**. Parallel council agents or parallel task agents could create duplicate tickets without a creation lock.

### Conditions (Required before implementation)
1. **Additive architecture, not abstractive**: Add `ado_*` MCP tools as flat siblings to existing `github_*` tools. Create `src/utils/adoApi.ts` using raw `fetch()` only (no Azure SDK). No polymorphic `vcs_*` wrapper.
2. **Platform detector**: Create `src/utils/vcsDetect.ts` that parses `git remote get-url origin` and returns `{ platform: 'github' | 'ado', owner, repo, project? }`. Add configurable override via `.optimus/config.json` → `"vcs_provider"` for dual-remote repos.
3. **Extend task-manifest schema**: Change `linked_issue` to `linked_ticket: { platform: 'github'|'ado', id: string, url: string }` in `task-manifest.json`.
4. **Define MVP scope explicitly**: State which ADO operations are in-scope (create Work Item, create PR, sync board) and which are deferred (Pipelines, Boards state transitions, ADO Repos push). Include acceptance criteria per operation.
5. **Security design section**: Document minimum PAT scopes required, add `ado_validate_token` startup check, specify error messages for missing/expired/over-permissioned credentials.
6. **Concurrency guard**: Add `ticket_creation_lock` semaphore at workspace level in `TaskManifestManager` to prevent duplicate ticket creation from parallel agents.
7. **Migration plan**: Document how existing `github_*` references in agent files, `CLAUDE.md`, and skill definitions will coexist with the new `ado_*` tools. No breaking changes to existing GitHub workflow.
8. **No new npm dependencies**: All ADO API calls via native `fetch()`. The esbuild plugin's `vscode` import guard must not be violated.
9. **Testing strategy**: Define mock/stub interfaces for ADO API calls. At minimum, unit tests for `vcsDetect.ts` and `adoApi.ts` that don't require live ADO access.
10. **Rewrite the proposal**: Flesh out Implementation Path (file-by-file changes), Risk Matrix, and Rollback Strategy (env-var gating for ADO tools) before dispatching to implementation.

### Conflicts
- **Adapter pattern disagreement**: The PM review recommends a `VcsAdapter` interface upfront as a prerequisite refactor. The chief-architect explicitly rejects this as premature abstraction, preferring flat parallel tools extractable later. **Resolution**: Side with the chief-architect. The adapter pattern can be extracted when a third platform arrives. Two flat implementations is the pragmatic path.
- **ado-integration-specialist review missing**: The third council member failed with a `500` error (tool limit exceeded). This means we lack the domain-specific ADO expertise review. **Resolution**: The proposal must be re-reviewed by the ado-integration-specialist once the tool limit issue is resolved, OR the proposal author must self-certify ADO API coverage against the ADO REST API documentation.

### Implementation Priority
1. **Revise the proposal** with all conditions above incorporated (owner: proposal author)
2. **Re-submit for ado-integration-specialist review** once tool limit issue is fixed
3. **Implement `vcsDetect.ts`** — foundational, unblocks everything else
4. **Implement `adoApi.ts`** — raw fetch utilities for ADO REST API
5. **Add `ado_*` MCP tools** to `mcp-server.ts` alongside existing `github_*` tools
6. **Extend `task-manifest.json` schema** with `linked_ticket` field
7. **Add concurrency guard** to `TaskManifestManager`
8. **Update skill definitions** (`delegate-task`, `git-workflow`) with platform routing logic
9. **Write tests** for `vcsDetect.ts` and `adoApi.ts`
10. **Update agent persona files** and `CLAUDE.md` to document both tool sets

---

*— PM Arbiter (T1), council verdict for `PROPOSAL_ado_github_workflow.md`*
