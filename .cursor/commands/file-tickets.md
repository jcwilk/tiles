---
description: Break the conversation's conclusion (plan, agreement, or hazy outline) into tickets under a new epic, ensuring full coverage and correct dependencies.
---

# File Tickets from Conversation 📋

Turn the **conclusion of this conversation** into a structured set of tickets. The conclusion might be a detailed plan, a hazy agreement, a list of goals, or anything in between. Your job is to ensure every part is represented in at least one ticket, and that dependencies are correctly modeled.

## Workflow

1. **Extract the conclusion**: Review the conversation and identify what was agreed, planned, or outlined. Summarize it clearly before proceeding.
2. **Create an epic**: Run `./tk create "Epic: <short title>" -t epic -d "<summary of the overall initiative>"` to create the parent epic. Note its ID.
3. **Break into tickets**: For each distinct part of the plan:
   - Create a ticket with `./tk create "Title" --parent <epic-id> -d "<description>"` (add `--design`, `--acceptance`, `-t`, `-p` as appropriate).
   - Ensure **every part of the plan** is represented somewhere. Nothing should fall through the cracks.
4. **Model dependencies**: This is **one of the most important parts**.
   - Identify which tickets must be completed before others (e.g. "setup X before building Y").
   - Add dependencies with `./tk dep <id> <dep-id>` (meaning: `id` depends on `dep-id`; `id` cannot start until `dep-id` is closed).
   - Run `./tk dep cycle` to verify there are no dependency cycles.
5. **Verify coverage**: Walk through your extracted conclusion and confirm each item maps to at least one ticket. Adjust or add tickets if needed.
6. **Summarize**: Present the epic, its child tickets, and the dependency graph (e.g. `./tk dep tree <epic-id>` or `./tk show` for key tickets).

## Tips

- **Epic as parent**: Use `--parent <epic-id>` when creating tickets so they are grouped under the epic.
- **Granularity**: Prefer smaller, focused tickets over large monolithic ones. A ticket should be completable in one focused session.
- **Dependencies matter**: If the plan implies order (e.g. "first we need X, then we can do Y"), model it with `dep`. Incorrect or missing dependencies will block or confuse future work.
- **Types**: Use `-t feature` for new capabilities, `-t task` for implementation work, `-t chore` for maintenance, `-t bug` for fixes.
