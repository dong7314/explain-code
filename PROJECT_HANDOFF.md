# ExplainCode Project Handoff

작성일: 2026-05-15  
목적: 이 문서는 현재 로컬에서 진행한 `explain-code` 프로젝트를 다른 컴퓨터로 옮긴 뒤, Codex나 Claude Code가 같은 맥락으로 이어서 개발할 수 있도록 정리한 인수인계 문서입니다.

## 1. 프로젝트 한 줄 설명

ExplainCode는 Codex나 Claude Code 같은 AI 코딩 도구가 코드를 작성한 뒤, 해당 코드 변경의 흐름, 핵심 문법, 프레임워크 개념, 훅/상태 관리 이유 등을 자동으로 학습 글로 남겨주는 오픈소스 프로젝트입니다.

사용자는 AI가 작성한 코드를 단순히 결과물로만 받는 것이 아니라, 왜 그렇게 작성되었는지 학습할 수 있습니다.

## 2. 최종 목표

장기 목표는 다음과 같습니다.

1. 프론트엔드 제공
2. 백엔드 API 제공
3. Codex Skill 또는 Claude Code Plugin 제공
4. 관리자 로그인 및 API 토큰 발급
5. AI 도구가 특정 JSON payload로 API를 호출하면 학습 에피소드 자동 등록
6. 레포지토리 단위의 Project Group 관리
7. Docker Hub 배포
8. Helm Chart 제공
9. k3s 또는 Kubernetes에서 한 번에 설치 가능하게 구성

## 3. 현재 디렉토리 구조

현재 루트 구조는 아래와 같습니다.

```text
explain-code/
  backend/
    README.md
  deploy/
    helm/
      explain-code/
        Chart.yaml
        values.yaml
        templates/
  frontend/
    public/
      brand-icon.svg
      favicon.svg
      icons.svg
      runtime-config.js
    src/
      api/
        http.ts
      config/
        runtime.ts
      App.tsx
      App.css
      index.css
      main.tsx
    screenshots/
    package.json
    package-lock.json
    vite.config.ts
    ...
  skills/
    README.md
  PROJECT_HANDOFF.md
```

현재 실제 구현은 거의 모두 `frontend`에 있습니다. `backend`와 `skills`는 아직 본격 구현 전입니다.

## 4. 실행 방법

새 컴퓨터에서 압축을 푼 뒤:

```bash
cd explain-code/frontend
npm install
npm run dev
```

기본 Vite dev server는 보통 아래 주소로 뜹니다.

```text
http://localhost:5173
```

기존 컴퓨터에서는 5173 포트가 이미 사용 중이라 Vite가 `http://127.0.0.1:5174/`로 실행된 적이 있습니다. 새 컴퓨터에서는 상황에 따라 포트가 달라질 수 있습니다.

검증 명령:

```bash
npm run lint
npm run build
```

마지막 작업 시점 기준으로 두 명령은 모두 통과했습니다.

## 4.1 런타임 설정과 Helm 배포 방향

프론트엔드는 Vite 빌드 타임 환경변수에만 의존하지 않고, `/runtime-config.js`를 먼저 로드하도록 구성되어 있습니다.

```text
frontend/public/runtime-config.js
frontend/src/config/runtime.ts
frontend/src/api/http.ts
```

런타임 설정 예시:

```js
window.__EXPLAIN_CODE_CONFIG__ = {
  appEnv: "local",
  apiBaseUrl: "/api",
  authTokenStorageKey: "explain-code-auth-token",
  authStateStorageKey: "explain-code-logged-in",
};
```

나중에 프론트 이미지를 Docker Hub에 올릴 때는 정적 파일을 `/usr/share/nginx/html`에 두는 nginx 계열 이미지 구성을 기준으로 잡으면 됩니다. Helm Chart는 ConfigMap을 통해 `/usr/share/nginx/html/runtime-config.js`를 덮어씌우도록 준비되어 있습니다.

Helm Chart 초안 위치:

```text
deploy/helm/explain-code
```

