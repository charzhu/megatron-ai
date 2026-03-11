# Architectural Optimization: Role vs. Model Name Boundary

## Objective
The Orchestrator Agent recently made a critical mistake: it passed base LLM model names (\claude-code-opus-4.61m\, \copilot-gemini-3-pro\) into the \oles\ array of the \dispatch_council\ tool.
Because the \oles\ array is meant to define **Domain Expert Roles** (e.g., \security-auditor\, \rontend-expert\, etc.), the T3 runtime attempted to spawn Zero-Shot Agents whose entire "specialty" was just being a specific model. This lacks context and breaks the persona-driven mechanism.

We need a structural optimization to explicitly separate and guard against Model Names being confused with Agent Roles.

## Panel Discussion Points
1. **MCP Tool Schema Architect (\mcp-schema-architect\)**:
   - Critically evaluate the current \dispatch_council\ MCP tool schema. It currently accepts \oles: string[]\.
   - Should we change the schema to accept structured objects, e.g., \{ role: "chief-architect", model: "claude-3-opus" }\? If so, how does this affect existing client integrations?

2. **Runtime Validation Expert (\untime-validation-expert\)**:
   - Provide concrete TypeScript code implementations for \council-runner.ts\ and \worker-spawner.ts\.
   - We need hard regex guardrails to immediately reject \oles\ containing strings like gpt-4, claude-3, gemini-pro. How do we return a graceful Validation Error to the MCP Orchestrator so it corrects itself?

3. **Prompt Engineering Lead (\prompt-engineering-lead\)**:
   - Review \spartan_swarm\ protocol prompts and current System Instructions.
   - How can we patch the meta-prompt/skill logic so the Orchestrator strictly distinguishes between "who is doing the work" (the T3 persona) and "what brain powers them" (the model)?

## Deliverables
Synthesize findings into \COUNCIL_SYNTHESIS.md\ with actionable MCP schema patches and regex validation routines.
