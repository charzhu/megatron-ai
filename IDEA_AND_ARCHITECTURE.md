# Optimus Code 🚀

> *The Ultimate Multi-Agent Orchestrator. Let models debate, you make the final call.*

## 🌟 Project Genesis

This project was born out of a brainstorming session in early 2026. We realized that any single Language Model (LLM) possesses inherent limitations. Some excel at deep code autocompletion and syntax due to native editor integrations, while others offer unparalleled macroscopic architectural planning but involve context-breaking copy/pasting.

How do we force top-tier models from mega-corporations to work together and "debate" without incurring dual API costs?

**The Core Concept: Hijacking the OS CLI Layer.**
Since these autonomous Coding Agents act as Model Context Protocol (MCP) clients in their own ecosystems, they refuse to be subservient servers to one another.
The solution was to build an omniscient **Orchestrator** — **Optimus Code**.

It operates as a **VS Code Extension** where at its foundation it forcefully converts existing first-party CLI abilities (like `@github/copilot` and `claude-code`) into headless, raw computation threads ("Workers") executed via Node.js standard subprocesses (`child_process`).

## 🏗️ Architecture

The overall design follows a "Three-Tier Model" and standardized directory structure:

### Directory Structure Convention
To maintain clarity as the project scales, the codebase enforces the following organization:
*   `src/extension.ts`: The main entry point for the VS Code extension.
*   `src/providers/`: Contains VS Code Webview providers (e.g., `ChatViewProvider.ts`) responsible for extending the UI and handling frontend message passing.
*   `src/adapters/`: Contains integration logic for external AI CLIs (e.g., `AgentAdapter.ts`, `ClaudeCodeAdapter.ts`).

### 1. Top Layer: Native VS Code Extension UI (Webview & Context Layer)
Operates as the geeks' command center, directly attached to your editor's sidebar.
*   **Context Extraction**: It reads the active code you've selected, cursor positions, and project context.
*   **Side-by-Side Asynchronous "Kanban" Chat**: The traditional top-down chat flow limits reviewing parallel model data. Optimus renders a dynamically scrolling horizontally-aligned Webview where every summoned agent writes its output side-by-side. 
*   **Rich Client Representation**: Employs real-time markdown parsing (`marked.js`) overlaying native VS Code themes.

### 2. Middle Layer: The Orchestrator Engine & Configuration Manager
The core state-machine and pipeline logic:
*   **Dynamic Setting Injection**: End-users control the `optimusCode.agents` array inside their `settings.json`. By pairing `github-copilot` or `claude-code` Adapters with varying `model` endpoints (e.g. `gpt-5.4`, `claude-opus-4.6`, `gemini-3-pro`), instances inject seamlessly.
*   **Parallel Streaming Router**: Uses strict interfaces (`invoke(prompt, mode, onUpdate)`) bridging output logs (`stdout` and `stderr`) simultaneously towards the UI, keeping high throughput without deadlocks.

### 2.1 The "Council for Planning, Dictator for Execution" Principle (多谋独断)
The sole operation mode is **Auto**, which implements a two-phase pipeline every round:
*   **Phase 1 — Council Planning**: All selected plan agents run concurrently in `plan` mode. Each receives a `<task-context>` block with the shared task summary and the last two executor outcomes, followed by the live editor context and user prompt. This gives each planner awareness of prior progress without biasing it with other planners' opinions.
*   **Phase 2 — Executor Synthesis & Action**: The designated executor agent (selected via a UI dropdown, must support `agent` mode) receives all successful plan outputs. It synthesizes the best approach and executes it autonomously in `agent` mode.
*   This pipeline repeats for every user message, ensuring collective intelligence informs every autonomous action.

### 2.2 Agent Mode Filtering & Dual Execution Strategy
*   Each agent declares a `modes` array (e.g. `["plan"]` or `["plan", "agent"]`) specifying its capabilities.
*   **Non-interactive execution** (`-p` flag): For `plan`, `ask`, and any adapter that opts out of persistent sessions, the adapter spawns a one-shot CLI process. The promise resolves when the process exits — fully deterministic.
*   **Persistent session policy hook**: `PersistentAgentAdapter` exposes an adapter-level policy so each CLI integration can decide whether `agent` mode should use a persistent session or a one-shot process.
*   **Interactive daemon**: Persistent sessions remain available for adapters that can safely operate inside a non-TTY extension-host environment.
*   **Claude current behavior**: `ClaudeCodeAdapter` now uses one-shot execution even in `agent` mode because this path proved more reliable than a non-TTY daemon for the current Auto pipeline.
*   The executor UI dropdown only shows agents whose `modes` includes `"agent"`.
*   The UI enforces a maximum of **3 concurrently selected plan agents**.

### 2.3 App-level Multi-turn Shared Task State ✅
Multi-turn memory has been moved from individual CLI sessions into Optimus Code itself.

#### Why this direction
*   CLI-level multi-turn only guarantees that one specific tool remembers its own conversation.
*   Optimus Code needs a **shared task world model** so planners and the executor can see the same facts, prior actions, failures, and open questions. Planners receive a lightweight summary (task summary + recent executor outcomes). The executor receives the full structured context including open questions and blockers.
*   This approach is model-agnostic and works across Claude, Copilot, and future adapters without depending on one vendor's interactive shell behavior.

#### Core design goal
Introduce a **Shared Task State** managed by the orchestrator layer rather than by individual adapters.

The shared state should track at least:
*   `taskId`, `turnId`, `turnSequence`
*   User intent history
*   Planner contributions and executor outcomes
*   Artifacts, files touched, observed commands, and debug facts
*   Open questions, blocked reasons, and latest summary

