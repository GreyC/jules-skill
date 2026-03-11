# Jules REST API Reference

The Jules REST API (Alpha) provides programmatic access to Jules sessions, sources, and activities.

## Authentication
Pass your API Key in the `x-goog-api-key` header.
- **Header**: `x-goog-api-key: YOUR_API_KEY`

## Base URL
`https://jules.googleapis.com/v1alpha`

## Endpoints Summary

| Action | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **List Sessions** | `GET` | `/sessions` | List all sessions |
| **Get Session** | `GET` | `/sessions/{id}` | Get session details |
| **Create Session** | `POST` | `/sessions` | Create a new session |
| **Approve Plan** | `POST` | `/sessions/{id}:approvePlan` | Approve a proposed plan |
| **Send Message** | `POST` | `/sessions/{id}:sendMessage` | Send feedback/instructions |
| **List Activities**| `GET` | `/sessions/{id}/activities` | List actions/messages in a session |
| **List Sources** | `GET` | `/sources` | List available GitHub repositories |

## Request/Response Schemas

### Create Session
**Body**:
```json
{
  "prompt": "string",
  "sourceContext": {
    "source": "sources/github/{owner}/{repo}",
    "githubRepoContext": { "startingBranch": "string" }
  },
  "title": "string",
  "automationMode": "AUTO_CREATE_PR",
  "requirePlanApproval": true
}
```

### Send Message
**Body**:
```json
{
  "prompt": "string"
}
```
