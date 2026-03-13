---
name: jules-skill
description: "Use this skill whenever Jules (Google's async AI coding agent) is mentioned or implied. Triggers include: starting a new Jules coding task (\"kick off\", \"create a session\"), checking Jules session status or progress, reading a message Jules left, approving or rejecting a Jules plan, replying to Jules mid-task, and scanning for sessions in states like AWAITING_PLAN_APPROVAL or AWAITING_USER_FEEDBACK. Also triggers on bare Jules session IDs (long numeric strings) or any request to monitor, manage, or respond to Jules activity across repos."
---

# Jules Skill

## Overview

This skill drives Jules via the **`jules_cli`** CLI. All API calls are made through shell commands — no MCP server needed.

Jules is an **async coding agent** powered by Gemini 2.5 Pro. It clones your repo into a secure Google Cloud VM, generates a multi-step plan, executes it autonomously, and optionally opens a PR.

## Prerequisites

`JULES_API_KEY` must be available. Set it via one of:

1. **Environment variable**: `export JULES_API_KEY=<your-key>`
2. **Interactive setup**: `jules_cli setup` (prompts for key, saves to `~/.config/jules/config.json`)

## CLI Command Reference

| Command | Description |
|---------|-------------|
| `jules_cli list [--json]` | List all Jules sessions |
| `jules_cli show <id> [--json]` | Get session details and state |
| `jules_cli create --repo owner/repo --prompt "..." [--auto-pr] [--approve-plan] [--json]` | Create a new Jules session |
| `jules_cli approve <id>` | Approve Jules's plan to proceed |
| `jules_cli send <id> --message "..." [--json]` | Send feedback or instructions |
| `jules_cli last-msg <id> [--json]` | Jules's latest outbound message |
| `jules_cli pr-url <id>` | Get the PR URL from a completed session |
| `jules_cli setup` | Interactive API key setup |

## Most Common Pattern: Sweep AWAITING Sessions

When the user mentions Jules activity or asks you to "check Jules", always start here:

```
1. jules_cli list --json
2. Filter: state contains "AWAITING"
3. For each hit:
   - jules_cli last-msg <id>  → read Jules's question/plan
   - AWAITING_PLAN_APPROVAL  → jules_cli approve <id>  (or jules_cli send <id> --message "..." to cancel)
   - AWAITING_USER_FEEDBACK  → jules_cli send <id> --message "your reply"
```

If the user says "jules #<ID> updated" or pastes a session ID, go straight to `jules_cli show <id>` then `jules_cli last-msg <id>`.

## Task-Based Workflow

### 1. Creating a Session

**Autopilot** (Jules creates PR automatically):
```
jules_cli create --repo owner/repo --prompt "Your task" --auto-pr
```

**Interactive** (review plan before execution):
```
jules_cli create --repo owner/repo --prompt "Your task" --approve-plan
```

### 2. Listing & Checking Sessions
```
jules_cli list
jules_cli show <id>
```

States:
- `IN_PROGRESS` — Jules is actively working
- `AWAITING_PLAN_APPROVAL` — waiting for you to approve the plan
- `AWAITING_USER_FEEDBACK` — Jules has a question mid-execution
- `COMPLETED` — Jules finished (PR may or may not exist)
- `FAILED` — unrecoverable error
- `WAITING_FOR_USER_INPUT` — alias for AWAITING_USER_FEEDBACK (older sessions)

### 3. Responding to Jules
```
# Approve a plan
jules_cli approve <id>

# Answer a question or send instructions
jules_cli send <id> --message "Your reply here"

# Read Jules's latest message first
jules_cli last-msg <id>
```

### 4. Getting the PR
```
jules_cli pr-url <id>
```

## Autonomous Monitoring Loop

```
1. jules_cli list --json  → filter where state starts with "AWAITING"
2. For each AWAITING session:
   a. jules_cli show <id>  to confirm current state
   b. AWAITING_PLAN_APPROVAL → jules_cli last-msg <id> to review → jules_cli approve <id> or jules_cli send <id> --message "..." to cancel
   c. AWAITING_USER_FEEDBACK → jules_cli last-msg <id> to read Jules's question → jules_cli send <id> --message "reply"
3. Repeat on a schedule (e.g. every 10–15 min)
```

> **`last-msg` caveat**: returns Jules's last *outbound* message, which may be stale.
> Always check `state` first — if state just changed to `AWAITING_USER_FEEDBACK`, the message is fresh.
> If you already replied and state is still `AWAITING`, Jules hasn't processed your answer yet.

## Decision Heuristics

| Situation | Action |
|-----------|--------|
| Jules reports an import / symbol IS used | Close without changes — issue is stale |
| Jules reports tests already exist | Close without changes — issue is stale |
| Jules asks about scope ("should I also fix X?") | Reply: strictly scope to the one file/import listed |
| Jules asks "class method or standalone function?" | Match the existing file structure |
| Jules asks about trailing whitespace preservation | No need to preserve — clean output preferred |
| Jules asks about benchmark scripts | Not needed — correctness changes don't need benchmarks |
| Jules's plan matches the task description | `jules_cli approve <id>` |
| Two sessions targeting the same file+lines | Approve the first, tell the second to stand down |
| Jules asks to confirm PR creation | Reply: "Yes, create the PR now." |
| Jules asks "do you approve this approach?" for no-op | Reply: "Yes, approved." |

## Prompt Engineering Tips

- **Be specific**: Include file names, function names, and expected outcomes.
- **Scope tightly**: Jules works best on self-contained tasks.
- **Use `--approve-plan`** for non-trivial or risky tasks.
- **Always append constraints** relevant to your project:
  ```
  Constraints:
  - Do NOT commit one-time patch/migration scripts.
  - Only include files directly required by the task.
  - Do not add docstrings or comments to code you didn't change.
  ```

## Prompt Templates

**Debugging**
- `// Help me fix {specific error} in {file}:{function}`
- `// Trace why {value} is undefined in {file}`

**Refactoring**
- `// Refactor {file} from {x} to {y}`
- `// Convert this callback-based code into async/await in {file}`

**Testing**
- `// Add integration tests for {endpoint} in {file}`
- `// Write a Pytest fixture to mock {external API call}`

**Onboarding**
- `// What's going on in this repo?`

## AGENTS.md

Jules automatically reads `AGENTS.md` from the repo root. Keep it up to date with testing patterns, coding conventions, and environment setup — it's Jules's primary source of project context.

## Resources

- **jules_cli**: `npm install -g @l0r3x/jules-cli` or `npx @l0r3x/jules-cli`
- **Jules**: [jules.google.com](https://jules.google.com)
