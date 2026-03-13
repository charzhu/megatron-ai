# Phase 1 Goal: Prepare ChatViewProvider UI for native VSCode LM API

- [ ] Read src/providers/ChatViewProvider.ts to understand how user messages (like '/pm') are currently handled.
- [ ] Read src/extension.ts to see how the 'Megatron AI: Test PM Agent (LM API)' command interacts with 'vscode.lm'.
- [ ] Update src/providers/ChatViewProvider.ts so that when a user message starts with '/pm', it bypasses the standard AgentAdapter logic and instead calls scode.lm (using the same logic from extension.ts).
- [ ] Ensure that the response from the LLM is captured and saved as a markdown file named .megatron/TODO.md. Use scode.workspace.fs.writeFile.
- [ ] Display the resulting LLM text back into the Webview chat UI as the assistant's reply.
