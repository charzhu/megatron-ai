# Task: Batch Upgrade All Project Skills to New XML Standard

## Goal
We just established a new official XML-based standard for SKILL files via the `skill-creator` meta-skill. Your job is to retroactively upgrade all other existing skills in the project to strictly comply with this standard.

## Target Skills to Upgrade:
1. `.optimus/skills/agent-creator/SKILL.md`
2. `.optimus/skills/council-review/SKILL.md`
3. `.optimus/skills/delegate-task/SKILL.md`
4. `.optimus/skills/git-workflow/SKILL.md`
5. `.optimus/skills/task-dashboard/SKILL.md`

## Instructions
1. **Understand the Standard**: Review `.optimus/skills/skill-creator/SKILL.md` to understand the target `<template>`, mandatory `<instructions>`, `<workflow>`, `<error_handling>`, and `<anti_patterns>` XML tags.
2. **Translate and Rewrite**: Process each of the 5 target skills one by one. Read their current Markdown content, understand the core mechanic, and then completely rewrite the `SKILL.md` file using the new XML-heavy structure.
3. **Verify MCP Tools**: Ensure you do not hallucinate tool names. Keep the exact tool references they currently use, just wrap them in the new standard blocks.
4. **Save Files**: Overwrite the original files in their respective `.optimus/skills/<skill-name>/SKILL.md` paths.

Do NOT change the underlying behavior of what the skills do—only restructure how the prompt instructions are presented to other agents.