현재 차트는 프론트 ConfigMap/Deployment/Service와 백엔드 ConfigMap/Secret/Deployment/Service 골격을 포함합니다. 백엔드는 아직 구현 전이므로 `values.yaml`에서 `backend.enabled: false`가 기본입니다.

## 5. 기술 스택

현재 프론트엔드:

- React 19
- TypeScript
- Vite
- lucide-react
- CSS 단일 파일 기반 스타일링

현재 패키지 스크립트:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

## 6. 지금까지 구현한 주요 기능

### 6.1 전체 UI 방향

초기에는 솔루션/대시보드 같은 느낌이 강했지만, 사용자의 요청에 따라 OKKY 같은 한국 개발자 커뮤니티 느낌으로 바꿨습니다.

현재 UX 방향:

- 커뮤니티형 게시판 분위기
- 너무 과한 대시보드 카드 UI 지양
- 한국 서비스처럼 단정하고 트렌디한 톤
- Toss, Naver, Danggeun, Wanted 같은 제품 감도 참고
- 태블릿, 모바일, 노트북, 데스크톱 반응형 고려

### 6.2 주요 메뉴

현재 상단 메뉴:

- `AI 학습`
- `Q&A`
- `커뮤니티`
- `스킬/토큰`

제거된 메뉴:

- `이벤트`

Q&A와 커뮤니티는 운영 옵션에서 켜고 끌 수 있습니다. 혼자 설치해서 쓰는 경우 커뮤니티 기능이 필요 없을 수 있기 때문입니다.

### 6.3 운영 옵션

상단 헤더의 설정 아이콘을 클릭하면 `운영 옵션` 팝오버가 열립니다.

기능:

- Q&A 메뉴 표시 여부
- 커뮤니티 메뉴 표시 여부
- 팝오버 바깥 영역 클릭 시 자동 닫힘
- 기본 브라우저 checkbox가 아니라 커스텀 체크박스 사용
- 체크박스 border radius는 `4px`

오른쪽 사이드바에도 동일한 `운영 옵션` 카드가 있습니다.

### 6.4 로그인 모달

로그인 버튼 클릭 시 데모 로그인 모달이 뜹니다.

현재는 실제 인증은 아니고 UI 상태만 바뀝니다.

동작:

- `로그인` 버튼 클릭
- 모달 열림
- `데모 로그인` 클릭
- 상단 버튼이 `mirae.dev`로 변경
- 다시 열면 로그아웃 가능

추후 백엔드 인증과 연결해야 합니다.

### 6.5 AI 학습 페이지

AI 학습 페이지는 핵심 페이지입니다.

현재 구조:

1. 헤더 설명
2. Project Group 탐색
3. 선택된 Project Group 요약
4. 에피소드 목록
5. 선택된 에피소드 요약
6. 상세 페이지에서 읽기

상단의 중복 카테고리 탭은 제거했습니다. 대신 Project Group 탐색 내부의 필터만 유지합니다.

### 6.6 Project Group 탐색

처음에는 그룹 카드 3개를 단순 나열했지만, 그룹이 20개, 30개로 늘어나는 상황을 고려해 탐색기 형태로 바꿨습니다.

현재 기능:

- 그룹명, 프레임워크, 작성자로 검색
- 필터:
  - 전체
  - React
  - Backend
  - 전환
  - 인증
- 정렬:
  - 최근 업데이트순
  - 에피소드 많은 순
  - 이름순
- 커스텀 정렬 드롭다운
- 바깥 클릭 시 드롭다운 닫힘
- 현재 검색/필터 결과 개수 표시
  - 예: `1개 그룹 / 전체 7개`
- 그룹 수가 많아지면 내부 스크롤
- 스크롤 위치에 따른 페이드 효과
  - 최상단: 아래만 페이드
  - 중간: 위/아래 둘 다 페이드
  - 최하단: 위만 페이드

그룹 선택 상태:

- 왼쪽 border 강조 방식은 제거
- 연한 파란 배경
- 전체 border
- 폴더 아이콘 반전
- 폴더 닫힘/열림 애니메이션

### 6.7 Project Group 요약

선택된 그룹의 상세 요약 영역입니다.

현재 표시:

