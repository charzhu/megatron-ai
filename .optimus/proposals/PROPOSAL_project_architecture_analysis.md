# Proposal: Complete Project Architecture Analysis

## Objective
The user has requested a comprehensive architectural review and analysis of the current `optimus-code` project. 

## Scope of Analysis
1. **Dual-Codebase Architecture**: Evaluate the separation and synchronization between the host project (`.optimus/` run environment) and the plugin package (`optimus-plugin/` source of truth). 
2. **Spartan Swarm Protocol**: Analyze the efficiency of the Agent spawning mechanisms (T1/T2/T3), background task delegations (`delegate_task_async`), and Council Map-Reduce reviews (`dispatch_council_async`).
3. **Extensibility & System Instructions**: Critique the current `system-instructions.md` and dynamically generated `.md` prompt templates for role definitions. Identify potential bottlenecks in self-evolution.
4. **Git Workflow Integration**: Assess how MCP tools interact with GitHub and the proposed Azure DevOps (ADO) interfaces.

## Tasks for the Council
- `chief-architect`: Provide a high-level review of the architectural patterns and identify technical debt or structural inefficiencies.
- `systems-architect`: Review the Node.js/MCP server daemon design (`src/mcp-server`) and its IPC/child process lifecycle.
- `security`: Assess the isolation of `.optimus/` outputs and potential risks in dynamically generating executable roles.

Please generate a detailed synthesis report regarding the soundness, maintainability, and scalability of the Optimus project.