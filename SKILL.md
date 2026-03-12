---
name: jules-skill
description: "Interaction with Jules (Google AI coding agent) via MCP tools. Use this skill when you need to: (1) Check the status or progress of a Jules session, (2) Retrieve questions or feedback requests from Jules, (3) Approve a plan or send a message to a session, (4) List all active or past Jules sessions, (5) Create new Jules sessions."
---

# Jules Skill

## Overview

This skill drives Jules via the **`jules-mcp`** MCP server. All API calls are made through MCP tools — no Python scripts needed.

Jules is an **async coding agent** powered by Gemini 2.5 Pro. It clones your repo into a secure Google Cloud VM, generates a multi-step plan, executes it autonomously, and optionally opens a PR.

## Setup

Install the MCP server and add it to your MCP client config:

```json
{
  "mcpServers": {
    "jules": {
      "command": "node",
      "args": ["/path/to/jules-mcp/dist/index.js"],
      "env": {
        "JULES_API_KEY": "<your-key>"
      }
    }
  }
}
```

Or via npx (once published to npm):
```json
{
  "mcpServers": {
    "jules": {
      "command": "npx",
      "args": ["jules-mcp"],
      "env": { "JULES_API_KEY": "<your-key>" }
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_sessions` | List all Jules sessions |
| `get_session` | Get session details and state |
| `create_session` | Create a new Jules session |
| `approve_plan` | Approve Jules's plan to proceed |
| `send_message` | Send feedback or instructions |
| `list_activities` | Full activity timeline |
| `get_last_message` | Jules's latest outbound message |
| `get_pr_url` | Get the PR URL from a completed session |

## Task-Based Workflow

### 1. Creating a Session

**Autopilot** (Jules creates PR automatically):
```
create_session(repo="owner/repo", prompt="Your task", automation_mode="AUTO_CREATE_PR")
```

**Interactive** (review plan before execution):
```
create_session(repo="owner/repo", prompt="Your task", require_plan_approval=true)
```

### 2. Listing & Checking Sessions
```
list_sessions()
get_session(session_id="<ID>")
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
approve_plan(session_id="<ID>")

# Answer a question or send instructions
send_message(session_id="<ID>", message="Your reply here")

# Read Jules's latest message first
get_last_message(session_id="<ID>")
```

### 4. Getting the PR
```
get_pr_url(session_id="<ID>")
```

## Autonomous Monitoring Loop

```
1. list_sessions() → filter where state starts with "AWAITING"
2. For each AWAITING session:
   a. get_session() to confirm current state
   b. AWAITING_PLAN_APPROVAL → get_last_message() to review → approve_plan() or send_message() to cancel
   c. AWAITING_USER_FEEDBACK → get_last_message() to read Jules's question → send_message() with reply
3. Repeat on a schedule (e.g. every 10–15 min)
```

> **`get_last_message` caveat**: returns Jules's last *outbound* message, which may be stale.
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
| Jules's plan matches the task description | `approve_plan()` |
| Two sessions targeting the same file+lines | Approve the first, tell the second to stand down |
| Jules asks to confirm PR creation | Reply: "Yes, create the PR now." |
| Jules asks "do you approve this approach?" for no-op | Reply: "Yes, approved." |

## Prompt Engineering Tips

- **Be specific**: Include file names, function names, and expected outcomes.
- **Scope tightly**: Jules works best on self-contained tasks.
- **Use `require_plan_approval=true`** for non-trivial or risky tasks.
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

- **MCP Server**: [github.com/GreyC/jules-mcp](https://github.com/GreyC/jules-mcp)
- **Jules**: [jules.google.com](https://jules.google.com)
