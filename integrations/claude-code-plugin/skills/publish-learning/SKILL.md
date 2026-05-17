---
description: Publish a structured learning episode from Claude Code to the Explain Code backend. Use when the user asks Claude Code to record, publish, send, or save a learning note, implementation explanation, code flow, changed files, important code snippets, or framework/library syntax notes to Explain Code.
---

# Publish Learning

Create and publish an Explain Code learning episode from the current implementation work.

## Environment

Expect these variables:

```bash
EXPLAIN_CODE_API_URL=http://localhost:4000/api
EXPLAIN_CODE_API_TOKEN=expc_live_...
EXPLAIN_CODE_GROUP_KEY=coin-trade
EXPLAIN_CODE_PROJECT_NAME="실시간 코인 거래 대시보드"
```

Never reveal the full token. If `EXPLAIN_CODE_API_TOKEN` is missing, ask the user to set it before publishing.

## Workflow

1. Inspect the changed files, relevant diff, and user context.
2. List existing Explain Code groups:

```bash
node tools/explain-code-ingest/publish.mjs --list-groups
```

3. Choose `groupKey`:
   - Use `EXPLAIN_CODE_GROUP_KEY` when it is set.
   - Reuse the exact `id` of a matching existing group when found.
   - If no group matches, infer a stable slug from package name, git remote, or current directory, and include `projectName` so the backend creates the group.
4. Create a payload for `POST /api/ingest/episodes`.
5. Use `createdBy: "claude"`.
6. Prefer multiple important code snippets with explanations over one large code dump.
7. Add detailed syntax notes for framework, library, and language concepts.
8. Save the payload to `.explain-code/claude-learning-payload.json`.
9. Validate:

```bash
node tools/explain-code-ingest/publish.mjs .explain-code/claude-learning-payload.json --dry-run
```

10. Publish:

```bash
node tools/explain-code-ingest/publish.mjs .explain-code/claude-learning-payload.json
```

## Payload Shape

Use this shape:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "TokenGuard가 관리자 토큰을 검증하는 순서",
  "summary": "API 토큰의 만료, 권한, 접근 가능 그룹을 확인하는 백엔드 흐름을 정리했습니다.",
  "overview": "이번 변경은 인증 로직을 토큰 파싱, 만료 검증, 권한 확인 순서로 나누어 설명하는 학습 자료입니다.",
  "frameworks": ["Node", "Express", "PostgreSQL"],
  "concepts": ["API token", "RBAC", "middleware"],
  "flow": ["헤더에서 토큰 추출", "토큰 해시 조회", "만료와 scope 검증"],
  "files": [
    {
      "path": "backend/src/middleware/auth.ts",
      "summary": "API 토큰 인증과 scope 검증을 담당합니다.",
      "changeType": "modified"
    }
  ],
  "codeSnippets": [
    {
      "title": "토큰 헤더 읽기",
      "language": "ts",
      "description": "AI 도구는 x-api-token 또는 Bearer 토큰으로 인증 정보를 전달합니다.",
      "code": "const rawToken = request.headers['x-api-token'] ?? getBearerToken(request.headers.authorization);"
    }
  ],
  "syntaxNotes": [
    {
      "name": "middleware",
      "description": "Express에서 라우터에 도달하기 전 요청을 검사하고 필요한 인증 정보를 request에 붙이는 계층입니다."
    }
  ],
  "createdBy": "claude"
}
```

Write Korean learning content by default. Do not include secrets, credentials, raw tokens, or private customer data.
