# PROPOSAL: Mathematical Taxonomy of Spartan Swarm Tiers (T1, T2, T3)

## Pre-Requisite Context:
In our Multi-Agent Orchestrator framework (Optimus), we spawn headless AI CLI tools (like Claude Code, Copilot CLI) into specialized Sub-Agents doing tasks autonomously.

## The Proposal
We are formally defining the taxonomy of the Spartan Swarm registry as a mathematical composition of capabilities, moving away from purely abstract naming to actual system resource composition:

1. **T3 (Computational Resource Pool)**: Represents the raw hardware/engine configuration.
   - Formula: `T3 = Agent Engine + Model`
   - Example: Claude Code + claude-3-7-sonnet, or Copilot CLI + gpt-4o.
   - Persistence: Registered in `.optimus/registry/available-agents.json`.

2. **T2 (Role Templates)**: Represents a pre-defined persona instruction and workflow added onto a raw T3 compute layer. 
   - Formula: `T2 = T3 + Role Instructions`
   - Example: (Claude Code + opus) + "You are a Chief Architect, analyze strictly for decoupling".
   - Persistence: Read-only templates stored in `.optimus/roles/*.md`.

3. **T1 (Local Session Agents)**: Represents a fully instantiated, stateful worker that actively retains memory within a discrete project.
   - Formula: `T1 = T2 + Session Memory (Entity State)`
   - Example: Chief Architect Template + Session UUID (binding to an active shell where context is retained).
   - Persistence: Stateful markdown files with YAML frontmatter pointing to UUIDs in `.optimus/agents/*.md`.

## Discussion Points for Council:
1. Is this mathematical breakdown (`T3 -> T2 -> T1`) structurally sound and clean for programmatic implementation?
2. Are there any latent logic gaps when dynamically provisioning a T2 straight from a T3 without an explicit file?
3. How should Error Handling/Scaling behave within this layered model if an underlying T3 Engine rate limits? Do we degrade gracefully within the T3 layer, or bubble it up to the Master Orchestrator?