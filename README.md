# Optimus Code 

> *The Ultimate Multi-Agent Orchestrator. Let models debate, you make the final call.*

##  What is Optimus Code?

Optimus Code is a VS Code extension that acts as an orchestration engine. Rather than being just another tool that sends prompts directly to an API, it transforms various LLM clients into background "workers" via an extensible **Adapter Pattern**. 

It provides a **persistent Chat View in the sidebar**, where you can type your prompts. The engine will summon multiple AI brains globally, gather their architectural plans, and present them in the chat panel simultaneously.

##  Features

*   **Sidebar Chat Interface:** Built with official VS Code UI Toolkit.
*   **Multi-Agent Generation:** Asks Gemini, Claude, and Copilot for their solutions and streams them back to you in one place.
*   **Extensible Adapter System:** Easily add your own AI agents (Doubao, Kimi, DeepSeek etc.) by implementing a simple Interface without touching the core UI code.
*   **Auto-only Council Workflow:** Selected planner agents debate in parallel, then one executor agent acts on the synthesized result.
*   **Persistent History Foundation:** The extension already saves council sessions and is evolving toward resumable task state instead of isolated chat transcripts.

##  How Auto Mode Works Today

Every user turn runs through the same two-stage pipeline:

1. **Council Planning**: up to 3 selected planner agents run in parallel and produce independent plans.
2. **Executor Action**: one executor agent receives the successful planner outputs and performs the final action.

This means Optimus Code is already more than a chat wrapper. It is an orchestrator that separates broad planning from narrow execution.

##  Target Architecture

The next major direction is **app-level multi-turn** built on a shared task state owned by Optimus Code itself.

Instead of depending on a single CLI daemon to remember prior turns, the extension will maintain task-scoped state such as:

*   user intent history
*   planner contributions
*   executor outcomes
*   files touched and commands observed
*   open questions, blockers, and latest summaries

This is the preferred direction because it lets agents share the same task facts. In other words, agents will not merely remember their own previous output; they will be able to see what the other agents already did.

The intended implementation shape is:

1. create or load a shared task record
2. collect structured planner contributions
3. synthesize executor context from shared state rather than raw concatenated text
4. persist a resumable task snapshot for future continuation

##  Getting Started (Developer Guide)

1. Clone this repository and install dependencies:
   ```bash
   npm install
   ```
2. Ensure you have the necessary CLI tools installed (gh copilot and @anthropic-ai/claude-code).
3. Press F5 in VS Code to start debugging.
4. Open the **Optimus Code Activity Bar** on the left.
5. Start chatting and watch the multi-agent council provide their plans!

## 🧪 Recommended Test Prompts (Copy & Paste)

When running the extension locally via F5, try pasting these prompts into the Optimus Code sidebar chat to test the side-by-side capabilities of the different configured agents:

### 1. Algorithm & Code Quality
> "Write a robust, type-safe deep clone function in TypeScript. Include comments explaining how you handle circular references and special objects like Date or Regex."
*Tests raw coding ability and TypeScript syntax formatting.*

### 2. System Architecture
> "Design a distributed rate-limiting system for a highly trafficked API. Explain the components, the storage layer (e.g., Redis), and provide a basic Node.js implementation example."
*Compares how different models plan macro-architecture and structure long-form Markdown.*

### 3. Frontend / UI Generation
> "Give me a single-file HTML/JS/CSS implementation of a sleek Kanban board column that accepts dragged items. Use modern Flexbox."
*Tests the Markdown rendering in your VS Code Webview (specifically for large code blocks).*

### 4. Agentic Local Workspace Reading (e.g., Claude Code CLI)
> "Analyze the current workspace. Look into the `src/` directory and summarize what this VS Code extension does."
*Tests infinite-timeout streaming and whether the underlying CLI tool correctly utilizes local file-reading skills.*

##  Architecture Notes For Contributors

*   The current Auto pipeline is intentionally preserved. Any future multi-turn work must extend the council -> executor model rather than replacing it with a generic chat loop.
*   Shared task memory should live in the orchestrator layer, not inside one specific adapter.
*   Claude currently uses one-shot execution for both planning and executor phases because that path is more reliable in the VS Code extension host than a non-TTY daemon.
*   If native CLI-level persistent sessions are reintroduced later, they should be optional and adapter-specific.
