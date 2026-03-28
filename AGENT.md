# Agent Workflow

This repository expects agent-driven work to be small, verifiable, and committed incrementally.

## Core Rule

- Create a git commit immediately after each completed bugfix.
- Create a git commit immediately after each completed feature implementation.
- Do not batch multiple unrelated bugfixes or features into one commit.

## Completion Criteria

Before creating that commit, the agent should:

- keep the change scoped to the bugfix or feature being implemented
- run the most relevant validation available for the touched area
- confirm the working tree changes included in the commit match the intended task

## Commit Guidelines

- Use a clear, task-specific commit message
- Prefer one logical change per commit
- Do not amend or rewrite prior commits unless explicitly requested

## Safety Rules

- Never revert or overwrite unrelated user changes
- If the worktree is already dirty, stage and commit only the files that belong to the current bugfix or feature
- If validation cannot be run, state that explicitly before finishing

## Practical Default

For every bugfix or feature implementation, the expected flow is:

1. implement the change
2. validate the change
3. create a dedicated commit
