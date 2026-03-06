# Optimus Code 

> *The Ultimate Multi-Agent Orchestrator. Let models debate, you make the final call.*

##  What is Optimus Code?

Optimus Code is a VS Code extension that acts as an orchestration engine. Rather than being just another tool that sends prompts directly to an API, it transforms various LLM clients into background "workers" via local CLI commands (like `gh copilot` or `claude`). It lets them review code, debate with each other, and finally presents the best code result to you in an elegant Diff format.

**Strategy:**
By utilizing existing CLI clients from major vendors, we avoid incurring direct API costs. They are wrapped as underlying workers to perform multi-agent reviews.

##  Features

*   **Summon Council:** Select a block of code and summon multiple AI brains for review with a single click.
*   **Local Orchestration:** Uses Node.js child processes to hijack the I/O of local CLI tools.
*   **Seamless Diff:** Once the debate concludes, the final result is presented via VS Code's native Diff view for side-by-side comparison.

##  Getting Started (MVP)

1. Clone this repository and install dependencies:
   ```bash
   npm install
   ```
2. Ensure you have the necessary CLI tools installed (e.g., GitHub CLI `gh` with the `gh-copilot` extension).
3. Press `F5` in VS Code to start debugging.
4. Open any code file in the new debugging window and select the code you want to review.
5. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`), search and execute:
    **`Optimus Code: Summon Council (Debate)`**

##  Architecture & Roadmap

For deeper design thoughts and the state machine design of the multi-brain debate engine, please refer to the core architecture document:
 [IDEA_AND_ARCHITECTURE.md](IDEA_AND_ARCHITECTURE.md)
