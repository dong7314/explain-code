import { config } from "../config.js";
import { hashPassword } from "../security.js";
import { pool, withTransaction } from "./pool.js";

type SeedUser = {
  displayName?: string;
  role?: "admin" | "member";
  username: string;
};

type SeedGroup = {
  explainTarget: string;
  frameworks: string[];
  goal: string;
  id: string;
  name: string;
  owner: string;
  project: string;
};

type SeedEpisode = {
  comments: number;
  concepts: string[];
  dislikes: number;
  flow: string[];
  groupId: string;
  id: string;
  likes: number;
  summary: string;
  title: string;
  views: number;
};

type SeedPost = {
  author: string;
  board: string;
  category: string;
  comments: number;
  dislikes: number;
  excerpt: string;
  id: number;
  likes: number;
  page: "community" | "qa";
  repo: string;
  solved?: boolean;
  tags: string[];
  title: string;
  views: number;
};

const users: SeedUser[] = [
  { username: config.seedAdminUsername, displayName: "mirae.dev", role: "admin" },
  { username: "server-sideup" },
  { username: "ng2react" },
  { username: "pipeline-lab" },
  { username: "search-tuner" },
  { username: "yuna.log" },
  { username: "hook-reader" },
  { username: "oss-maker" },
  { username: "reader.log" },
  { username: "chart-lab" },
];

const groups: SeedGroup[] = [
  {
    id: "coin-trade",
    name: "coin-trade",
    project: "실시간 코인 거래 대시보드",
    goal: "주문 폼, 체결 내역, 토큰 인증 흐름을 React와 NestJS 기준으로 설명합니다.",
    explainTarget: "프론트엔드 훅과 API 호출 흐름",
    frameworks: ["React", "TanStack Query", "NestJS"],
    owner: "mirae.dev",
  },
  {
    id: "legacy-angular-web",
    name: "legacy-angular-web",
    project: "Angular 화면을 React 기반으로 전환하는 마이그레이션",
    goal: "Observable 중심 로직이 React Query와 훅 구조로 바뀌는 이유를 초보자도 따라가게 합니다.",
    explainTarget: "프레임워크 전환 문법과 상태 관리",
    frameworks: ["Angular", "React", "React Query"],
    owner: "ng2react",
  },
  {
    id: "study-note-api",
    name: "study-note-api",
    project: "학습 글 자동 등록 API",
    goal: "스킬과 플러그인이 보내는 JSON payload를 검증하고 그룹별 에피소드로 저장합니다.",
    explainTarget: "API 스키마, 권한 검증, 저장 흐름",
    frameworks: ["FastAPI", "PostgreSQL", "Redis"],
    owner: "server-sideup",
  },
  {
    id: "ai-review-board",
    name: "ai-review-board",
    project: "AI 코드 리뷰 게시판",
    goal: "AI가 남긴 리뷰 코멘트를 게시글, 댓글, 상태 변경 흐름으로 연결해 설명합니다.",
    explainTarget: "게시판 상태, 댓글 등록, 리뷰 상태 흐름",
    frameworks: ["Next.js", "React", "Prisma"],
    owner: "mirae.dev",
  },
  {
    id: "onboarding-playbook",
    name: "onboarding-playbook",
    project: "신규 개발자 온보딩 플레이북",
    goal: "AI가 생성한 학습 글을 팀 온보딩 문서와 체크리스트로 연결하는 방법을 설명합니다.",
    explainTarget: "문서 구조, 체크리스트 저장, 진행률 계산",
    frameworks: ["React", "Supabase", "Edge Functions"],
    owner: "mirae.dev",
  },
  {
    id: "token-vault-admin",
    name: "token-vault-admin",
    project: "관리자 토큰 발급 콘솔",
    goal: "API 토큰 생성, 만료, 권한 범위를 관리자 화면에서 다루는 흐름을 설명합니다.",
    explainTarget: "토큰 발급 UI, 권한 스코프, 만료 처리",
    frameworks: ["React", "NestJS", "PostgreSQL"],
    owner: "mirae.dev",
  },
  {
    id: "chart-render-lab",
    name: "chart-render-lab",
    project: "거래 차트 렌더링 실험실",
    goal: "캔들 차트와 실시간 가격 표시를 가볍게 렌더링하는 실험 과정을 설명합니다.",
    explainTarget: "차트 렌더링, 메모이제이션, 실시간 데이터 반영",
    frameworks: ["React", "Canvas", "WebSocket"],
    owner: "chart-lab",
  },
];

