# Explain Code

Explain Code는 Codex, Claude Code 같은 AI 코딩 도구가 만든 구현 흐름을 프로젝트별 학습 에피소드로 남기고, 팀이 Q&A와 커뮤니티 글로 함께 학습할 수 있도록 만든 웹 애플리케이션입니다.

AI가 코드를 작성하거나 수정한 뒤 "이번 변경 내용을 Explain Code에 정리해서 올려줘"라고 요청하면, Explain Code는 변경 흐름, 관련 파일, 중요한 코드 조각, 프레임워크/라이브러리 문법 설명을 한 편의 학습 글로 저장합니다.

## 주요 기능

### AI 학습

- 프로젝트 그룹별 학습 에피소드 관리
- Codex, Claude Code, API 호출을 통한 학습 에피소드 자동 등록
- 기존 프로젝트 그룹 조회 후 매칭되는 그룹에 에피소드 추가
- 매칭되는 그룹이 없으면 새 프로젝트 그룹 생성 후 에피소드 등록
- 에피소드 상세 페이지에서 구현 흐름, 변경 파일, 중요 코드, 문법 노트 표시
- 코드 블록 syntax highlighting 지원
- 조회수, 추천/비추천, 댓글, 대댓글 지원
- 최근 등록된 에피소드, 프로젝트 그룹, 호출 로그, 통계 표시

### Q&A

- 개발 범주별 카테고리 필터
- 제목, 내용, 태그 기준 검색
- 최신순, 이름순, 추천순, 댓글순, 조회순 정렬
- 페이지네이션
- 게시글 작성, 수정, 삭제
- 댓글과 대댓글 작성, 수정, 삭제
- 추천/비추천
- 해결됨 상태 표시

### 커뮤니티

- 전체, 사는 얘기, 회고, 스터디, 모각코, 프로젝트 카테고리
- 검색, 정렬, 페이지네이션
- 게시글 작성, 수정, 삭제
- 댓글과 대댓글
- 공유 URL 복사와 토스트 알림

### 검색

- 헤더 검색 버튼으로 열리는 전역 검색 다이얼로그
- 최근 검색어, 인기 검색어 표시
- 검색 후 AI 학습, Q&A, 커뮤니티 탭으로 결과 분리
- 결과 목록 영역 전용 스크롤

### 알림

- AI 학습 에피소드 등록 알림
- 내 글에 댓글이 달렸을 때 알림
- 조회수 마일스톤 알림
- 인기글 진입 알림
- API 토큰 만료 임박 알림
- 읽지 않은 알림 뱃지
- 모두 읽음 처리

### 인증과 권한

- 로그인, 회원가입
- 게스트 상태와 로그인 상태의 화면 분리
- 게스트는 글쓰기, 댓글, 추천/비추천, 알림, 스킬/토큰 메뉴 사용 제한
- 로그인 사용자는 API 토큰 발급 및 재발급 가능

### 스킬/토큰

- Codex skill 설치 안내
- Claude Code plugin 설치 안내
- Windows PowerShell, macOS/Linux 설치 명령 제공
- API URL, API token 설정 명령 제공
- AI 도구가 보낼 payload 예시 제공
- payload 예시 접기/펼치기
- API 토큰 발급, 재발급, 만료 정보 표시

### UI

- Pretendard 폰트 적용
- 라이트 모드, 다크 모드
- 반응형 헤더
- shadcn 스타일의 Dialog, Popover, Select UX
- Sonner 스타일 토스트
- footer 제공

## 기술 스택

### Frontend

- React
- TypeScript
- Vite
- React Router
- lucide-react
- react-syntax-highlighter
- sonner
- Nginx Docker runtime

### Backend

- Node.js
- TypeScript
- Express
- PostgreSQL
- pg
- zod
- bcryptjs
- jsonwebtoken
- helmet

### Deployment

- Docker
- Helm
- Kubernetes / k3s
- PostgreSQL StatefulSet 또는 외부 PostgreSQL
- Traefik Ingress
- cert-manager TLS