- Project Group 제목
- 설명
- 작성자
- 에피소드 수
- 최근 업데이트
- 그룹명
- 설명 대상
- 프레임워크
- 오른쪽 상단 즐겨찾기 별표

사용자가 별표를 누르면 해당 그룹이 `즐겨찾는 학습 그룹`에 추가/제거됩니다.

별표 버튼은 일반 버튼 박스가 아니라 아이콘만 보이는 형태입니다.

### 6.8 에피소드 목록

Project Group 아래에는 에피소드 목록이 있습니다.

현재 동작:

- 왼쪽 에피소드 목록에서 `1편`, `2편`, `3편` 등을 선택
- 클릭해도 상세 페이지로 바로 이동하지 않음
- 오른쪽 에피소드 요약 내용만 변경
- 오른쪽의 `상세 페이지에서 읽기` 버튼을 눌러야 상세 페이지 이동

에피소드 목록은 편수가 많아질 때를 고려했습니다.

- 내부 스크롤 적용
- Project Group 탐색과 같은 페이드 효과 적용
- 최상단/중간/최하단 스크롤 상태에 따라 페이드 방향 변경

### 6.9 AI 학습 상세 페이지

AI 학습 상세 페이지는 일반 p 태그 느낌이 아니라 Notion/Markdown 스타일을 목표로 구성했습니다.

현재 구성:

- 목록으로 버튼
- 그룹명
- AI 자동 등록 표시
- 제목
- 요약
- 작성 정보
- 조회 수
- 태그
- Markdown/Notion 스타일 본문
  - callout
  - 코드 작성 플로우
  - 핵심 개념
  - 코드 블록
  - 인용문
  - 체크리스트
- 추천/비추천
- 댓글 작성
- 댓글 목록

AI 학습 상세 페이지 헤더는 Q&A/커뮤니티 상세와 다르게 태그 영역이 따로 있습니다.

### 6.10 Q&A / 커뮤니티

Q&A와 커뮤니티도 리스트와 상세 페이지가 있습니다.

현재 기능:

- 게시글 카드 클릭 시 상세 페이지 이동
- 상세 페이지에서 추천/비추천 가능
- 댓글 작성 가능
- 댓글 목록 표시
- Q&A와 커뮤니티 메뉴는 운영 옵션에서 숨길 수 있음

### 6.11 추천/비추천 및 댓글

Q&A, 커뮤니티, AI 학습 상세 페이지 모두 같은 `FeedbackBar`를 사용합니다.

현재 기능:

- 추천 클릭
- 비추천 클릭
- 다시 클릭하면 취소
- 댓글 작성
- Ctrl 또는 Cmd + Enter로 댓글 등록
- 댓글은 클라이언트 상태에만 반영

추후 백엔드 연결 필요.

### 6.12 오른쪽 사이드바

오른쪽에는 보조 정보 영역이 있습니다.

현재 섹션:

1. 즐겨찾는 학습 그룹
2. 나의 학습 그룹
3. 운영 옵션
4. 자동 등록 흐름

`즐겨찾는 학습 그룹`:

- Project Group 요약의 별표 버튼으로 등록/해제
- 기본 최대 3개 표시
- 3개 초과 시 `더 보기` 버튼
- 확장 후 `접기`

`나의 학습 그룹`:

- 현재 유저는 임시로 `mirae.dev`
- owner가 `mirae.dev`인 그룹을 표시
- 기본 최대 3개 표시
- 3개 초과 시 `더 보기`

### 6.13 브랜드 아이콘 / 파비콘

기존 아이콘은 문서, 괄호, 플러스가 많은 설명형이라 촌스럽다는 피드백이 있었습니다.

현재는 새 아이콘으로 교체했습니다.

파일:

- `frontend/public/brand-icon.svg`
- `frontend/public/favicon.svg`

새 방향:

- 파란 그라데이션 배경
- 둥근 앱 아이콘 형태
- 코드 말풍선 심볼
- Toss/Danggeun처럼 단순하고 앱스러운 느낌

헤더 로고 텍스트:

