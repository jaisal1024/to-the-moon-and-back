---
name: agent-task-protocol
description: Protocol for agents picking up and executing tasks from the backlog without human intervention.
---

# Agent Task Protocol

## 1. Task Acquisition

- Look into the `backlog/` directory for the highest priority task.
- Mark the task as "In Progress" in your `task.md`.

## 2. Implementation

- Always create an `implementation_plan.md` before writing code.
- If the task requires new secrets, update `src/env.schema.ts` and document the requirement.

## 3. Verification

- Run all existing tests: `yarn test` and `yarn test:e2e`.
- Ensure `vercel.json` settings are respected.
- Verify that Sentry is correctly reporting errors if logic is modified.

## 4. Completion

- Update the original backlog item to "Completed".
- Generate a `walkthrough.md` with proof of work.