const episodes: SeedEpisode[] = [
  {
    groupId: "coin-trade",
    id: "coin-1",
    title: "1편. 주문 폼 상태를 커스텀 훅으로 분리한 이유",
    summary:
      "AI가 useState로 흩어진 입력값, 검증 상태, 제출 상태를 useOrderForm 훅으로 묶은 과정을 설명합니다.",
    flow: ["입력 필드 상태 수집", "검증 메시지 분리", "submit mutation 연결"],
    concepts: ["useState", "custom hook", "controlled input"],
    likes: 31,
    dislikes: 2,
    comments: 5,
    views: 301,
  },
  {
    groupId: "coin-trade",
    id: "coin-2",
    title: "2편. useMutation으로 주문 요청과 실패 처리를 나누기",
    summary:
      "주문 API 호출, 로딩 상태, 실패 토스트, 캐시 갱신을 mutation 흐름으로 읽을 수 있게 정리했습니다.",
    flow: ["mutation 함수 정의", "onSuccess 캐시 갱신", "onError 메시지 매핑"],
    concepts: ["useMutation", "query invalidation", "error boundary"],
    likes: 24,
    dislikes: 1,
    comments: 3,
    views: 244,
  },
  {
    groupId: "coin-trade",
    id: "coin-3",
    title: "3편. TokenGuard가 관리자 토큰을 검증하는 순서",
    summary:
      "백엔드에서 API 토큰을 읽고 만료, 권한, 레포 그룹 접근 가능 여부를 검증하는 흐름을 다룹니다.",
    flow: ["Authorization 헤더 파싱", "토큰 만료 확인", "레포 그룹 권한 확인"],
    concepts: ["Guard", "JWT", "RBAC"],
    likes: 18,
    dislikes: 0,
    comments: 2,
    views: 190,
  },
  {
    groupId: "legacy-angular-web",
    id: "legacy-1",
    title: "1편. Angular Service 로직을 query 함수로 옮기기",
    summary:
      "service 메서드, subscribe 흐름, 컴포넌트 의존성을 query 함수와 hook으로 치환한 과정을 설명합니다.",
    flow: ["service 의존성 찾기", "query key 설계", "컴포넌트에서 hook 호출"],
    concepts: ["Observable", "query key", "data fetching"],
    likes: 42,
    dislikes: 3,
    comments: 8,
    views: 412,
  },
  {
    groupId: "legacy-angular-web",
    id: "legacy-2",
    title: "2편. ngIf 조건부 렌더링을 React JSX로 읽기",
    summary:
      "템플릿 문법이 JSX 조건식으로 바뀔 때 초보자가 헷갈리는 boolean 처리와 fallback UI를 정리했습니다.",
    flow: ["템플릿 조건 찾기", "JSX 조건식 변환", "빈 상태 컴포넌트 분리"],
    concepts: ["ngIf", "conditional rendering", "component boundary"],
    likes: 27,
    dislikes: 1,
    comments: 4,
    views: 236,
  },
  {
    groupId: "study-note-api",
    id: "api-1",
    title: "1편. 스킬 payload를 학습 에피소드로 저장하는 순서",
    summary:
      "repoKey, diffSummary, concepts 필드를 검증하고 같은 그룹 아래 새 에피소드로 쌓는 흐름입니다.",
    flow: ["payload schema 검증", "repo group 조회", "episode insert"],
    concepts: ["schema validation", "repository group", "transaction"],
    likes: 19,
    dislikes: 0,
    comments: 3,
    views: 164,
  },
  {
    groupId: "ai-review-board",
    id: "review-1",
    title: "1편. 리뷰 코멘트를 게시글 카드로 묶는 방법",
    summary:
      "AI 리뷰 결과를 게시글 목록에서 읽기 좋은 단위로 묶고 상태별 배지를 붙인 과정을 설명합니다.",
    flow: ["리뷰 payload 정리", "카드 컴포넌트 분리", "상태 배지 렌더링"],
    concepts: ["component composition", "status badge", "server data"],
    likes: 14,
    dislikes: 0,
    comments: 2,
    views: 148,
  },
  {
    groupId: "ai-review-board",
    id: "review-2",
    title: "2편. 댓글 작성 후 목록을 다시 불러오지 않는 이유",
    summary:
      "댓글 optimistic update를 적용해 사용자가 즉시 반응을 확인할 수 있도록 만든 흐름입니다.",
    flow: ["댓글 draft 검증", "optimistic item 추가", "실패 시 rollback"],
    concepts: ["optimistic update", "mutation", "rollback"],
    likes: 11,
    dislikes: 1,
    comments: 3,
    views: 121,
  },
  {
    groupId: "onboarding-playbook",
    id: "onboarding-1",
    title: "1편. 학습 에피소드를 온보딩 체크리스트로 바꾸기",
    summary:
      "AI 학습 글의 핵심 개념을 체크리스트 항목으로 변환하고 진행 상태를 저장하는 흐름입니다.",
    flow: ["에피소드 개념 추출", "체크리스트 항목 생성", "완료 상태 저장"],
    concepts: ["checklist state", "progress", "Supabase row"],
    likes: 17,
    dislikes: 0,
    comments: 4,
    views: 182,
  },
  {
    groupId: "token-vault-admin",
    id: "vault-1",
    title: "1편. 토큰 권한 스코프를 UI에서 선택하게 만들기",
    summary:
      "관리자가 read/write 권한을 고르고 만료일을 지정하는 폼 구조를 설명합니다.",
    flow: ["스코프 옵션 정의", "만료일 입력 검증", "토큰 생성 API 호출"],
    concepts: ["scope", "form validation", "token lifecycle"],
    likes: 21,
    dislikes: 1,
    comments: 5,
    views: 230,
  },
  {
    groupId: "token-vault-admin",
    id: "vault-2",
    title: "2편. 만료된 토큰을 안전하게 비활성화하기",
    summary:
      "만료된 토큰을 목록에서 구분하고 재발급 버튼으로 이어지는 관리자 UX를 정리합니다.",
    flow: ["만료 상태 계산", "목록 상태 배지 표시", "재발급 mutation 연결"],
    concepts: ["expiration", "admin UX", "mutation"],
    likes: 18,
    dislikes: 0,
    comments: 3,
    views: 199,
  },
  {
    groupId: "chart-render-lab",
    id: "chart-1",
    title: "1편. 캔들 데이터를 화면 좌표로 바꾸는 순서",
    summary:
      "가격과 시간 데이터를 캔버스 좌표로 매핑하고 리렌더링 범위를 줄이는 과정을 설명합니다.",
    flow: ["가격 범위 계산", "시간 축 매핑", "캔들 draw 함수 분리"],
    concepts: ["canvas", "coordinate mapping", "render loop"],
    likes: 13,
    dislikes: 0,
    comments: 2,
    views: 144,
  },
];