- 기본 폰트에서 분리
- `Avenir Next`, `Manrope`, `Pretendard` 계열 폰트 스택 적용
- font-weight는 너무 굵어 보여 `750`으로 조정

## 7. 현재 샘플 데이터

현재 모든 데이터는 `frontend/src/App.tsx` 내부의 하드코딩 mock 데이터입니다.

현재 학습 그룹은 7개입니다.

1. `coin-trade`
   - owner: `mirae.dev`
   - episodes: 7개
   - React, TanStack Query, NestJS

2. `legacy-angular-web`
   - owner: `ng2react`
   - episodes: 2개
   - Angular, React, React Query

3. `study-note-api`
   - owner: `server-sideup`
   - episodes: 1개
   - FastAPI, PostgreSQL, Redis

4. `ai-review-board`
   - owner: `mirae.dev`
   - episodes: 2개
   - Next.js, React, Prisma

5. `onboarding-playbook`
   - owner: `mirae.dev`
   - episodes: 1개
   - React, Supabase, Edge Functions

6. `token-vault-admin`
   - owner: `mirae.dev`
   - episodes: 2개
   - React, NestJS, PostgreSQL

7. `chart-render-lab`
   - owner: `chart-lab`
   - episodes: 1개
   - React, Canvas, WebSocket

초기 즐겨찾기:

- `coin-trade`
- `study-note-api`
- `legacy-angular-web`
- `ai-review-board`
- `token-vault-admin`

## 8. 반응형 작업 내용

반응형에서 특히 신경 쓴 구간:

- 데스크톱
- 태블릿
- 노트북 중간 폭
- 모바일

중요한 브레이크포인트:

- `1020px` 이하:
  - 메인 콘텐츠와 오른쪽 레일 분리 방식 변경

- `980px` 이하:
  - 오른쪽 레일 3열에서 2열
  - 에피소드 목록/요약 2열에서 세로 배치

- `840px` 이하:
  - Project Group 검색창/정렬 버튼 세로 배치

- `760px` 이하:
  - 모바일에 가까운 레이아웃

- `480px` 이하:
  - 헤더 검색, 버튼 텍스트, 팝오버 폭 등 모바일 최적화

마지막 검증에서 966px, 900px, 840px, 761px에서 가로 overflow 없음 확인했습니다.

## 9. 지금까지 특히 많이 조정한 UI 디테일

### 9.1 Project Group 영역

초기 카드형이 너무 답답해서 변경:

- 카드 꽉 찬 UI 제거
- 작성자/에피소드/업데이트를 한 줄 메타로 정리
- 그룹/설명 대상/프레임워크는 카드가 아닌 얇은 정보 행으로 정리

### 9.2 그룹 선택 UI

초기에는 왼쪽 파란 border로 선택 표시했지만 이상하다는 피드백이 있었습니다.

현재:

- 연한 배경
- 얇은 테두리
- 열린 폴더 아이콘
- shadow 제거

### 9.3 스크롤 페이드

처음에는 단순 내부 스크롤이라 카드가 잘려 보였습니다.

현재:

- 페이드 오버레이
- 스크롤 위치 감지
- Project Group 탐색과 에피소드 목록 모두 적용

### 9.4 체크박스

기본 checkbox가 튀어 보였습니다.

현재:

- 커스텀 체크박스
- checked 상태는 파란 배경
- checkmark 직접 구현
- border radius 4px

### 9.5 API 연동 버튼 hover

hover 시 파란 배경에 파란 글자가 묻혀 보이는 문제가 있었습니다.

현재:

- secondary 버튼 hover는 별도 색상 적용
- 글자/아이콘 대비 유지

## 10. 현재 구현상 한계

현재는 프론트 UI 프로토타입입니다.

아직 없는 것:

- 실제 백엔드 API
- DB
- 관리자 인증
- 실제 토큰 발급
- 실제 댓글 저장
- 추천/비추천 저장
- 실제 그룹 생성/수정/삭제
- 실제 AI 도구 payload 수신
- Codex Skill 구현
- Claude Code Plugin 구현
- Dockerfile
- docker-compose
- Helm Chart
- Kubernetes 매니페스트
- CI/CD
- 테스트 코드
- Storybook 또는 컴포넌트 문서

