---
name: skill-creator
description: Bootstrap skill that teaches agents how to create new SKILL.md files for the Optimus Spartan Swarm system.
---

# Skill Creator (Bootstrap Skill)

This skill activates when the Master Agent needs to create a new skill for a role that is missing required capabilities.

## What is a Skill?

A Skill is a **domain-specific instruction manual** stored as a Markdown file at:
```
.optimus/skills/<skill-name>/SKILL.md
```

Skills teach AI agents **how to use specific MCP tools or follow specific workflows**. Without skills, agents have tools but no instruction manual.

## When to Create a Skill

The Master Agent will delegate skill creation when:
1. A `delegate_task` call is rejected due to `required_skills` pre-flight failure
2. A new workflow pattern needs to be codified for reuse across agents
3. An existing skill needs to be extended or replaced

## How to Create a Skill

### Step 1: Understand the Purpose
Read the task context provided by the Master Agent. Understand:
- **What tools** the skill should teach the agent to use
- **What workflow** the skill should encode
- **What guardrails** the skill should enforce (e.g., async-first, non-blocking)

### Step 2: Write the SKILL.md File

The file MUST follow this structure:

```markdown
---
name: <skill-name>
description: <one-line description of what this skill teaches>
---

# <Skill Title>

<Brief description of when this skill activates.>

## <Step-by-step instructions>

### Step 1: <Action>
<Detailed instructions with tool names and parameters>

### Step 2: <Action>
...

## Anti-Patterns
- <Things the agent must NOT do>

## Examples
- <Concrete examples of correct usage>
```

### Step 3: Write the File to Disk

Create the skill at the correct path:
```
.optimus/skills/<skill-name>/SKILL.md
```

Use the workspace's file system to write the content. Ensure the directory exists first.

### Step 4: Verify

Confirm the file exists and is valid Markdown with YAML frontmatter.

## Quality Checklist

A good skill file:
- [ ] Has YAML frontmatter with `name` and `description`
- [ ] Has clear step-by-step instructions (numbered steps)
- [ ] References specific MCP tool names the agent should call
- [ ] Includes anti-patterns (what NOT to do)
- [ ] Is actionable — an agent reading it can immediately follow the instructions
- [ ] Is concise — no walls of text, focuses on the essential workflow
- [ ] Uses the correct path convention: `.optimus/skills/<name>/SKILL.md`

## Anti-Patterns
- Do NOT create skills that duplicate existing ones — check `.optimus/skills/` first
- Do NOT write vague or generic instructions — be specific about tool names and parameters
- Do NOT create skills that reference tools the MCP server doesn't provide
- Do NOT embed large code blocks — skills are instruction manuals, not code repositories
