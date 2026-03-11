---
name: jules-skill
description: "Interaction with Jules (Google AI coding agent) via its REST API. Use this skill when you need to: (1) Check the status or progress of a Jules session, (2) Retrieve questions or feedback requests from Jules, (3) Approve a plan or send a message to a session, (4) List all active or past Jules sessions, (5) Create new Jules sessions. This is especially useful in headless environments where the Jules CLI is unavailable or difficult to authenticate."
---

# Jules Agent

## Overview

This skill provides a programmatic interface to Jules's REST API, allowing for session management, plan approval, and interactive feedback. It uses a bundled Python script (`~/.agents/skills/jules-skill/scripts/jules_api.py`) to wrap the API calls.

Jules is an **async coding agent** powered by Gemini 2.5 Pro. It clones your repo into a secure Google Cloud VM, generates a multi-step plan, executes it autonomously, and optionally opens a PR.

## Authentication

All commands require `JULES_API_KEY` in the environment. How you load it depends on your project:

```bash
# Option A: export directly
export JULES_API_KEY=<your-key>
python3 ~/.agents/skills/jules-skill/scripts/jules_api.py list

# Option B: inline
JULES_API_KEY=<your-key> python3 ~/.agents/skills/jules-skill/scripts/jules_api.py list

# Option C: project uses SOPS
sops exec-env secrets.enc.yaml 'python3 ~/.agents/skills/jules-skill/scripts/jules_api.py list'
```

> The examples below use `$SCRIPT` as shorthand for `python3 ~/.agents/skills/jules-skill/scripts/jules_api.py`.

## Task-Based Workflow

### 1. Creating a New Session

**Autopilot** (Jules creates PR automatically):
```bash
$SCRIPT create --repo <owner/repo> --prompt "Your task description" --automation-mode AUTO_CREATE_PR
```

**Interactive** (review plan before execution):
```bash
$SCRIPT create --repo <owner/repo> --prompt "Your task description" --require-plan-approval
```

**Standard** (no plan review, no auto-PR):
```bash
$SCRIPT create --repo <owner/repo> --prompt "Your task description"
```

### 2. Shell Escaping Protocol (CRITICAL)
When prompts contain `${{ ... }}` or other special characters:
1. **Single Quote Wrapping**: Wrap the `--prompt` argument in single quotes.
2. **Backslash Escape**: Use `\${{` inside double quotes.
3. **Nuclear Option**: Use a temporary Python script with `r"""raw string"""` to call `create_session` directly.

### 3. Listing Sessions
```bash
$SCRIPT list
```

### 4. Getting Session Details & State
```bash
$SCRIPT get --session_id <ID>
```

States:
- `IN_PROGRESS` — Jules is actively working
- `AWAITING_PLAN_APPROVAL` — Jules generated a plan, waiting for you to approve before executing
- `AWAITING_USER_FEEDBACK` — Jules hit a question mid-execution, waiting for your reply
- `COMPLETED` — Jules finished (may or may not have opened a PR)
- `FAILED` — Jules encountered an unrecoverable error
- `WAITING_FOR_USER_INPUT` — alias/variant of AWAITING_USER_FEEDBACK (seen in older sessions)

### 5. Viewing Activity History
```bash
$SCRIPT activities --session_id <ID>
```

### 6. Getting the Latest Agent Message
```bash
$SCRIPT last_message --session_id <ID>
```

### 7. Sending Feedback or Instructions
```bash
$SCRIPT send --session_id <ID> --message "Your instructions here"
```
Note: Messages can be sent to `COMPLETED` sessions — Jules may wake up and push a follow-up commit.

### 8. Approving a Plan
```bash
$SCRIPT approve --session_id <ID>
```

### 9. Getting the PR URL
```bash
$SCRIPT pr_url --session_id <ID>
```

## Autonomous Monitoring Loop

For an agent handling Jules communication autonomously, follow this loop:

