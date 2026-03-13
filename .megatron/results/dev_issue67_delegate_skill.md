• Read
↳ {}
• Read
↳ file_path=c:\Users\lochen\megatron-ai\megatron-plugin\skills\delegate-task\SKILL.md
✓ Read
↳ result=lines=32, preview=1→# Delegate Task (The Megatron Dispatch)
• Read
↳ {}
• Read
↳ file_path=c:\Users\lochen\megatron-ai\megatron-plugin\skills\council-review\SKILL.md
✓ Read
↳ result=lines=41, preview=1→---
• TodoWrite
↳ {}
• TodoWrite
↳ todos
✓ TodoWrite
↳ result=lines=1, preview=Todos have been modified successfully. Ensure that you continue to use the todo
• Write
↳ {}
• Write
↳ file_path=c:\Users\lochen\megatron-ai\megatron-plugin\skills\delegate-task\SKILL.md
✓ Write
↳ result=lines=75, preview=The file c:\Users\lochen\megatron-ai\megatron-plugin\skills\delegate-task\SKILL.
• TodoWrite
↳ {}
• TodoWrite
↳ todos
✓ TodoWrite
↳ result=lines=1, preview=Todos have been modified successfully. Ensure that you continue to use the todo

## Execution Complete

The file `megatron-plugin/skills/delegate-task/SKILL.md` has been rewritten with all 6 required changes:

### Changes Applied

1. **Added "Core Rule" section** (lines 10-16) — declares `delegate_task_async` as the hard default, not just preferred. Synchronous `delegate_task` is only allowed when explicitly requested by the user.

2. **Fixed Step 3: Deployment** (lines 38-49) — replaced the blocking "loop and check status" instruction with non-blocking behavior: inform the user, continue working, use `check_task_status` only on demand.

3. **Added Step 4: Non-Blocking Follow-Up** (lines 51-60) — new section defining post-dispatch responsibilities: report success, continue work, check on demand, collect results. Explicitly references the `council-review` skill as the model pattern.

4. **Added "Anti-Patterns" section** (lines 62-69) — lists four prohibited behaviors:
   - No synchronous delegation unless explicitly requested
   - No wait/sleep/poll loops
   - No simulating worker output
   - No blocking the conversation

5. **Removed corrupted duplicate block** — the garbled paragraph at lines 28-28 (with `\ole`, `\task_description` corruption) has been deleted entirely. The `context_files` parameter mention was cleanly incorporated into Step 3's action text.

6. **Made roster tool reference resilient** (line 26) — changed from hardcoded `roster_check` to "your available roster inspection tool (e.g., `roster_check`)" to be resilient to tool name changes.

Additionally: added YAML frontmatter with `name` and `description` fields to match the `council-review` skill format.