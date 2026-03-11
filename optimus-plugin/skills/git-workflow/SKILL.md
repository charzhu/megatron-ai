---
name: git-workflow
description: Standard unified VCS (GitHub/ADO) branch creation, Pull Request generation, and Agile Issue tracking workflow.
---

# Unified VCS Workflow & Pull Request Skill

<purpose>
Enforce the "Issue First" Hybrid SDLC Protocol. No code is merged to `master` without a tracking Issue and a formal Pull Request.
</purpose>

<tools_required>
- `vcs_create_work_item`
- `vcs_create_pr`
- `vcs_add_comment`
- Terminal (for `git` commands)
</tools_required>

<rules>
  <rule>NEVER use the `gh` CLI. Rely solely on the provided MCP tools and local `git`.</rule>
  <rule>NEVER use the legacy `github_*` MCP tools. They are deprecated. ALWAYS use `vcs_*` equivalents.</rule>
  <rule>NEVER commit directly to `master` or `main` for feature work.</rule>
  <rule>ALWAYS switch back to the default branch (e.g., `master`) after pushing a feature branch.</rule>
</rules>

<instructions>
Before acting on a user request to "commit code", "create a PR", or wrap up a feature, you MUST strictly follow these steps in order by thinking step-by-step:

<step number="1" name="Identify or Create Tracking Issue">
Before any commit, ensure there is a corresponding VCS work item (Issue). 
If none exists, invoke the `vcs_create_work_item` tool with appropriate `title` and `body` parameters. 
Capture the returned Issue ID (e.g., `#113`). Do not proceed without an Issue ID.
</step>

<step number="2" name="Local Branch and Commit">
Using local terminal commands:
1. Create and checkout a new branch: `git checkout -b feature/issue-<ID>-<short-description>`
2. Stage modified files: `git add .` (ensure you review changes first to avoid dirty tree)
3. Commit using Conventional Commits: `git commit -m "feat: <description>, fixes #<ID>"`
4. Push to remote: `git push -u origin <branch-name>`
</step>

<step number="3" name="Create Pull Request">
Invoke the `vcs_create_pr` tool with:
- `title`: A clear PR title referencing the issue
- `head`: Your feature branch name
- `base`: `master` (or main)
- `body`: `Fixes #<ID>` along with a brief description.
</step>

<step number="4" name="Mandatory Workspace Reversion">
Run `git checkout master` in the terminal to return the user's workspace to a clean default state. Never leave the workspace stranded on the feature branch.
</step>
</instructions>

<error_handling>
- **401/403 Credential Error**: If `vcs_create_work_item` or `vcs_create_pr` fails with token/auth errors, DO NOT loop continuously. Halt and instruct the user to verify `GITHUB_TOKEN` or `ADO_PAT` in their environment.
- **Comment Type Error**: If you need to use `vcs_add_comment`, you MUST explicitly pass `item_type: "workitem"` or `item_type: "pullrequest"`.
- **Git Merge Conflict**: If `git push` or PR creation encounters conflict, DO NOT force push. Halt and request intervention.
</error_handling>

<example>
<user_request>I finished the schema validation logic, please commit and create a PR.</user_request>
<agent_thought_process>
1. Check if we have an issue. None specified, so I will create one using `vcs_create_work_item`.
2. Issue #114 created. I will run `git checkout -b feature/issue-114-schema-validation`.
3. I will run `git add src/` and `git commit -m "feat: schema validation, fixes #114"`.
4. Run `git push -u origin feature/issue-114-schema-validation`.
5. Call `vcs_create_pr` with head as the new branch.
6. Must revert workspace: `git checkout master`.
</agent_thought_process>
</example>