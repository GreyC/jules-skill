# jules-skill

A CLI tool and AI agent skill for managing [Jules](https://jules.google.com) (Google's async AI coding agent) via its REST API — without needing the Jules web UI.

## Features

- List all Jules sessions
- Create sessions (autopilot, interactive plan review, or standard)
- Approve plans, send feedback, check session state
- Retrieve the PR URL from a completed session
- Works as a standalone CLI **and** as an installable skill for [Claude Code](https://claude.ai/code) and [Gemini CLI](https://github.com/google-gemini/gemini-cli)

## Installation

### As a standalone CLI

```bash
npm install -g @l0r3x/jules-cli
export JULES_API_KEY=<your-key>
jules-cli list
```

### As an agent skill (Claude Code / Gemini CLI)

```bash
git clone https://github.com/GreyC/jules-skill ~/.agents/skills/jules-skill
```

## Usage

### List sessions
```bash
jules-cli list
```

### Create a session
```bash
jules-cli create --repo owner/repo --prompt "Your prompt here"
```

## License
MIT