## 전체 구조

```text
explain-code
├─ frontend/                         # React + Vite frontend
├─ backend/                          # Node.js + Express backend
├─ deploy/helm/explain-code/         # Helm chart source
├─ charts/                           # Packaged Helm chart and index.yaml
├─ integrations/
│  ├─ codex-skill/                   # Codex skill
│  └─ claude-code-plugin/            # Claude Code plugin
├─ tools/explain-code-ingest/        # Shared publisher CLI
├─ scripts/                          # Windows/macOS/Linux installer scripts
└─ README.md
```

## 동작 방식

```text
Browser
  -> Frontend
  -> /api
  -> Backend
  -> PostgreSQL

Codex / Claude Code
  -> Explain Code skill/plugin
  -> /api/ingest/groups
  -> /api/ingest/episodes
  -> Backend
  -> PostgreSQL
```

일반 사용자는 웹에서 글을 보고 작성합니다.

AI 도구는 API 토큰으로 인증한 뒤 기존 프로젝트 그룹 목록을 조회하고, 현재 작업 중인 코드베이스와 가장 잘 맞는 그룹을 선택합니다. 맞는 그룹이 없으면 `projectName`을 포함해 새 그룹을 만들고, 그 아래에 학습 에피소드를 등록합니다.

## 로컬 개발 환경 실행

### 사전 준비

- Node.js 22 권장
- npm
- PostgreSQL

로컬 개발 기본값은 `backend/.env.example`에 들어 있습니다. PostgreSQL을 로컬에서 실행하는 경우 프로젝트에 맞게 값을 수정하세요.

### Backend 실행

```bash
cd backend
npm install
cp .env.example .env
```

`backend/.env` 예시:

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173

PGHOST=localhost
PGPORT=5433
PGDATABASE=explain_code
PGUSER=postgres
PGPASSWORD=your-postgres-password

JWT_SECRET=change-me-in-production
TOKEN_PEPPER=change-me-for-api-token-hashes
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=explain-code-demo
```

데이터베이스 생성과 마이그레이션:

```bash
npm run db:create
npm run db:migrate
```

개발용 목업 데이터가 필요하면 seed를 실행합니다.

```bash
npm run db:seed
```

seed는 개발/테스트용 데이터를 넣기 위한 명령입니다. 운영 데이터베이스에서는 의도하지 않았다면 실행하지 마세요.

Backend 개발 서버:

```bash
npm run dev
```

기본 API 주소:

```text
http://localhost:4000/api
```

상태 확인:

```bash
curl http://localhost:4000/api/health
```

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

기본 주소:

```text
http://localhost:5173
```

Frontend는 `frontend/public/runtime-config.js`의 값을 읽어 API 주소를 결정합니다.

```js
window.__EXPLAIN_CODE_CONFIG__ = {
  appEnv: "local",
  apiBaseUrl: "/api",
  authTokenStorageKey: "explain-code-auth-token",
  authStateStorageKey: "explain-code-logged-in",
};
```

로컬 개발에서는 `frontend/vite.config.ts`에 `/api -> http://localhost:4000` proxy가 설정되어 있습니다. Backend 포트를 바꾸면 이 proxy 또는 `runtime-config.js`의 `apiBaseUrl`도 함께 조정하세요.

## Docker 이미지 빌드

현재 Helm chart 기본값은 Docker Hub 이미지를 사용하고 `latest` 태그를 바라봅니다.

```bash
docker build -t docker.io/<dockerhub-user>/explain-code-frontend:latest ./frontend
docker build -t docker.io/<dockerhub-user>/explain-code-backend:latest ./backend

docker push docker.io/<dockerhub-user>/explain-code-frontend:latest
docker push docker.io/<dockerhub-user>/explain-code-backend:latest
```

기본 chart 값은 다음 이미지를 사용합니다.

```yaml
frontend:
  image:
    repository: docker.io/dy7314/explain-code-frontend
    tag: latest

backend:
  image:
    repository: docker.io/dy7314/explain-code-backend
    tag: latest
```

