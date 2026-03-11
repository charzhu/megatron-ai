# Task: Test Git Workflow (Dry Run / QA)

## Your Mission
We have just updated the `git-workflow` skill to use the new `vcs_*` tools and the new XML guardrails. 
There is a single staged file in the repository: `test_git_workflow.js`.
I need you to process this feature according to your `git-workflow` standard.

## Instructions
1. This is a real test against the live repository. Follow your `git-workflow` step by step.
2. Step 1: Create a tracking issue using `vcs_create_work_item`. The title should be `QA: Test new XML git-workflow skill`.
3. Step 2: Checkout a branch, commit the already staged `test_git_workflow.js`, and push it.
4. Step 3: Create a Pull Request against `master`.
5. Step 4: VERY IMPORTANT: Check back out to `master`.

## Constraints
Do not commit the heavily modified `.optimus/` files or `src/` files. ONLY commit the staged `test_git_workflow.js`. You can use `git commit -m "feat: qa test git workflow, fixes #<ID>"` directly since it's already staged.