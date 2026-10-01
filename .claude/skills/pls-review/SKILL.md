---
name: pls-review
description: Review the local diff against the design guidelines in CODE_REVIEW.md — SOLID, guard clauses, never-nesting, async correctness, module boundaries, public API surface, React Native compatibility, and Refactoring Guru smells — then apply the fixes the developer approves
arguments: [target]
allowed-tools: Bash(git diff:*) Bash(git status:*) Bash(git log:*)
---

# /pls-review

> If the blocks below appear as literal ``!`...` `` commands rather than as their output, your host
> did not expand them. Run them yourself — read `CODE_REVIEW.md` and `.pls-review/workflow.md`, and
> check `git status` — before going any further.

## Guideline

!`cat ${CLAUDE_PROJECT_DIR}/CODE_REVIEW.md`

## Working tree

!`git status --porcelain`

!`git diff --stat HEAD`

## Requested target

`$target` — empty means auto-detect.

## Workflow

!`cat ${CLAUDE_PROJECT_DIR}/.pls-review/workflow.md`
