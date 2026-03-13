# Architecture Review Proposal: System Stability & Next-Gen Expansion

## 1. Current Architecture Context
- **Core Platform:** VS Code Extension providing the user interface (WebView) and the ChatViewProvider.
- **Backend/Execution:** A separate, pure Node.js MCP daemon (`src/mcp/mcp-server.ts`) operating via standard I/O streams. 
- **Agent Interoperability:** Uses the "Megatron Swarm" protocol. Tasks are delegated to local T1 personas (PM, Architect, Dev, QA, Marketing, etc.) by writing down markdown context files, spinning up execution paths (via Claude / Copilot CLI), and syncing state locally.
- **Source of Truth:** "Hybrid SDLC" model. Using `.megatron/` directory for fast local agent data sharing, but aggressively syncing Epics, PRs, and status to GitHub Issues via native MCP GitHub tools for canonical tracking.

## 2. Identified Pain Points
- **IPC & Concurrency:** The MCP server handles concurrent tasks, but lacks a strict lock-management or request queuing system, which can theoretically cause race conditions when multiple dynamic agents span at once.
- **Context Truncation:** Sub-agents running into token limits over long coding sessions require explicit resume semantics.
- **Monolithic UI:** The current extension runs purely within VS Code. We have an open Epic (#13) to design a Multi-tenant & Frontend Login Architecture. Does the MCP server need an HTTP API overlay for remote clients?

## 3. Review Objectives
We are summoning a council of Architects to assess the above and provide a report on:
1. **IPC & Subprocess Control:** The best method to implement robust task queues and crash-resistance in the `mcp-server.ts`.
2. **VS Code vs. Web Architecture:** Should we bridge the current text-based stdout MCP into a WebSockets or HTTP(s) microservice to support remote clients?
3. **Agent State Machine:** Should we maintain state on the local disk (`.megatron/tasks/`), or migrate to a lightweight SQLite/local DB to avoid file I/O contention?

Please provide your strategic optimization advice.