---
description: Commit and push changes relevant to the current conversation context.
---

# Persist Changes 💾

Commit and push the changes in the repo that are **relevant to the current context** of this conversation. Do not commit unrelated or stray changes.

## Workflow

1. **Identify relevant changes**: Review the conversation and `git status`. Determine which modified/untracked files are part of the work discussed in this session. Ignore files that are clearly unrelated (e.g. accidental edits, debug output, personal config).

2. **Resolve ambiguity**: If it's unclear which files to include (e.g. multiple unrelated changes, or you're unsure whether a file belongs to this context), **ask the user for clarification** before committing. Do not guess.

3. **Stage and commit**: Stage only the relevant files. Write a clear, descriptive commit message that summarizes what was done. Commit.

4. **Push**: Push to the remote branch.

5. **Post-commit check**: After pushing, run `git status` again. If there are **any uncommitted changes** (modified, untracked, or staged-but-not-committed):
   - **Warn clearly**: List the unchecked files and state that they were not committed.
   - **Assess**: Only treat this as acceptable if it seems **expected from context** (e.g. user said "commit just the rl changes", or `.env` is intentionally gitignored, or user explicitly asked to leave something out). Otherwise, explicitly flag it as a concern and ask whether those files should be committed or discarded.

## Rules

- **No force push** unless the user explicitly requests it.
- **No committing secrets** — if any staged file might contain secrets, stop and ask.
- **Scoped commits**: Prefer one logical commit per context. If the conversation covered multiple distinct changes, you may split into multiple commits with clear messages, or ask the user.
- **Clean staging**: Do not stage `.env`, `node_modules`, build artifacts, or other gitignored/irrelevant files.
