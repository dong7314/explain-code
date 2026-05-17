# Explain Code Backend

Node.js + Express + PostgreSQL API server for the current frontend prototype.

## Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- `pg`
- `zod`
- JWT auth
- hashed admin/API tokens

## Local Setup

The local `.env` is already prepared for:

```text
PGHOST=localhost
PGPORT=5433
PGDATABASE=explain_code
PGUSER=postgres
```

Run:

```bash
npm install
npm run db:create
npm run db:migrate
npm run db:seed
npm run dev
```

Default API URL:

```text
http://localhost:4000/api
```

Seeded demo login:

```text
admin / explain-code-demo
```

`npm run db:seed` resets the development tables and inserts frontend-compatible mock data.

## Main API Surface

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/project-groups`
- `POST /api/project-groups`
- `GET /api/project-groups/:groupId`
- `PATCH /api/project-groups/:groupId`
- `POST /api/project-groups/:groupId/favorite`
- `DELETE /api/project-groups/:groupId/favorite`
- `GET /api/project-groups/:groupId/episodes`
- `POST /api/project-groups/:groupId/episodes`
- `GET /api/project-groups/:groupId/episodes/:episodeId`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:postId`
- `PATCH /api/posts/:postId`
- `DELETE /api/posts/:postId`
- `GET /api/posts/:postId/comments`
- `POST /api/posts/:postId/comments`
- `GET /api/project-groups/:groupId/episodes/:episodeId/comments`
- `POST /api/project-groups/:groupId/episodes/:episodeId/comments`
- `PATCH /api/comments/:commentId`
- `DELETE /api/comments/:commentId`
- `PUT /api/posts/:postId/reaction`
- `PUT /api/project-groups/:groupId/episodes/:episodeId/reaction`
- `GET /api/search?q=React`
- `GET /api/notifications`
- `PATCH /api/notifications/read-all`
- `GET /api/api-tokens`
- `POST /api/api-tokens`
- `POST /api/api-tokens/:tokenId/reissue`
- `DELETE /api/api-tokens/:tokenId`
- `GET /api/ingest/groups`
- `POST /api/ingest/episodes`
- `GET /api/integration-logs`

## Ingest API

AI tools should call:

```http
GET /api/ingest/groups
x-api-token: expc_live_...
```

Use this endpoint to find an existing group. If no group matches, send `projectName` with the episode payload and the backend creates the group before inserting the episode.

```http
POST /api/ingest/episodes
x-api-token: expc_live_...
```

Payload:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "useMutation으로 주문 요청과 실패 처리를 나누기",
  "summary": "주문 API 호출, 로딩 상태, 실패 토스트 흐름을 정리했습니다.",
  "overview": "이번 변경은 주문 요청 상태와 실패 처리를 컴포넌트에서 분리해 재사용 가능한 mutation 흐름으로 옮긴 작업입니다.",
  "frameworks": ["React", "TanStack Query", "NestJS"],
  "concepts": ["useMutation", "query invalidation"],
  "flow": ["mutation 함수 정의", "onSuccess 캐시 갱신"],
  "files": [
    {
      "path": "frontend/src/features/order/useOrderMutation.ts",
      "summary": "주문 생성 mutation과 실패 메시지 매핑을 분리했습니다.",
      "changeType": "modified"
    }
  ],
  "diffSummary": "주문 요청 로직을 훅으로 분리했습니다.",
  "codeSnippets": [
    {
      "title": "주문 mutation 훅",
      "language": "ts",
      "description": "컴포넌트가 API 세부 구현을 몰라도 주문을 요청할 수 있게 합니다.",
      "code": "export const useOrderMutation = () => useMutation({ mutationFn: createOrder });"
    },
    {
      "title": "주문 제출 핸들러",
      "language": "tsx",
      "description": "화면은 mutation 상태만 읽고 제출 가능 여부를 판단합니다.",
      "code": "const submitOrder = () => orderMutation.mutate(formValues);"
    }
  ],
  "syntaxNotes": [
    {
      "name": "useMutation",
      "description": "서버에 값을 쓰는 요청의 로딩, 성공, 실패 상태를 하나의 mutation 객체로 관리합니다.",
      "example": "const orderMutation = useMutation({ mutationFn: createOrder });"
    },
    {
      "name": "query invalidation",
      "description": "쓰기 요청 성공 후 관련 목록 캐시를 다시 불러오도록 표시하는 TanStack Query 패턴입니다.",
      "example": "queryClient.invalidateQueries({ queryKey: ['orders'] });"
    }
  ],
  "createdBy": "codex"
}
```

## Verification

```bash
npm run check
npm run build
```