fork 또는 별도 Docker Hub 계정을 사용한다면 Helm 설치 시 이미지 repository를 override하세요.

```bash
--set frontend.image.repository=docker.io/<dockerhub-user>/explain-code-frontend \
--set backend.image.repository=docker.io/<dockerhub-user>/explain-code-backend
```

## Helm으로 k3s에 설치

### 사전 준비

- k3s 또는 Kubernetes cluster
- Helm
- Ingress controller
- TLS를 사용할 경우 cert-manager
- PostgreSQL은 chart 내부 StatefulSet을 사용하거나 외부 PostgreSQL로 연결 가능

현재 예시 values 파일은 Traefik Ingress와 cert-manager를 기준으로 작성되어 있습니다.

```text
deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml
```

### 설치 방식 1: Helm repo 등록 후 설치

```bash
helm repo add explain-code https://raw.githubusercontent.com/dong7314/explain-code/master/charts
helm repo update

helm upgrade --install explain-code explain-code/explain-code \
  -n explain-code \
  --create-namespace \
  -f https://raw.githubusercontent.com/dong7314/explain-code/master/deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml \
  --set global.publicHost=your-domain.example.com \
  --set backend.secret.JWT_SECRET="change-this-jwt-secret" \
  --set backend.secret.TOKEN_PEPPER="change-this-token-pepper" \
  --set postgres.auth.password="change-this-postgres-password"
```

### 설치 방식 2: chart package URL로 바로 설치

```bash
helm upgrade --install explain-code \
  https://raw.githubusercontent.com/dong7314/explain-code/master/charts/explain-code-0.1.0.tgz \
  -n explain-code \
  --create-namespace \
  -f https://raw.githubusercontent.com/dong7314/explain-code/master/deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml \
  --set global.publicHost=your-domain.example.com \
  --set backend.secret.JWT_SECRET="change-this-jwt-secret" \
  --set backend.secret.TOKEN_PEPPER="change-this-token-pepper" \
  --set postgres.auth.password="change-this-postgres-password"
```

### 실제 도메인 예시

아래 명령에서 `explain.ldy-studio.com`은 예시입니다. 본인의 도메인으로 바꾸면 됩니다.

```bash
helm upgrade --install explain-code explain-code/explain-code \
  -n explain-code \
  --create-namespace \
  -f https://raw.githubusercontent.com/dong7314/explain-code/master/deploy/helm/explain-code/examples/values-traefik-cert-manager.yaml \
  --set global.publicHost=explain.ldy-studio.com \
  --set backend.secret.JWT_SECRET="ldy-studio-explain-code-jwt" \
  --set backend.secret.TOKEN_PEPPER="ldy-studio-explain-code-token-pepper" \
  --set postgres.auth.password="change-this-postgres-password"
```

### `global.publicHost`가 하는 일

일반적인 같은 도메인 배포에서는 `global.publicHost`만 바꾸면 됩니다.

```yaml
global:
  publicHost: your-domain.example.com

frontend:
  config:
    apiBaseUrl: /api
```

chart는 이 값을 사용해 다음 설정을 자동으로 맞춥니다.

- Ingress host
- TLS host
- Backend CORS origin

Frontend는 `/api`를 호출하므로 브라우저에서는 아래 주소로 API를 호출합니다.

```text
https://your-domain.example.com/api
```

### Traefik + cert-manager 예시

```yaml
global:
  publicHost: explain.example.com

frontend:
  config:
    apiBaseUrl: /api

ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/redirect-entry-point: websecure
  tls:
    enabled: true
    secretName: explain-code-tls
```

### 주요 Helm 값