#### Execution model
Each new user turn should follow this lifecycle:
1. Load or create a shared task state.
2. Build a lightweight planner prompt (`buildPlannerPrompt`) that includes task summary + last 2 executor outcomes + editor context + user prompt.
3. Run planner agents and normalize their outputs into structured contribution records.
4. Synthesize an executor prompt (`buildExecutorPrompt`) from the full shared task state instead of raw concatenated planner text.
5. Write the executor result back into the shared task state.
6. Persist a resumable task snapshot for history and future continuation.

#### Design boundaries
*   The orchestrator owns shared memory and turn lifecycle.
*   Adapters remain thin execution layers and should continue to accept prompt strings rather than owning global memory policy.
*   Claude's current one-shot executor path is acceptable because app-level multi-turn will preserve continuity above the CLI layer.
*   Native VS Code agent extensions remain isolated; any future cross-extension handoff must go through files or explicit external interfaces.

#### Implementation (completed)
*   `SharedTaskStateManager` added under `src/managers/`, with `buildPlannerPrompt` (lightweight: task summary + last 2 executor outcomes) and `buildExecutorPrompt` (full context: history, open questions, blockers, planner synthesis).
*   Shared types `SharedTaskContext`, `TurnRecord`, and `ContributionRecord` added under `src/types/`.
*   `ChatViewProvider` council/executor orchestration is state-aware via `buildExecutorPrompt`.
*   History persistence upgraded to resumable task snapshots (taskId / turnSequence).
*   Bounded context compression implemented to prevent unbounded prompt growth.

### 3. Bottom Layer: CLI Adapter Layer (System Hooks)
Node.js sub-processors invoking official tools (e.g., `@github/copilot`, `claude-code`) via continuous `child_process.spawn`.
*   **Timeout-Free Execution**: Large language models functioning as "Coding Agents" execute independent, multi-step sub-routines (e.g., inspecting files, semantic searches). We use `timeout: 0` alongside unbounded I/O streams allowing these local scripts infinite runtime to conclude their autonomous loops natively.

## 🧗 Development Roadmap

### Phase 1: MVP Scaffolding ✅
*   [x] Run `npx yo code` to generate a Typescript extension.
*   [x] Register the `OptimusCode.chatView` component inside the Activity Bar.
*   [x] Abstract a `child_process` wrapper utilizing `spawn` to successfully hijack binaries while forcing `TERM=dumb`, avoiding color code leaks.

### Phase 2: Complete the Streaming Loop ✅
*   [x] Construct an `AgentAdapter` interface binding multiple concurrent models.
*   [x] Add continuous byte-stream updates via VS Code inter-process message passing (`postMessage`).
*   [x] Translate OS-level model errors into user-friendly diagnostic UI elements. 

### Phase 3: Dual Execution Strategy & Mode-based Agent Filtering ✅
*   [x] Refactor `PersistentAgentAdapter` to support dual-mode: non-interactive (`-p`) for plan/ask/auto, persistent daemon for agent mode.
*   [x] Add `modes` field to `AgentAdapter` interface and configuration schema, enabling per-agent mode control.
*   [x] Executor dropdown in UI filtered to show only agents supporting `agent` mode.
*   [x] Max 3 concurrent agent selection enforced in the Webview.

### Phase 4: Conflict Synthesis & Shared Task State ✅
*   [x] Read `vscode.window.activeTextEditor` to inject live context automatically (selection-priority, visible-range fallback, live badge UI).
*   [x] Introduce `SharedTaskStateManager` and task-scoped context snapshots.
*   [x] Persist resumable task history instead of read-only session archives.
*   [x] Replace raw planner text concatenation with structured executor context synthesis (`buildExecutorPrompt`).
*   ~~Allow models to "Review" another model's output~~ — **descoped**: executor summary synthesis is sufficient for conflict resolution.
*   [x] Inject code block replacements back into the workspace utilizing `WorkspaceEdit` (executor output fenced blocks with filename annotations get "Apply to file" buttons; applying writes via `vscode.workspace.applyEdit`).

### Phase 5: App-level Multi-turn ✅
*   [x] Support continuing a prior task through `taskId` / `turnSequence` rather than relying on CLI daemons.
*   [x] Add deterministic context compression for long-running tasks.
*   [x] Expose resume-task semantics in the Webview history UI.
*   [x] Keep CLI-native persistent sessions as an optional future enhancement, not the primary memory mechanism.

---
*"In the holy trinity of the Architect (You), the Code Bee (Copilot), and the Reviewer (Claude), you just press the button and sip your coffee."*
## UI/UX Philosophy
- **Tool-Call Mental Model**: The Multi-Agent Council execution should be presented to the user visually as 'Tool Calls' (e.g., hidden inside <details> blocks on success). Do not present complex dashboards or raw multi-agent logs as equal peers to standard conversation messages. Always mimic the minimal, conversational UX standards seen in GitHub Copilot and Claude to reduce the user's cognitive load.

## Configuration & Context Management
- **The \.optimus/\ Directory**: To maintain a Single Source of Truth (SSOT) across all multi-agent backends (Copilot, Claude, etc.), the orchestrator uses the \.optimus/\ directory in the target workspace. 
  - \.optimus/rules.md\: The primary instructions file. Optimus automatically synchronizes this to runner-specific locations (e.g., \.claude/CLAUDE.md\, \.github/copilot-instructions.md\) on startup.
  - *Future Extensibility*: This directory is designed to scale natively, capable of hosting future context payloads like \.optimus/tasks.md\ (for task queues) or \.optimus/memory.md\ (for long-term agent memory).
