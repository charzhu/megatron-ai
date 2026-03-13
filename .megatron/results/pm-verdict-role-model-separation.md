# PM Verdict: Role vs. Model Name Separation Council

**Date:** 2026-03-11
**Proposal:** `.megatron/proposals/PROPOSAL_role_model_separation.md`
**Council:** `mcp-schema-architect`, `runtime-validation-expert`, `prompt-engineering-lead`

## Unified Council Verdict

**Decision**: APPROVED_WITH_CONDITIONS
**Consensus Level**: UNANIMOUS

All three council experts agree that the proposal identifies a real and critical architectural flaw: model names being conflated with agent roles in the `dispatch_council` tool schema. All three recommend implementing the fix. The only tactical variance is on rollout strategy (immediate breaking change vs. phased migration), which has been resolved below.

---

### Key Agreements

- The current `roles: string[]` parameter is semantically ambiguous and directly caused the orchestrator to pass model names as roles.
- A structured schema separating `role` (persona) from `model` (engine) is the correct long-term architecture.
- Runtime regex validation is necessary as an immediate guardrail, regardless of schema timeline.
- Prompt/instruction patches in `CLAUDE.md` and skill docs must explicitly prohibit model names in the `roles` field.
- Error messages returned from validation must be descriptive and actionable so the orchestrator can self-correct autonomously.

### Conditions (Required Before Implementation)

1. **Phased rollout is mandatory.** We will NOT ship the structured `council_request` parameter as an immediate breaking change. The `mcp-schema-architect`'s hybrid approach is the approved path:
   - **Phase 1**: Add runtime regex validation to reject model names in the existing `roles: string[]` parameter. Simultaneously introduce a new optional `council_request: { role: string, model?: string }[]` parameter that coexists with the deprecated `roles`.
   - **Phase 2**: Migrate orchestrator prompts and skill logic to use `council_request` exclusively.
   - **Phase 3**: Remove the deprecated `roles` parameter in a future major version.

2. **Regex pattern must be comprehensive but conservative.** The proposed `MODEL_NAME_IN_ROLE_REGEX` pattern (`/^(claude|gpt|gemini|sonnet|opus|haiku)[\d.-]/i`) is a reasonable starting point but must be reviewed for false positives (e.g., a legitimate role named `opus-performance-tuner` would be incorrectly rejected). The validation function should match against known model name patterns with version identifiers (e.g., `claude-3`, `gpt-4`, `gemini-1.5`) rather than bare prefix matches. Refine the regex before merging.

3. **Validation must live in a single shared utility.** The `runtime-validation-expert` correctly proposed `src/mcp/validation.ts`. Both `worker-spawner.ts` and the council dispatch path must import from this single source of truth. No duplicated validation logic.

4. **Prompt patches must be deployed alongside the runtime changes.** The `prompt-engineering-lead`'s recommended `MUST NOT` clauses for `CLAUDE.md` and the `delegate-task` / `council-review` skill docs must ship in the same PR as the validation code. Runtime guardrails without instruction clarity is only half a fix.

5. **Issue-First SDLC.** A GitHub issue must be created before any code is written, per the project's git-workflow protocol.

### Conflicts

- None. All three experts converge on the same end-state. The `mcp-schema-architect` and `prompt-engineering-lead` both independently recommended a "Hybrid" approach with phased rollout, and the `runtime-validation-expert` focused on the immediate validation layer that both other experts endorse. No blocking disagreements exist.

### Implementation Priority

1. **Create GitHub Issue** tracking the full scope of this change (schema evolution + validation + prompt patches).
2. **Implement `src/mcp/validation.ts`** with the `validateRoleName()` utility and refined regex.
3. **Integrate validation into `worker-spawner.ts`** — reject model names at spawn time with descriptive error messages.
4. **Integrate validation into council dispatch path** — fail fast before any workers are spawned.
5. **Patch `CLAUDE.md` and skill docs** (`delegate-task`, `council-review`) with explicit `MUST NOT` instructions separating roles from models.
6. **Add the optional `council_request` parameter** to the `dispatch_council` MCP tool schema (non-breaking, additive change).
7. **Update orchestrator logic** to prefer `council_request` over `roles`.
8. **Rebuild and test** (`npm run build` in `megatron-plugin`), verify that model names are rejected and structured input is accepted.
9. **Create PR** linking to the issue, with the full changeset.

---

*PM Verdict issued by: `pm` (T1 Agent Instance)*
*Previous verdict (REJECTED due to 128-tool API overflow) has been superseded by this successful council run.*