| 값 | 설명 |
| --- | --- |
| `global.publicHost` | 서비스에 연결할 공개 도메인 |
| `frontend.config.apiBaseUrl` | Frontend가 호출할 API base URL. 같은 도메인 배포는 `/api` 권장 |
| `backend.secret.JWT_SECRET` | 로그인 JWT 서명에 사용하는 secret |
| `backend.secret.TOKEN_PEPPER` | API token hash에 섞는 서버 secret |
| `postgres.auth.password` | chart 내부 PostgreSQL 비밀번호 |
| `migration.enabled` | 설치/업그레이드 후 DB migration Job 실행 여부 |
| `migration.seed` | 개발용 seed 데이터 삽입 여부. 기본값은 `false` |
| `backend.secret.SEED_ADMIN_PASSWORD` | seed 실행 시 생성되는 개발용 admin 계정 비밀번호 |

`TOKEN_PEPPER`는 API 토큰을 DB에 저장하기 전에 hash할 때 사용합니다. 이미 발급된 토큰이 있는 상태에서 이 값을 바꾸면 기존 API 토큰 검증이 실패할 수 있습니다.

`SEED_ADMIN_PASSWORD`는 seed를 실행할 때만 의미가 있습니다. 기본 seed admin username은 `admin`입니다. seed를 끄면 개발용 목업 데이터와 seed admin 계정이 생성되지 않습니다.

### 설치 확인

```bash
kubectl get pods -n explain-code
kubectl get svc -n explain-code
kubectl get ingress -n explain-code
```

API 상태 확인:

```bash
curl https://your-domain.example.com/api/health
```

Backend 로그 확인:

```bash
kubectl logs -n explain-code deploy/explain-code-backend
```

Migration Job 확인:

```bash
kubectl get jobs -n explain-code
kubectl logs -n explain-code job/explain-code-backend-migrate
```

릴리스 삭제:

```bash
helm uninstall explain-code -n explain-code
```

PVC까지 제거하려면 PostgreSQL 데이터를 삭제해도 되는지 확인한 뒤 직접 삭제하세요.

```bash
kubectl get pvc -n explain-code
kubectl delete pvc -n explain-code -l app.kubernetes.io/instance=explain-code
```

## Helm chart 업데이트와 배포

chart를 수정한 뒤에는 package와 index를 다시 생성해야 원격에서 설치할 수 있습니다.

```bash
helm lint deploy/helm/explain-code

helm package deploy/helm/explain-code -d charts

helm repo index charts \
  --url https://raw.githubusercontent.com/dong7314/explain-code/master/charts
```

그 다음 변경된 chart package와 `charts/index.yaml`을 commit/push합니다.

```bash
git add deploy/helm charts
git commit -m "Update explain-code helm chart"
git push origin master
```

## Codex, Claude Code 연결

### 1. API 토큰 발급

1. Explain Code에 로그인합니다.
2. `스킬/토큰` 메뉴로 이동합니다.
3. API 토큰을 발급합니다.
4. 발급된 `expc_live_...` 토큰을 복사합니다.

토큰은 발급 직후에만 전체 값을 확인할 수 있습니다. 이후에는 prefix만 표시됩니다.

### 2. 환경 변수 설정

배포 서버를 사용하는 경우 API URL은 본인의 도메인으로 지정합니다.

Windows PowerShell:

```powershell
$env:EXPLAIN_CODE_API_URL="https://your-domain.example.com/api"
$env:EXPLAIN_CODE_API_TOKEN="expc_live_..."
```

macOS/Linux:

```bash
export EXPLAIN_CODE_API_URL="https://your-domain.example.com/api"
export EXPLAIN_CODE_API_TOKEN="expc_live_..."
```

로컬 backend를 사용할 경우 API URL 기본값은 `http://localhost:4000/api`입니다.

```powershell
$env:EXPLAIN_CODE_API_URL="http://localhost:4000/api"
```

`EXPLAIN_CODE_GROUP_KEY`는 일반적으로 설정하지 않아도 됩니다. Codex와 Claude Code는 기존 그룹 목록을 조회하고, 현재 프로젝트에 맞는 그룹을 선택하거나 없으면 새 그룹을 만들도록 안내되어 있습니다.

특정 그룹을 반드시 강제하고 싶을 때만 아래 값을 사용하세요.

```bash
EXPLAIN_CODE_GROUP_KEY=coin-trade
```