## 11. 다음에 해야 할 일

우선순위 기준으로 정리합니다.

### 11.1 프론트 구조 정리

현재 `App.tsx`와 `App.css`가 매우 커졌습니다. 다음 단계에서는 컴포넌트 분리가 필요합니다.

추천 분리:

```text
frontend/src/
  components/
    Header.tsx
    PopularStrip.tsx
    RightRail.tsx
    FeedbackBar.tsx
    LoginModal.tsx
  features/
    learning/
      LearningSeries.tsx
      LearningDetail.tsx
      ProjectGroupExplorer.tsx
      EpisodePreview.tsx
    posts/
      PostCard.tsx
      PostDetail.tsx
    integrations/
      IntegrationsPage.tsx
  data/
    mockGroups.ts
    mockPosts.ts
  types/
    learning.ts
    post.ts
```

CSS도 함께 분리하는 것이 좋습니다.

### 11.2 상태 관리 정리

현재 상태는 전부 React local state입니다.

추후 필요:

- 즐겨찾기 그룹 persistence
- 로그인 유저 정보
- 댓글 상태
- 추천/비추천 상태
- 검색/필터 상태
- API 요청 상태

초기에는 React state + API hooks로 충분합니다. 나중에 규모가 커지면 Zustand 또는 TanStack Query를 고려할 수 있습니다.

### 11.3 백엔드 설계

백엔드 후보:

- FastAPI
- NestJS

현재 UI/샘플에는 둘 다 등장하지만, 프로젝트의 오픈소스 배포와 API 스키마 문서화를 고려하면 FastAPI가 빠르게 시작하기 좋습니다. TypeScript 일관성을 원하면 NestJS도 괜찮습니다.

필요 엔티티:

- User
- ProjectGroup
- Episode
- Comment
- Reaction
- ApiToken
- IntegrationLog

초기 API 예시:

```http
POST /api/auth/login
POST /api/tokens
GET  /api/project-groups
POST /api/project-groups
GET  /api/project-groups/:id
PATCH /api/project-groups/:id
POST /api/project-groups/:id/favorite
DELETE /api/project-groups/:id/favorite
GET  /api/project-groups/:id/episodes
POST /api/ingest/episodes
GET  /api/episodes/:id
POST /api/episodes/:id/comments
POST /api/episodes/:id/reactions
GET  /api/integration-logs
```

### 11.4 AI 도구 ingest payload 설계

Codex Skill 또는 Claude Code Plugin이 호출할 API는 JSON payload가 명확해야 합니다.

초기 payload 예시:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "useMutation으로 주문 요청과 실패 처리를 나누기",
  "summary": "주문 API 호출, 로딩 상태, 실패 토스트, 캐시 갱신을 mutation 흐름으로 정리했습니다.",
  "frameworks": ["React", "TanStack Query", "NestJS"],
  "concepts": ["useMutation", "query invalidation", "error boundary"],
  "flow": [
    "mutation 함수 정의",
    "onSuccess 캐시 갱신",
    "onError 메시지 매핑"
  ],
  "files": [
    "frontend/src/features/order/useOrderMutation.ts",
    "backend/src/orders/order.controller.ts"
  ],
  "diffSummary": "주문 요청 로직을 컴포넌트에서 분리하고 실패 케이스를 mutation onError로 이동했습니다.",
  "codeSnippets": [
    {
      "language": "ts",
      "title": "useOrderMutation",
      "code": "const mutation = useMutation(...)"
    }
  ],
  "createdBy": "codex",
  "sessionId": "optional-ai-session-id"
}
```

### 11.5 관리자 토큰

목표:

- 관리자 로그인 후 API 토큰 생성
- 토큰은 Codex Skill 또는 Claude Code Plugin에 전달
- AI 도구는 이 토큰으로 ingest API 호출

토큰 요구사항:

- prefix 예: `expc_live_`
- scope:
  - read
  - write
  - admin
- expiresAt
- lastUsedAt
- revokedAt
- ownerUserId

### 11.6 Codex Skill

`skills/README.md` 아래에 실제 Codex Skill을 만들어야 합니다.

Skill 역할:

- 현재 레포 분석
- 변경된 파일 요약
- 프레임워크/개념 추출
- ExplainCode API payload 생성
- 관리자 토큰으로 API 호출

예상 Skill 파일:

```text
skills/
  explain-code/
    SKILL.md
    scripts/
      submit_episode.ts
