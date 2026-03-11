# Task: Implement Meta-Skill Prerequisites

**Related Issue**: #113

## Goal
Implement the core architecture safeguards identified by the meta-skill council review to prevent concurrency/security breakages prior to upgrading `skill-creator`.

## Requirements for the `dev` agent:

1. **New MCP Tool `mcp_schema_introspection`**:
   - File: `src/mcp/mcp-server.ts`
   - Description: A new server tool that parses and returns a JSON array of all registered MCP schemas.
   - Purpose: Allow dynamic schema discovery to permanently stop LLM "tool hallucination".

2. **File Mutex / Concurrency Lock**:
   - File: `src/mcp/worker-spawner.ts` (or an appropriate util).
   - Description: Generalize the existing `t3LogMutex` so that ANY file operations to `.optimus/skills/` or `.optimus/roles/` are locked against concurrent writes.

3. **String Sanitization**:
   - File: `src/mcp/worker-spawner.ts` 
   - Description: Write a `sanitizeSkillName` function, mirroring `sanitizeRoleName`, to lock down Path Traversal vulnerabilities when dynamically saving skill files.

## Workflow Rules
- You MUST follow the **Issue First Protocol**. You are working on **Issue #113**.
- You MUST checkout a new branch (e.g. `feature/issue-113-meta-skill-prereqs`).
- You MUST write the code, commit it using `fixes #113`.
- You MUST use the `vcs_create_pr` tool to push the code up as a PR.
- DO NOT stray from these scope boundaries. Do not rewrite `skill-creator` itself yet.