### 3. 설치 스크립트 실행

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/dong7314/explain-code/master/scripts/install-explain-code.ps1 | iex
```

macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/dong7314/explain-code/master/scripts/install-explain-code.sh | bash
```

설치 스크립트는 다음 파일을 사용자 홈 디렉토리에 배치합니다.

```text
Codex skill:
  ~/.codex/skills/explain-code-learning

Shared publisher tool:
  ~/.explain-code/tools/explain-code-ingest

Claude Code plugin files:
  ~/.explain-code/integrations/claude-code-plugin
```

### 4. Codex에서 사용

설치 후 Codex를 재시작합니다.

그 다음 프로젝트 작업이 끝난 뒤 Codex에게 이렇게 요청합니다.

```text
explain-code-learning skill을 사용해서 현재 변경된 내용을 학습 에피소드로 올려줘.
```

Codex skill은 다음 흐름을 따릅니다.

1. 최근 코드 변경과 관련 파일을 확인합니다.
2. Explain Code의 기존 프로젝트 그룹을 조회합니다.
3. 맞는 그룹이 있으면 해당 그룹에 에피소드를 추가합니다.
4. 맞는 그룹이 없으면 현재 repo/package/directory를 기준으로 group key를 추론하고 새 그룹을 생성합니다.
5. 여러 중요 코드 조각과 설명을 포함한 payload를 만듭니다.
6. dry-run으로 검증합니다.
7. 사용자가 publish를 요청하면 backend로 전송합니다.

### 5. Claude Code에서 사용

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.explain-code\claude-explain-code.ps1"
```

macOS/Linux:

```bash
~/.explain-code/claude-explain-code
```

Claude Code 안에서 다음 명령을 실행합니다.

```text
/explain-code:publish-learning
```

Claude Code plugin도 Codex와 동일하게 기존 그룹 조회, 그룹 선택/생성, payload 생성, dry-run 검증, publish 흐름을 따릅니다.

## Ingest API

AI 도구와 외부 시스템은 Ingest API를 통해 학습 에피소드를 등록할 수 있습니다.

### 그룹 목록 조회

```http
GET /api/ingest/groups
x-api-token: expc_live_...
```

응답은 기존 프로젝트 그룹 목록을 반환합니다. AI 도구는 이 목록을 보고 현재 프로젝트와 맞는 그룹을 선택합니다.

### 에피소드 등록

```http
POST /api/ingest/episodes
x-api-token: expc_live_...
content-type: application/json
```

최소 payload:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "주문 폼 상태를 커스텀 훅으로 분리한 이유",
  "summary": "입력값, 검증 상태, 제출 흐름을 useOrderForm 훅으로 묶은 과정을 정리했습니다.",
  "createdBy": "codex"
}
```

권장 payload:

```json
{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "주문 폼 상태를 커스텀 훅으로 분리한 이유",
  "summary": "입력값, 검증 상태, 제출 흐름을 useOrderForm 훅으로 묶은 과정을 정리했습니다.",
  "overview": "이번 변경은 주문 폼 컴포넌트에 흩어진 상태와 검증 로직을 하나의 훅으로 이동해 화면 렌더링과 비즈니스 흐름을 분리한 작업입니다.",
  "frameworks": ["React", "TanStack Query"],
  "concepts": ["useState", "custom hook", "controlled input"],
  "flow": [
    "입력 상태와 검증 상태를 훅으로 분리",
    "submit 가능 여부를 훅에서 계산",
    "화면 컴포넌트는 렌더링에 집중"
  ],
  "files": [
    {
      "path": "frontend/src/features/order/useOrderForm.ts",
      "summary": "주문 폼 상태와 검증 메시지를 관리합니다.",
      "changeType": "modified"
    }
  ],
  "codeSnippets": [
    {
      "title": "useOrderForm 훅",
      "language": "ts",
      "description": "컴포넌트 밖에서 입력 상태와 제출 가능 여부를 계산합니다.",
      "code": "export const useOrderForm = () => { const [symbol, setSymbol] = useState('BTC'); return { symbol, setSymbol }; };"
    }
  ],
  "syntaxNotes": [
    {
      "name": "custom hook",
      "description": "React 컴포넌트에서 반복되는 상태와 이벤트 흐름을 함수로 분리해 재사용하는 패턴입니다.",
      "example": "const form = useOrderForm();"
    }
  ],
  "createdBy": "codex"
}
```

