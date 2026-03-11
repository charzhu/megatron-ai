---
name: skill-creator
description: Generates high-quality, standardized SKILL.md files aligned with official specifications, ensuring strict MCP tool validation and robust XML-structured prompts.
---

# Skill Creator (Meta-Skill)

This skill activates when the Master Agent needs to create a new skill for a role that is missing required capabilities, or to upgrade an existing skill.

<instructions>
You are executing the meta-skill `skill-creator`. Your goal is to write a highly specific, standardized instruction manual for other agents.

## Step 0: Discover and Validate Tools (MANDATORY)
BEFORE drafting any workflow, you MUST verify the exact MCP tool names and parameters available in the environment. 
- Never hallucinate tool names or arguments.
- Check the currently available tools to guarantee 100% accuracy before writing the instructions. Do not guess a tool exists.

## Step 1: Draft the Skill using XML Standards
Generate the skill using the exact XML and Markdown hybrid structure shown in the `<template>` block below. The resulting file should heavily feature structured tags to help target models parse context.

<template>
---
name: "<skill-name>"
description: "<one-line actionable description of what this skill teaches>"
---

# <Skill Title>

<description>
<Brief description of when and why this skill activates.>
</description>

<workflow>
### Step 1: <Action Name>
- **Tool**: `exact_mcp_tool_name`
- **Parameters**: 
  - `param_1`: <explanation of expected value>
- **Action**: <Details on what the agent should do>

### Step 2: <Action Name>
...
</workflow>

<error_handling>
- If `<exact_mcp_tool_name>` fails with `<Specific Error>`, THEN `<Action to recover>`.
</error_handling>

<anti_patterns>
- <Things the agent MUST NOT do>
</anti_patterns>
</template>

## Step 2: Quality & Security Validation
- **Path Validation**: The file MUST be written exactly to `.optimus/skills/<skill-name>/SKILL.md`. Ensure the parent directories exist before writing.
- **Sanitization**: Ensure the skill name only contains lowercase alphanumeric characters, dashes, and underscores (e.g. `data-analysis`).

## Reference Examples
Use the following exemplar to shape your output quality and understand the expected format:

<example>
---
name: "git-workflow"
description: "Issue-first GitHub workflow with proper PR creation and error handling."
---

# GitHub Workflow

<description>
Triggered when code needs to be committed, pushed, and reviewed via a Pull Request.
</description>

<workflow>
### Step 1: Create Tracking Issue
- **Tool**: `vcs_create_work_item`
- **Parameters**: 
  - `title`: The issue title
  - `body`: Description of the bug or feature
- **Action**: Always create a tracking issue before modifying code to establish a blackboard for progress.

### Step 2: Branch and Commit
- **Action**: Checkout a new branch `feature/issue-<ID>`, make changes, and use Conventional Commits. Do not invoke tools for simple terminal git commands, use standard CLI access.
</workflow>

<error_handling>
- If `vcs_create_work_item` returns a validation error or 403 authorization error, verify credentials and stop execution. Do not proceed to commit.
- If branch already exists, append a unique hash to the new branch name and retry.
</error_handling>

<anti_patterns>
- Do not commit directly to `master` or `main`.
- Do not use generic tool names like `github_issue`; use the exact MCP schemas.
</anti_patterns>
</example>

</instructions>