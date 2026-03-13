# T3 to T2 Role Precipitation System

## Background
Currently, Megatron uses an Agent Roster composed of T1 (local), T2 (project template), and T3 (dynamic outsourcing) roles. However, there is no formalized mechanism to capture successful, frequently used T3 roles and formally crystallize them into T2 (Project Default) templates (.megatron/roles/).

## Goal
Design a system to analyze T3 dynamically spawned workers, evaluate their performance or utility, and automatically or semi-automatically generate .md role templates under .megatron/roles/ so they become T2 experts.

## Requirements for Review
1. How should we track T3 role usage and success rates?
2. Should the precipitation be fully automatic or require manual PM/User approval?
3. What format or metadata should the finalized T2 role file include to ensure it replaces the T3 invocation correctly?
4. Are there any context-window or token-cost implications in inflating the T2 roster?



## Architectural Constraints (Added by Master/User)
If the Master agent receives a requirement and existing roles don't support it, it must create a new role template. Critically, these roles must establish a formal binding relationship with C:\Users\lochen\megatron-ai\.megatron\config\available-agents.json, clearly defining which underlying worker agent/engine/model the newly created role requires to operate.

