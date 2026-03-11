import os
import sys
import json
import httpx
import argparse

BASE_URL = "https://jules.googleapis.com/v1alpha"

def get_headers(api_key):
    return {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json"
    }

def list_sessions(api_key):
    url = f"{BASE_URL}/sessions"
    all_sessions = []
    params = {}
    with httpx.Client() as client:
        while True:
            response = client.get(url, headers=get_headers(api_key), params=params)
            response.raise_for_status()
            data = response.json()
            all_sessions.extend(data.get("sessions", []))
            token = data.get("nextPageToken")
            if not token:
                break
            params["pageToken"] = token
    return all_sessions

def get_session(api_key, session_id):
    url = f"{BASE_URL}/sessions/{session_id}"
    with httpx.Client() as client:
        response = client.get(url, headers=get_headers(api_key))
        response.raise_for_status()
        return response.json()

def approve_plan(api_key, session_id):
    url = f"{BASE_URL}/sessions/{session_id}:approvePlan"
    with httpx.Client() as client:
        response = client.post(url, headers=get_headers(api_key))
        response.raise_for_status()
        return response.json()

def send_message(api_key, session_id, prompt):
    url = f"{BASE_URL}/sessions/{session_id}:sendMessage"
    payload = {"prompt": prompt}
    with httpx.Client() as client:
        response = client.post(url, headers=get_headers(api_key), json=payload)
        response.raise_for_status()
        return response.json()

def list_activities(api_key, session_id):
    url = f"{BASE_URL}/sessions/{session_id}/activities"
    all_activities = []
    params = {}
    with httpx.Client() as client:
        while True:
            response = client.get(url, headers=get_headers(api_key), params=params)
            response.raise_for_status()
            data = response.json()
            all_activities.extend(data.get("activities", []))
            token = data.get("nextPageToken")
            if not token:
                break
            params["pageToken"] = token
    return all_activities

def get_last_agent_message(api_key, session_id):
    activities = list_activities(api_key, session_id)
    agent_messages = []
    for a in activities:
        if "agentMessaged" in a:
            msg = a["agentMessaged"]["agentMessage"]
            if isinstance(msg, dict):
                agent_messages.append(msg.get("text", str(msg)))
            else:
                agent_messages.append(str(msg))
    return agent_messages[-1] if agent_messages else "No agent messages found."

def get_pr_url(api_key, session_id):
    session = get_session(api_key, session_id)
    outputs = session.get("outputs", [])
    for output in outputs:
        pr = output.get("pullRequest", {})
        url = pr.get("url") or pr.get("pullRequestUrl")
        if url:
            return url
    return "No PR URL found in session outputs."

def create_session(api_key, repo, prompt, automation_mode=None, require_plan_approval=False):
    url = f"{BASE_URL}/sessions"
    title = prompt[:50] + "..." if len(prompt) > 50 else prompt
    payload = {
        "title": title,
        "prompt": prompt,
        "sourceContext": {
            "source": f"sources/github/{repo}",
            "githubRepoContext": {
                "startingBranch": "main"
            }
        },
        "requirePlanApproval": require_plan_approval
    }
    if automation_mode:
        payload["automationMode"] = automation_mode

    with httpx.Client() as client:
        response = client.post(url, headers=get_headers(api_key), json=payload, timeout=30.0)
        response.raise_for_status()
        return response.json()

def main():
    parser = argparse.ArgumentParser(description="Jules REST API Wrapper")
    parser.add_argument("command", choices=["list", "get", "activities", "send", "approve", "last_message", "create", "pr_url"], help="Action to perform")
    parser.add_argument("--session_id", help="Session ID")
    parser.add_argument("--message", help="Message to send")
    parser.add_argument("--repo", help="GitHub repo (owner/name)")
    parser.add_argument("--prompt", help="Prompt content")
    parser.add_argument("--automation-mode", help="Automation mode (e.g. AUTO_CREATE_PR)")
    parser.add_argument("--require-plan-approval", action="store_true", help="Pause for plan review before execution")

    args = parser.parse_args()

    api_key = os.environ.get("JULES_API_KEY")
    if not api_key:
        print("Error: JULES_API_KEY not set.")
        sys.exit(1)

    try:
        if args.command == "list":
            result = list_sessions(api_key)
        elif args.command == "create":
            if not args.repo or not args.prompt:
                print("Error: --repo and --prompt required")
                sys.exit(1)
            result = create_session(api_key, args.repo, args.prompt, args.automation_mode, args.require_plan_approval)
        elif args.command == "get":
            result = get_session(api_key, args.session_id)
        elif args.command == "activities":
            result = list_activities(api_key, args.session_id)
        elif args.command == "last_message":
            print(get_last_agent_message(api_key, args.session_id))
            return
        elif args.command == "send":
            result = send_message(api_key, args.session_id, args.message)
        elif args.command == "approve":
            result = approve_plan(api_key, args.session_id)
        elif args.command == "pr_url":
            print(get_pr_url(api_key, args.session_id))
            return

        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
