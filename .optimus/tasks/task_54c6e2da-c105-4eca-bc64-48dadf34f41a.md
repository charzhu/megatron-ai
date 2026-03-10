The root directory (C:/Users/lochen/optimus-code) is highly cluttered with old debugging scripts and artifacts.
Your mission:
1. Create directories `.optimus/temp_scripts/` and `.optimus/temp_logs/`.
2. Move all loose `*.js` files in the root (e.g. fix_ts.js, rewrite*.js, inject.js) to `.optimus/temp_scripts/`.
3. Move all loose `*.txt` and `*.log` files to `.optimus/temp_logs/`.
4. The file named `nul` should be deleted.
5. If `REFACTOR_PLAN_SESSION_IPC.md` is in root, check if `docs/REFACTOR_PLAN_SESSION_IPC.md` exists. If so, delete the root one, otherwise move it to `docs/`.
6. DO NOT TOUCH essential project files: package*.json, tsconfig*.json, CHANGELOG.md, README.md, .env, .gitignore, src/, optimus-plugin/, docs/, test-ipc/.
Run the necessary PowerShell commands to perform this cleanup. Return a report of what was moved or deleted.