```

### 11.7 Claude Code Plugin

Claude Code에서도 유사하게 설치 가능한 plugin 또는 slash command 형태가 필요합니다.

초기 목표:

- Claude Code가 작업 완료 후 명령 실행
- 현재 diff를 요약
- ExplainCode API에 episode 등록

### 11.8 Docker / Helm

추후 배포 구조:

```text
docker/
  frontend.Dockerfile
  backend.Dockerfile
helm/
  explain-code/
    Chart.yaml
    values.yaml
    templates/
```

필요 구성:

- frontend
- backend
- postgres
- redis
- ingress
- secret
- configmap

## 12. 새 컴퓨터에서 Codex에게 줄 프롬프트

새 컴퓨터에서 프로젝트 압축을 풀고 Codex를 켠 뒤, 아래 프롬프트를 그대로 주면 됩니다.

```text
이 프로젝트는 ExplainCode라는 오픈소스 프로젝트입니다.

먼저 루트의 PROJECT_HANDOFF.md를 읽고 현재까지 진행된 내용, UI/UX 결정, 남은 작업을 파악해줘.

현재 프론트엔드는 frontend/src/App.tsx와 frontend/src/App.css에 대부분 구현되어 있어.
React + TypeScript + Vite 기반이고, 현재는 mock data 기반 UI 프로토타입 단계야.

우선 기존 UI/UX 방향을 유지하면서 작업해줘.
이 프로젝트는 AI가 작성한 코드의 흐름과 핵심 개념을 Project Group과 Episode 단위로 자동 학습 글로 저장하는 서비스야.

중요한 UX 방향:
- OKKY 같은 커뮤니티 느낌
- 한국 서비스처럼 깔끔하고 트렌디한 UI
- 과한 대시보드 느낌 지양
- Project Group이 20~30개 이상 늘어나는 상황 고려
- 모바일/태블릿/노트북/데스크톱 반응형 유지
- 기존 사용자가 요청해서 다듬은 디테일을 망가뜨리지 말 것