```
1. list sessions → filter state.startswith("AWAITING")
2. For each AWAITING session:
   a. get session state
   b. If AWAITING_PLAN_APPROVAL → read last_message to review the plan → approve or cancel
   c. If AWAITING_USER_FEEDBACK → read last_message to see Jules's question → send reply
3. Repeat on a schedule (e.g. every 10–15 min)
```

> **`last_message` caveat**: it returns Jules's last *outbound* message, which may be stale
> (Jules's original question before you replied). Always check the session `state` first —
> if the state just changed to `AWAITING_USER_FEEDBACK`, the last_message is fresh.
> If you already replied and the state is still `AWAITING`, Jules hasn't processed your answer yet.

## Decision Heuristics

When reviewing a Jules message, apply these rules before replying or approving:

| Situation | Action |
|-----------|--------|
| Jules reports an import / symbol IS used | Close without changes — issue is stale |
| Jules reports tests already exist | Close without changes — issue is stale |
| Jules asks about scope ("should I also fix X?") | Reply: strictly scope to the one file/import listed. Do not expand. |
| Jules asks "class method or standalone function?" | Match the existing file structure — no new classes unless file already has one |
| Jules asks about trailing whitespace preservation | No need to preserve — clean output preferred |
| Jules asks about benchmark scripts | Not needed — correctness changes don't need benchmarks |
| Jules's plan matches the task description | Approve |
| Two sessions targeting the same file+lines | Approve the first, tell the second to stand down |
| Jules asks to confirm PR creation after successful change | Reply: "Yes, create the PR now." |
| Jules asks "do you approve this approach?" for no-op close | Reply: "Yes, approved." |

## Prompt Engineering Tips

- **Be specific**: Include file names, function names, and expected outcomes. "Fix the null check in `auth.ts`'s `login` function" beats "fix a bug".
- **Scope tightly**: Jules works best on self-contained tasks. Decompose large tasks into sequential issues.
- **Use `--require-plan-approval`** for non-trivial or risky tasks — review and edit the plan before Jules executes.
- **Always append constraints** relevant to your project, for example:
  ```
  Constraints:
  - Do NOT commit one-time patch/migration scripts.
  - Only include files directly required by the task.
  - Do not add docstrings or comments to code you didn't change.
  ```

## Prompt Templates

Use `// <Action> {specific thing}` as the opening line — Jules responds well to directive-style prompts.

**Debugging**
- `// Help me fix {specific error} in {file}:{function}`
- `// Find race conditions in {specific async code}`
- `// Trace why {value} is undefined in {file}`
- `// Add logging to help debug {specific silent failure}`

**Refactoring**
- `// Refactor {file} from {x} to {y}`
- `// Find duplicate logic across {files} and consolidate`
- `// Convert this callback-based code into async/await in {file}`
- `// Identify tech debt in {file}`

**Testing**
- `// Add integration tests for {endpoint} in {file}`
- `// Write a Pytest fixture to mock {external API call}`
- `// Write a test to ensure backward compatibility for {function}`

**Documentation**
- `// Write API docs for {endpoint}`
- `// Generate Sphinx-style docstrings for {module/class/function}`

**Package Management**
- `// Upgrade my linter and autofix breaking config changes`
- `// Which dependencies in {package.json/requirements.txt} can I safely remove?`

**Onboarding**
- `// What's going on in this repo?` — great first prompt for any unfamiliar codebase

## AGENTS.md

Jules automatically reads `AGENTS.md` from the repo root. This is the primary mechanism for giving Jules persistent context — testing patterns, coding conventions, branch strategy, environment setup. Keep it up to date.

## Resources

- **`~/.agents/skills/jules-skill/scripts/jules_api.py`**: The core Python wrapper for the REST API.
- **`~/.agents/skills/jules-skill/references/api_reference.md`**: Detailed documentation of the Jules REST API endpoints and schemas.
