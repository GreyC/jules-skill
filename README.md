# jules-skill

A CLI tool and AI agent skill for managing [Jules](https://jules.google.com) (Google's AI coding agent) via its REST API — without needing the Jules web UI.

Designed for headless environments, autonomous agent loops, and developers who want to drive Jules from the terminal or integrate it into CI/CD workflows.

## Features

- List all Jules sessions with pagination
- Create sessions (autopilot, interactive plan review, or standard)
- Approve plans, send feedback, check session state
- Retrieve the PR URL from a completed session
- Works as a standalone CLI **and** as an installable skill for [Claude Code](https://claude.ai/code) and [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## Requirements

- Python 3.9+
- [`httpx`](https://www.python-httpx.org/) (`pip install httpx`)
- A Jules API key (`JULES_API_KEY`)

## Installation

### As a standalone CLI

```bash
git clone https://github.com/GreyC/jules-skill
cd jules-skill
pip install httpx
export JULES_API_KEY=<your-key>
python scripts/jules_api.py list
```

### As an agent skill (Claude Code / Gemini CLI)

```bash
git clone https://github.com/GreyC/jules-skill ~/.agents/skills/jules-skill
```

Both Claude Code and Gemini CLI automatically discover skills placed in `~/.agents/skills/`.

## Usage

All commands require `JULES_API_KEY` in the environment.

### List sessions

```bash
python scripts/jules_api.py list
```

### Create a session

```bash
# Autopilot — Jules creates the PR automatically
python scripts/jules_api.py create \
  --repo owner/repo \
  --prompt "Refactor the login function in auth.py to use async/await" \
  --automation-mode AUTO_CREATE_PR

# Interactive — pause for plan review before execution
python scripts/jules_api.py create \
  --repo owner/repo \
  --prompt "Add rate limiting to the /api/token endpoint" \
  --require-plan-approval
```

### Inspect a session

```bash
# Full session details and state
python scripts/jules_api.py get --session_id <ID>

# Activity timeline
python scripts/jules_api.py activities --session_id <ID>

# Jules's latest message
python scripts/jules_api.py last_message --session_id <ID>
```

### Interact with a session

```bash
# Approve a pending plan
python scripts/jules_api.py approve --session_id <ID>

# Send feedback or instructions
python scripts/jules_api.py send --session_id <ID> --message "Looks good, please create the PR."

# Get the PR URL from a completed session
python scripts/jules_api.py pr_url --session_id <ID>
```

## Session States

| State | Meaning |
|-------|---------|
| `IN_PROGRESS` | Jules is actively working |
| `AWAITING_PLAN_APPROVAL` | Jules generated a plan, waiting for your approval |
| `AWAITING_USER_FEEDBACK` | Jules has a question mid-execution |
| `COMPLETED` | Jules finished (PR may or may not have been created) |
| `FAILED` | Unrecoverable error |
| `WAITING_FOR_USER_INPUT` | Alias for `AWAITING_USER_FEEDBACK` (older sessions) |

## Autonomous Monitoring Loop

Poll Jules sessions and respond automatically:

```python
import subprocess, json, time

def poll():
    sessions = json.loads(subprocess.check_output(["python", "scripts/jules_api.py", "list"]))
    for s in sessions:
        state = s.get("state", "")
        sid = s["name"].split("/")[-1]
        if state == "AWAITING_PLAN_APPROVAL":
            subprocess.run(["python", "scripts/jules_api.py", "approve", "--session_id", sid])
        elif state == "AWAITING_USER_FEEDBACK":
            # read last_message, decide, then send reply
            pass

while True:
    poll()
    time.sleep(600)  # every 10 minutes
```

## SKILL.md

`SKILL.md` contains the full agent skill definition used by Claude Code and Gemini CLI — including decision heuristics, prompt templates, and workflow guidance for autonomous Jules management.

## License

MIT