작업 전에는 npm run lint와 npm run build를 돌려 현재 상태를 확인해줘.
작업 후에도 반드시 npm run lint와 npm run build를 통과시켜줘.
```

## 13. 주의사항

### 13.1 기존 UI 디테일을 쉽게 되돌리지 말 것

이 프로젝트는 사용자가 여러 번 스크린샷을 보며 미세 조정했습니다.

특히 아래는 의도된 결과입니다.

- AI 학습 상단 카테고리 탭 제거
- Project Group 탐색 내부 필터 유지
- 그룹 선택 시 왼쪽 border 없음
- 그룹 선택 시 shadow 없음
- 폴더 아이콘 열림/닫힘 애니메이션 유지
- 스크롤 페이드 유지
- 즐겨찾기 별표는 버튼 박스 없이 아이콘만 표시
- 체크박스 radius 4px
- API 연동 버튼 hover 대비 유지

### 13.2 dist와 node_modules

현재 `frontend/dist`와 `frontend/node_modules`가 로컬에 존재합니다.

다른 컴퓨터로 zip을 옮길 때:

- 가장 확실한 방법은 전체 폴더를 그대로 압축
- 더 가볍게 옮기려면 `node_modules`와 `dist`는 제외 가능
- 제외했다면 새 컴퓨터에서 `npm install`과 `npm run build` 실행

### 13.3 현재 Git 상태

현재 루트는 Git repository가 아닌 상태로 보입니다. `git diff` 실행 시 `Not a git repository` 메시지가 나왔습니다.

오픈소스로 진행하려면 다음 단계에서 Git 초기화가 필요합니다.

```bash
git init
git add .
git commit -m "Initial ExplainCode frontend prototype"
```

단, `.DS_Store`, `node_modules`, `dist` 등은 `.gitignore` 처리하는 것이 좋습니다.

## 14. 추천 다음 작업 순서

1. Git repository 초기화
2. 루트 `.gitignore` 정리
3. `App.tsx` 컴포넌트 분리
4. mock data 분리
5. backend API 기술 스택 결정
6. DB schema 설계
7. 관리자 로그인/API 토큰 MVP 구현
8. episode ingest API 구현
9. frontend를 mock data에서 API 연동으로 전환
10. Codex Skill MVP 작성
11. Claude Code Plugin MVP 작성
12. Docker Compose 개발 환경 구성
13. Helm Chart 설계

## 15. 마지막 검증 상태

마지막으로 확인한 명령:

```bash
cd frontend
npm run lint
npm run build
```

둘 다 통과했습니다.

마지막 UI 검증:

- 상단 운영 옵션 팝오버 바깥 클릭 닫힘
- 커스텀 체크박스 동작
- Project Group 검색/필터/정렬
- Project Group 스크롤 페이드
- 에피소드 목록 스크롤 페이드
- 966px~761px 태블릿 구간 레이아웃
- 브랜드 아이콘 교체
- 로고 텍스트 폰트/weight 조정

## 16. 현재 사용자가 중요하게 여긴 기준

사용자는 단순히 “동작하는 UI”보다 “진짜 서비스 같은 UI”를 원했습니다.

반드시 기억할 것:

- AI가 만든 티가 나면 안 됨
- 너무 솔루션 SaaS처럼 보이면 안 됨
- 커뮤니티 감성이 있어야 함
- 카드가 너무 많거나 꽉 차 보이면 싫어함
- 미세한 spacing, hover, scroll fade, button state를 중요하게 봄
- 모바일/태블릿/노트북에서 깨지는지 반드시 확인해야 함

이 문서를 먼저 읽고 이어서 작업하면 현재 채팅 세션의 맥락을 대부분 복원할 수 있습니다.

## 17. 백엔드 1차 구현 상태

백엔드는 `backend/` 아래에 Node.js + Express + TypeScript + PostgreSQL 기반으로 구현했습니다.

로컬 개발 DB 기본값:

```text
PGHOST=localhost
PGPORT=5433
PGDATABASE=explain_code
PGUSER=postgres
```

주요 파일:

```text
backend/
  src/
    app.ts
    index.ts
    config.ts
    db/
      create-database.ts
      migrate.ts
      seed.ts
      pool.ts
    routes/
      auth.ts
      project-groups.ts
      posts.ts
      comments.ts
      search.ts
      notifications.ts
      api-tokens.ts
      ingest.ts
      integration-logs.ts
    services/
      comments.ts
      reactions.ts
  Dockerfile
```

실행 순서:

```bash
cd backend
npm install
npm run db:create
npm run db:migrate
npm run db:seed
npm run dev
```

기본 API:

```text
http://localhost:4000/api
```

시드 로그인:

```text
mirae.dev / explain-code-demo
```

현재 구현된 백엔드 기능:

- 회원가입/로그인/JWT 인증
- 프로젝트 그룹 CRUD 일부 및 즐겨찾기
- 학습 에피소드 목록/상세/수동 생성
- Q&A/커뮤니티 게시글 목록, 검색, 정렬, 페이지네이션, 작성/수정/삭제
- 댓글과 1단계 대댓글 작성/수정/삭제
- 게시글/학습 글 추천, 비추천
- 전역 검색
- 알림 목록과 모두 읽음 처리
- 관리자 API 토큰 발급/재발급/폐기
- Codex/Claude/API용 학습 에피소드 ingest API
- 연동 호출 로그 조회

검증된 명령:

```bash
cd backend
npm run check
npm run build
npm run db:create
npm run db:migrate
npm run db:seed
```

추가로 서버를 `http://localhost:4000`에서 띄운 뒤 로그인, 프로젝트 그룹 조회, Q&A 게시글 조회, 검색, 댓글 생성/삭제, API 토큰 생성, ingest API, 연동 로그 조회까지 스모크 테스트했습니다.