const posts: SeedPost[] = [
  {
    id: 101,
    page: "qa",
    board: "Q&A 프론트엔드",
    category: "프론트엔드",
    title:
      "useEffect 대신 useMemo로 바꾼 이유를 학습 글에 어떻게 설명하면 좋을까요?",
    excerpt:
      "Codex가 주문 요약 계산을 useMemo로 분리했는데, 의존성 배열과 렌더링 비용 관점에서 초보자에게 설명하는 흐름이 궁금합니다.",
    author: "mirae.dev",
    repo: "coin-trade",
    comments: 8,
    likes: 14,
    dislikes: 1,
    views: 132,
    tags: ["React", "Hook", "학습글"],
  },
  {
    id: 102,
    page: "qa",
    board: "Q&A 백엔드",
    category: "백엔드",
    title: "NestJS Guard에서 토큰 검증 실패 케이스를 어디까지 보여줘야 할까요?",
    excerpt:
      "관리자 API 토큰이 만료되었을 때 401과 403을 구분해서 학습 자료에 남기려는데, 보안상 마스킹 기준도 같이 고민 중입니다.",
    author: "server-sideup",
    repo: "study-note-api",
    comments: 5,
    likes: 9,
    dislikes: 0,
    views: 88,
    tags: ["NestJS", "Auth", "Token"],
    solved: true,
  },
  {
    id: 103,
    page: "qa",
    board: "Q&A 프론트엔드",
    category: "프론트엔드",
    title: "Angular 서비스 로직을 React Query로 옮긴 플로우 설명이 어색합니다",
    excerpt:
      "기존 Observable 중심 코드를 mutation/query로 나누는 부분에서 용어가 튀는데, 전환 학습 글 템플릿을 어떻게 잡으면 좋을까요?",
    author: "ng2react",
    repo: "legacy-angular-web",
    comments: 11,
    likes: 21,
    dislikes: 2,
    views: 240,
    tags: ["Angular", "React Query", "Migration"],
  },
  {
    id: 104,
    page: "qa",
    board: "Q&A 백엔드",
    category: "백엔드",
    title: "FastAPI ingest payload 검증은 라우터와 서비스 중 어디에 두는 게 좋을까요?",
    excerpt:
      "스킬이 보내는 JSON payload를 검증하고 저장하는 흐름에서 라우터, 서비스, 스키마 계층의 책임을 어떻게 나누면 좋을지 고민 중입니다.",
    author: "server-sideup",
    repo: "study-note-api",
    comments: 6,
    likes: 12,
    dislikes: 0,
    views: 146,
    tags: ["FastAPI", "Schema", "Validation"],
  },
  {
    id: 105,
    page: "qa",
    board: "Q&A 데브옵스",
    category: "데브옵스",
    title: "GitHub Actions에서 학습 글 자동 등록 실패 로그를 어디까지 남겨야 할까요?",
    excerpt:
      "배포 파이프라인에서 Codex 스킬 호출이 실패했을 때 재시도, 토큰 마스킹, 알림 기준을 어떻게 나누면 좋을지 고민 중입니다.",
    author: "pipeline-lab",
    repo: "token-vault-admin",
    comments: 4,
    likes: 16,
    dislikes: 1,
    views: 178,
    tags: ["GitHub Actions", "CI", "Logging"],
  },
  {
    id: 106,
    page: "qa",
    board: "Q&A 데이터/AI",
    category: "데이터/AI",
    title: "AI가 요약한 코드 설명을 검색 인덱스에 넣을 때 원문도 같이 저장해야 할까요?",
    excerpt:
      "학습 에피소드 검색 품질을 높이기 위해 요약문, 원문 코드 흐름, 태그를 어떤 비중으로 인덱싱할지 정리하고 있습니다.",
    author: "search-tuner",
    repo: "ai-review-board",
    comments: 13,
    likes: 24,
    dislikes: 2,
    views: 286,
    tags: ["검색", "Embedding", "AI"],
  },
  {
    id: 201,
    page: "community",
    board: "커뮤니티 회고",
    category: "회고",
    title: "바이브 코딩 후 팀원이 진짜 이해했는지 확인하는 체크리스트를 만들었습니다",
    excerpt:
      "PR 설명만으로 부족해서 “변경 이유, 중요 코드, 문법 설명” 3단계로 학습 로그를 남겼더니 온보딩 속도가 좋아졌습니다.",
    author: "yuna.log",
    repo: "team-board",
    comments: 17,
    likes: 45,
    dislikes: 3,
    views: 510,
    tags: ["회고", "온보딩", "팀문화"],
  },
  {
    id: 202,
    page: "community",
    board: "커뮤니티 스터디",
    category: "스터디",
    title: "이번 주 모각코: Claude Code가 만든 React 컴포넌트 함께 해부하기",
    excerpt:
      "컴포넌트 분리 기준, 상태 위치, 커스텀 훅 네이밍까지 서로의 학습 글을 리뷰하는 작은 모임을 열어봅니다.",
    author: "hook-reader",
    repo: "open-study",
    comments: 9,
    likes: 18,
    dislikes: 1,
    views: 220,
    tags: ["스터디", "React", "모각코"],
  },
  {
    id: 203,
    page: "community",
    board: "커뮤니티 프로젝트",
    category: "프로젝트",
    title: "레포 그룹 단위로 학습 자료가 쌓이는 UX, 어떤 정보가 먼저 보여야 할까요?",
    excerpt:
      "대시보드보다 게시글 피드에 가까운 접근이 더 자연스러운지 의견을 듣고 싶습니다. 관리자 토큰 UI도 같이 고민 중입니다.",
    author: "oss-maker",
    repo: "explain-code",
    comments: 24,
    likes: 37,
    dislikes: 4,
    views: 430,
    tags: ["UX", "오픈소스", "피드백"],
  },
];