`projectName`은 새 그룹을 만들 때 필요합니다. 이미 존재하는 그룹에 등록하는 경우에는 `groupKey`만으로도 충분합니다.

## Shared publisher tool

설치 스크립트가 배치하는 publisher CLI는 직접 사용할 수도 있습니다.

그룹 목록 조회:

```bash
node ~/.explain-code/tools/explain-code-ingest/publish.mjs --list-groups
```

payload 검증:

```bash
node ~/.explain-code/tools/explain-code-ingest/publish.mjs payload.json --dry-run
```

publish:

```bash
node ~/.explain-code/tools/explain-code-ingest/publish.mjs payload.json
```

표준 입력으로 전달:

```bash
cat payload.json | node ~/.explain-code/tools/explain-code-ingest/publish.mjs --stdin
```

## 운영 시 주의할 점

- `JWT_SECRET`, `TOKEN_PEPPER`, PostgreSQL password는 반드시 안전한 값으로 변경하세요.
- `TOKEN_PEPPER`를 바꾸면 기존 API token이 더 이상 검증되지 않을 수 있습니다.
- 운영 환경에서는 `migration.seed=false`를 유지하는 것을 권장합니다.
- seed는 개발 데모 데이터를 만들기 위한 기능입니다.
- API token은 AI 도구에 전달되므로 로그나 학습 payload에 노출하지 마세요.
- Docker image를 운영에 배포할 때는 가능하면 immutable tag 사용을 권장하지만, 현재 chart 기본값은 `latest`입니다.
- Frontend의 API 주소는 build time이 아니라 `runtime-config.js`로 주입됩니다. Kubernetes에서는 ConfigMap으로 이 파일을 바꿉니다.

## 문제 해결

### `Error: repo explain-code not found`

Helm repo를 먼저 등록하지 않은 상태에서 `explain-code/explain-code`를 설치하려고 하면 발생합니다.

```bash
helm repo add explain-code https://raw.githubusercontent.com/dong7314/explain-code/master/charts
helm repo update
```

또는 repo 등록 없이 chart package URL을 직접 사용하세요.

```bash
helm upgrade --install explain-code \
  https://raw.githubusercontent.com/dong7314/explain-code/master/charts/explain-code-0.1.0.tgz \
  -n explain-code \
  --create-namespace
```

### 설치 스크립트가 404를 반환하는 경우

branch 또는 파일 경로가 맞는지 확인하세요.

```powershell
irm https://raw.githubusercontent.com/dong7314/explain-code/master/scripts/install-explain-code.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/dong7314/explain-code/master/scripts/install-explain-code.sh | bash
```

GitHub 기본 branch가 `master`가 아니라면 URL의 `master` 부분을 실제 branch 이름으로 바꿔야 합니다.

### AI 도구가 API token 오류를 반환하는 경우

다음을 확인하세요.

- `EXPLAIN_CODE_API_TOKEN`이 현재 shell/session에 설정되어 있는지
- token이 `expc_live_...` 전체 값인지
- token이 만료되거나 revoke되지 않았는지
- `EXPLAIN_CODE_API_URL`이 `/api`까지 포함하는지
- `TOKEN_PEPPER`가 token 발급 이후 변경되지 않았는지

### Frontend는 뜨지만 데이터가 보이지 않는 경우

- Backend가 실행 중인지 확인합니다.
- `https://your-domain.example.com/api/health`가 응답하는지 확인합니다.
- Ingress의 `/api` path가 backend service로 연결되어 있는지 확인합니다.
- Frontend `runtime-config.js`의 `apiBaseUrl`이 올바른지 확인합니다.

## 라이선스

Open Source.
