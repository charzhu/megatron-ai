# Proposal: Unified Git Workflow for GitHub and Azure DevOps (ADO)

## Objective
Upgrade the current Optimus git workflow to transparently support both GitHub and Azure DevOps (ADO). Provide a seamless user experience where the agent uses a unified git workflow to create PRs, issues (GitHub), and work items (ADO).

## Current State
The project currently supports GitHub operations (create issue, create PR, merge PR, sync board, update issue) using dedicated MCP tools (`mcp_spartan-swarm_github_*`).

## Requirements
1. **Unified Interface**: The agent should call a unified tool (e.g., `git_create_ticket`, `git_create_pr`) rather than platform-specific tools.
2. **Auto-Detection**: The system should automatically detect whether the current repository is hosted on GitHub or ADO by inspecting git remotes.
3. **Artifact Mapping**: Map GitHub Issues and ADO Work Items to a common internal representation for the `.optimus/blackboard`.
4. **Authentication**: Handle both GitHub tokens and ADO Personal Access Tokens (PATs) securely.

## Questions for Council
1. **Architecture**: How should we structure the MCP tools to support this unified interface without bloating the tool definitions? Should we wrap them in a generic `vcs_*` layer or keep them separate but handled by the workflow logic?
2. **Data Model**: What is the best way to reconcile the schema differences between GitHub Issues (Markdown body, simple labels) and ADO Work Items (HTML fields, specific types like User Story, Task, Bug)?
3. **Agent Experience**: How can we ensure that the PM and Dev agents can seamlessly switch between platforms without needing different prompts or skills?
4. **Authentication Integration**: How should we manage credentials for ADO securely, considering the existing MCP architecture?

Please review and provide feedback.