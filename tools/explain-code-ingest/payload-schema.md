# Explain Code Ingest Payload

Send learning episodes to:

```http
POST /api/ingest/episodes
x-api-token: expc_live_...
content-type: application/json
```

List existing groups before choosing `groupKey`:

```bash
node tools/explain-code-ingest/publish.mjs --list-groups
```

If a matching group exists, reuse its exact `id` as `groupKey`.
If no matching group exists, choose a stable slug from the repository or project name and include `projectName`; the ingest API creates the group before adding the episode.

Required fields:

- `groupKey`: stable project/repository group key, for example `coin-trade`
- `title`: episode title
- `summary`: one or two sentence summary for cards and search results

Recommended fields:

- `projectName`: human-readable project name. Required when creating a new group.
- `overview`: opening paragraph explaining the code change and why it matters.
- `frameworks`: frameworks or major libraries used.
- `concepts`: concepts that should become tags and syntax notes.
- `flow`: ordered code-writing flow, 3-6 concise steps.
- `files`: changed or important files.
- `codeSnippets`: several important code blocks, each with title, language, code, and description.
- `syntaxNotes`: framework/library/syntax explanations. Prefer detailed paragraphs.
- `diffSummary`: short explanation of what changed in the diff.
- `markdown`: optional extra markdown. Use only for material that does not fit structured fields.
- `createdBy`: `codex`, `claude`, `api`, or `manual`.
- `sessionId`: optional AI session id.

Example:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "useMutation으로 주문 요청과 실패 처리를 나누기",
  "summary": "주문 API 호출, 로딩 상태, 실패 토스트 흐름을 mutation 단위로 정리했습니다.",
  "overview": "이번 변경은 주문 요청과 실패 처리를 컴포넌트에서 분리해 재사용 가능한 mutation 흐름으로 옮긴 작업입니다.",
  "frameworks": ["React", "TanStack Query", "NestJS"],
  "concepts": ["useMutation", "query invalidation", "error boundary"],
  "flow": ["mutation 함수 정의", "onSuccess 캐시 갱신", "onError 메시지 매핑"],
  "files": [
    {
      "path": "frontend/src/features/order/useOrderMutation.ts",
      "summary": "주문 생성 mutation과 실패 메시지 매핑을 분리했습니다.",
      "changeType": "modified"
    }
  ],
  "codeSnippets": [
    {
      "title": "주문 mutation 훅",
      "language": "ts",
      "description": "컴포넌트가 API 세부 구현을 몰라도 주문을 요청할 수 있게 합니다.",
      "code": "export const useOrderMutation = () => useMutation({ mutationFn: createOrder });"
    },
    {
      "title": "성공 후 주문 목록 갱신",
      "language": "ts",
      "description": "주문 생성 후 목록 캐시를 오래된 데이터로 표시해 서버 상태와 화면을 맞춥니다.",
      "code": "queryClient.invalidateQueries({ queryKey: ['orders'] });"
    }
  ],
  "syntaxNotes": [
    {
      "name": "useMutation",
      "description": "TanStack Query에서 서버에 값을 쓰는 요청을 관리하는 훅입니다. 로딩, 성공, 실패 상태와 후속 캐시 갱신을 한곳에 묶어 폼 제출이나 생성 요청을 안정적으로 다룰 수 있습니다.",
      "example": "const orderMutation = useMutation({ mutationFn: createOrder });"
    },
    {
      "name": "query invalidation",
      "description": "쓰기 요청이 성공한 뒤 관련 읽기 캐시를 오래된 데이터로 표시하고 다시 불러오게 하는 TanStack Query 패턴입니다.",
      "example": "queryClient.invalidateQueries({ queryKey: ['orders'] });"
    }
  ],
  "createdBy": "codex"
}
```

Publish with:

```bash
node tools/explain-code-ingest/publish.mjs payload.json
```

Use `--dry-run` to validate and print the request without sending it.
