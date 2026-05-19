---
description: Publish a structured learning episode from Claude Code to the Explain Code backend. Use when the user asks Claude Code to record, publish, send, or save a learning note, implementation explanation, code flow, changed files, important code snippets, or framework/library syntax notes to Explain Code.
---

# Publish Learning

Create and publish an Explain Code learning episode from the current implementation work.

## Environment

Required before publishing. Prefer writing it to your shell profile so Claude Code and new terminals can read it:

```bash
grep -qxF 'export EXPLAIN_CODE_API_TOKEN="expc_live_..."' ~/.zshrc || echo 'export EXPLAIN_CODE_API_TOKEN="expc_live_..."' >> ~/.zshrc; source ~/.zshrc
```

Optional:

```bash
grep -qxF 'export EXPLAIN_CODE_API_URL="https://explain.ldy-studio.com/api"' ~/.zshrc || echo 'export EXPLAIN_CODE_API_URL="https://explain.ldy-studio.com/api"' >> ~/.zshrc; source ~/.zshrc
EXPLAIN_CODE_PROJECT_NAME="Real-time coin trading dashboard"
```

Never reveal the full token. If `EXPLAIN_CODE_API_TOKEN` is missing, ask the user to set it before publishing.

## Publisher Tool

When this plugin is loaded, use the bundled command:

```bash
explain-code-publish.mjs
```

It resolves the project-local publisher first and falls back to the installer-provided publisher under `~/.explain-code`.

## Workflow

1. Inspect the changed files, relevant diff, and user context.
2. List existing Explain Code groups:

```bash
explain-code-publish.mjs --list-groups
```

3. Choose `groupKey`:
   - Reuse the exact `id` of a matching existing group when found.
   - If no group matches, infer a stable slug from package name, git remote, or current directory, and include `projectName` so the backend creates the group.
   - Only use `EXPLAIN_CODE_GROUP_KEY` when the user explicitly wants to force a specific group.
4. Create a payload for `POST /api/ingest/episodes`.
5. Use `createdBy: "claude"`.
6. Prefer multiple important code snippets with explanations over one large code dump.
7. Add detailed syntax notes for framework, library, and language concepts.
8. Save the payload to `.explain-code/claude-learning-payload.json`.
9. Validate:

```bash
explain-code-publish.mjs .explain-code/claude-learning-payload.json --dry-run
```

10. Publish:

```bash
explain-code-publish.mjs .explain-code/claude-learning-payload.json
```

## Payload Shape

Use this shape:

```json
{
  "groupKey": "coin-trade",
  "projectName": "Real-time coin trading dashboard",
  "title": "TokenGuard checks admin token access",
  "summary": "Explains how the backend validates API token expiry, scope, and group access.",
  "overview": "This learning note explains token parsing, expiration checks, and permission checks as separate backend steps.",
  "frameworks": ["Node", "Express", "PostgreSQL"],
  "concepts": ["API token", "RBAC", "middleware"],
  "flow": ["Read token from headers", "Lookup token hash", "Validate expiry and scope"],
  "files": [
    {
      "path": "backend/src/middleware/auth.ts",
      "summary": "Handles API token authentication and scope checks.",
      "changeType": "modified"
    }
  ],
  "codeSnippets": [
    {
      "title": "Read token header",
      "language": "ts",
      "description": "AI tools can authenticate with x-api-token or a Bearer token.",
      "code": "const rawToken = request.headers['x-api-token'] ?? getBearerToken(request.headers.authorization);"
    }
  ],
  "syntaxNotes": [
    {
      "name": "middleware",
      "description": "Express middleware checks a request before the route handler and attaches validated auth data to the request."
    }
  ],
  "createdBy": "claude"
}
```

Write Korean learning content by default. Do not include secrets, credentials, raw tokens, or private customer data.
