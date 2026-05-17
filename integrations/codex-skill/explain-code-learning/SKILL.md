---
name: explain-code-learning
description: Publish AI-generated learning episodes to the Explain Code backend. Use when Codex should summarize recent code work, changed files, important code snippets, framework/library syntax notes, or implementation flow and send it to Explain Code via the ingest API.
---

# Explain Code Learning

Create a structured learning episode from the current code work and publish it to the Explain Code backend.

## Environment

Required before publishing:

```bash
EXPLAIN_CODE_API_TOKEN=expc_live_...
```

Optional:

```bash
EXPLAIN_CODE_API_URL=http://localhost:4000/api
EXPLAIN_CODE_PROJECT_NAME="Real-time coin trading dashboard"
```

Do not print the full token. If the token is missing, ask the user to set `EXPLAIN_CODE_API_TOKEN`.

## Publisher Tool

Use the project-local publisher when it exists:

```bash
node tools/explain-code-ingest/publish.mjs
```

Otherwise use the installer-provided publisher:

```bash
node ~/.explain-code/tools/explain-code-ingest/publish.mjs
```

## Workflow

1. Inspect the recent code change or the files the user wants to explain.
2. List existing Explain Code groups with the publisher tool and `--list-groups`.
3. Choose `groupKey`:
   - Reuse the exact `id` of a matching existing group.
   - If no group matches, infer a stable slug from package name, git remote, or current directory, and include `projectName` so the backend creates the group.
   - Only use `EXPLAIN_CODE_GROUP_KEY` when the user explicitly wants to force a specific group.
4. Build a JSON payload following `tools/explain-code-ingest/payload-schema.md` when that file exists.
5. Prefer several `codeSnippets` over one long snippet. Each snippet needs `title`, `language`, `code`, and `description`.
6. Write detailed `syntaxNotes` for framework, library, and language concepts used by the snippets.
7. Save the payload to a temporary file such as `.explain-code/payload.json`.
8. Validate without sending by running the publisher tool with `.explain-code/payload.json --dry-run`.
9. If validation passes and the user asked to publish, run the publisher tool with `.explain-code/payload.json`.

## Payload Guidance

Required:

- `groupKey`
- `title`
- `summary`

Recommended:

- `projectName`
- `overview`
- `frameworks`
- `concepts`
- `flow`
- `files`
- `diffSummary`
- `codeSnippets`
- `syntaxNotes`
- `createdBy: "codex"`

Write in Korean unless the user requests another language.

## Quality Bar

- Explain why the code was organized that way, not only what changed.
- Include file paths that help the reader inspect the source.
- Keep `summary` short for cards.
- Put the deeper explanation in `overview`, `codeSnippets[].description`, and `syntaxNotes[].description`.
- Avoid secrets, credentials, API keys, private tokens, and customer data in payloads.