const popularNotifications = [
  ["AI 학습", "AI가 만든 코드, 어디까지 내 코드라고 할 수 있을까요?", "/learning/ai-review-board/review-1"],
  ["Q&A", "useEffect 의존성 배열을 설명하는 가장 쉬운 방법", "/qa/101"],
  ["AI 학습", "Codex 스킬 payload 예시 공유합니다", "/learning/study-note-api/api-1"],
  ["커뮤니티", "레포 단위 학습 그룹 UX 피드백 부탁드립니다", "/community/203"],
];

const run = async () => {
  const passwordHash = await hashPassword(config.seedAdminPassword);

  await withTransaction(async (client) => {
    await client.query(`
      TRUNCATE
        integration_logs,
        notifications,
        comments,
        reactions,
        content_views,
        project_group_favorites,
        api_tokens,
        posts,
        episodes,
        project_groups,
        users
      RESTART IDENTITY CASCADE
    `);

    const userIds = new Map<string, string>();

    for (const user of users) {
      const result = await client.query<{ id: string }>(
        `
          INSERT INTO users (username, password_hash, display_name, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `,
        [
          user.username,
          passwordHash,
          user.displayName ?? user.username,
          user.role ?? "member",
        ],
      );

      userIds.set(user.username, result.rows[0].id);
    }

    for (const group of groups) {
      await client.query(
        `
          INSERT INTO project_groups (
            id,
            name,
            project,
            goal,
            explain_target,
            frameworks,
            owner_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          group.id,
          group.name,
          group.project,
          group.goal,
          group.explainTarget,
          group.frameworks,
          userIds.get(group.owner),
        ],
      );
    }

    for (const episode of episodes) {
      await client.query(
        `
          INSERT INTO episodes (
            id,
            group_id,
            title,
            summary,
            flow,
            concepts,
            body,
            created_by,
            likes_count,
            dislikes_count,
            comments_count,
            views_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          episode.id,
          episode.groupId,
          episode.title,
          episode.summary,
          episode.flow,
          episode.concepts,
          {
            overview:
              "이번 에피소드는 AI가 변경한 코드의 의도와 흐름을 먼저 잡고, 중요한 코드 조각과 사용된 문법을 이어서 확인하도록 구성했습니다.",
            diffSummary:
              "흩어진 구현 단위를 학습하기 쉬운 순서로 묶고, 다음에 같은 작업을 재현할 수 있도록 핵심 개념을 정리했습니다.",
            files: [
              {
                path: `${episode.groupId}/src/example.ts`,
                summary: "에피소드에서 설명하는 핵심 흐름이 담긴 예시 파일입니다.",
                changeType: "modified",
              },
            ],
            codeSnippets: [
              {
                title: "학습 에피소드 등록 payload",
                language: "ts",
                description:
                  "AI 도구가 같은 그룹 아래에 이번 작업의 학습 자료를 누적하는 호출 예시입니다.",
                code: `const result = await explainCode.createEpisode({\n  groupKey: "${episode.groupId}",\n  title: "${episode.title}",\n  concepts: ${JSON.stringify(episode.concepts)},\n});`,
              },
              {
                title: "상세 페이지에서 에피소드 찾기",
                language: "tsx",
                description:
                  "프론트는 선택된 그룹과 에피소드 id를 기준으로 저장된 학습 문서를 찾아 렌더링합니다.",
                code: `const group = groups.find((item) => item.id === "${episode.groupId}");\nconst episode = group?.episodes.find((item) => item.id === "${episode.id}");`,
              },
            ],
            syntaxNotes: [
              ...episode.concepts.map((concept) => ({
                name: concept,
                description:
                  "이번 변경에서 코드의 책임을 나누거나 흐름을 이해할 때 기준점이 되는 개념입니다.",
              })),
              {
                name: "codeSnippets",
                description:
                  "중요한 코드 조각을 여러 개 전달하면 상세 페이지에서 각각 코드와 설명을 묶어 보여줍니다.",
              },
              {
                name: "syntaxNotes",
                description:
                  "프레임워크, 라이브러리, 문법 포인트를 코드와 분리해 설명하는 문서 필드입니다.",
              },
            ],
          },
          userIds.get(groups.find((group) => group.id === episode.groupId)?.owner ?? "mirae.dev"),
          episode.likes,
          episode.dislikes,
          episode.comments,
          episode.views,
        ],
      );
    }

    for (const post of posts) {
      await client.query(
        `
          INSERT INTO posts (
            id,
            page,
            board,
            category,
            title,
            excerpt,
            body,
            author_id,
            repo,
            tags,
            solved,
            likes_count,
            dislikes_count,
            comments_count,
            views_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
        [
          post.id,
          post.page,
          post.board,
          post.category,
          post.title,
          post.excerpt,
          `${post.excerpt}\n\n이 글은 프로젝트 문맥을 기준으로 코드 변경의 의도와 학습 포인트를 함께 확인하기 위해 작성되었습니다.`,
          userIds.get(post.author),
          post.repo,
          post.tags,
          post.solved ?? false,
          post.likes,
          post.dislikes,
          post.comments,
          post.views,
        ],
      );
    }

    await client.query("SELECT setval('posts_id_seq', (SELECT max(id) FROM posts))");

    for (const groupId of [
      "coin-trade",
      "study-note-api",
      "legacy-angular-web",
      "ai-review-board",
      "token-vault-admin",
    ]) {
      await client.query(
        `
          INSERT INTO project_group_favorites (user_id, group_id)
          VALUES ($1, $2)
        `,
        [userIds.get("mirae.dev"), groupId],
      );
    }

    await client.query(
      `
        INSERT INTO comments (resource_type, post_id, author_id, body)
        VALUES
          ('post', 101, $1, '핵심 흐름이 먼저 나오니까 훨씬 따라가기 쉽네요.'),
          ('post', 101, $2, '초보자용 용어 설명도 한 줄 더 있으면 좋겠습니다.')
      `,
      [userIds.get("mirae.dev"), userIds.get("reader.log")],
    );

    await client.query(
      `
        INSERT INTO comments (resource_type, post_id, parent_id, author_id, body)
        SELECT 'post', 101, id, $1, '저도 이 흐름 덕분에 훅 분리 기준이 더 잘 보였어요.'
        FROM comments
        WHERE post_id = 101 AND parent_id IS NULL
        ORDER BY id
        LIMIT 1
      `,
      [userIds.get("reader.log")],
    );

    await client.query(
      `
        INSERT INTO comments (resource_type, group_id, episode_id, author_id, body)
        VALUES
          ('episode', 'coin-trade', 'coin-1', $1, '막혔던 부분이나 추가 설명이 필요한 개념을 남길 수 있습니다.'),
          ('episode', 'coin-trade', 'coin-1', $2, '조사한 용어 설명도 한 줄 더 있으면 좋겠습니다.')
      `,
      [userIds.get("mirae.dev"), userIds.get("reader.log")],
    );

    for (const [index, item] of popularNotifications.entries()) {
      const [_kind, title, href] = item;
      await client.query(
        `
          INSERT INTO notifications (user_id, kind, title, description, href)
          VALUES ($1, 'popular', '오늘의 인기글에 올랐어요', $2, $3)
        `,
        [
          userIds.get("mirae.dev"),
          `"${title}" 글이 오늘의 인기글 ${index + 1}위에 올랐습니다.`,
          href,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO notifications (user_id, kind, title, description, href)
        VALUES
          ($1, 'learning', 'AI가 학습 글을 등록했어요', 'coin-trade 그룹에 새 학습 에피소드가 등록되었습니다.', '/learning/coin-trade/coin-1'),
          ($1, 'comment', '내 게시글에 댓글이 달렸어요', '내 Q&A 글에 새 댓글이 달렸습니다.', '/qa/101'),
          ($1, 'milestone', '조회수 마일스톤을 달성했어요', '커뮤니티 글 조회수가 500회를 넘었습니다.', '/community/201'),
          ($1, 'token', 'API 토큰 만료 알림', 'API 토큰 만료까지 7일 남았습니다.', '/integrations')
      `,
      [userIds.get("mirae.dev")],
    );
  });

  console.log(
    `Database seed completed. Demo login: ${config.seedAdminUsername} / ${config.seedAdminPassword}`,
  );
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
