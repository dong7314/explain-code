import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BadgeHelp,
  Bell,
  BookMarked,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  Eye,
  FileText,
  Flame,
  Folder,
  FolderOpen,
  GitBranch,
  Hash,
  KeyRound,
  ListFilter,
  LogIn,
  Mail,
  MessageSquare,
  Moon,
  NotebookTabs,
  Plug,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SquarePen,
  Star,
  Sun,
  TerminalSquare,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  createApiToken,
  createEpisodeComment,
  createPost,
  createPostComment,
  deleteComment as deleteCommentRequest,
  deletePost as deletePostRequest,
  getApiTokens,
  getEpisodeComments,
  getIntegrationLogs,
  getMe,
  getNotifications,
  getPost,
  getPostComments,
  getPosts,
  getProjectGroups,
  login,
  markNotificationRead,
  markNotificationsRead,
  reissueApiToken,
  searchAll,
  setEpisodeReaction,
  setPostReaction,
  signup,
  updateComment as updateCommentRequest,
  updatePost as updatePostRequest,
  type ApiEpisodeBody,
  type ApiIntegrationLog,
  type ApiIntegrationStats,
  type ApiTokenItem,
} from "./api/explainCode";
import { runtimeConfig } from "./config/runtime";
import "./App.css";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);

type PageKey = "learning" | "qa" | "community" | "integrations";
type BoardPageKey = "qa" | "community";
type Connector = "codex" | "claude";
type GlobalSearchTab = "community" | "learning" | "qa";
type SearchField = "all" | "content" | "tag" | "title";
type SortKey = "comments" | "name" | "recent" | "recommend" | "views";
type ThemeMode = "dark" | "light";
type UserReaction = "dislike" | "like" | null;
type NotificationKind =
  | "comment"
  | "learning"
  | "milestone"
  | "popular"
  | "token";
type DetailView =
  | { type: "episode"; groupId: string; episodeId: string }
  | { type: "edit-post"; postId: number }
  | { type: "post"; postId: number }
  | { type: "write"; page: "qa" | "community" };

type Post = {
  id: number;
  page: "qa" | "community";
  board: string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  repo: string;
  time: string;
  comments: number;
  likes: number;
  dislikes: number;
  views: number;
  tags: string[];
  viewerReaction?: UserReaction;
  solved?: boolean;
};

type LearningGroup = {
  id: string;
  name: string;
  project: string;
  goal: string;
  explainTarget: string;
  framework: string;
  owner: string;
  episodes: Episode[];
};

type Episode = {
  body?: ApiEpisodeBody;
  id: string;
  title: string;
  summary: string;
  flow: string[];
  concepts: string[];
  time: string;
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
  viewerReaction?: UserReaction;
};

type CommentItem = {
  id: number;
  author: string;
  body: string;
  owned: boolean;
  time: string;
};

type ThreadCommentItem = CommentItem & {
  replies: CommentItem[];
};

type FeedbackTarget =
  | { postId: number; type: "post" }
  | { episodeId: string; groupId: string; type: "episode" };

type ReactionCounts = {
  dislikes: number;
  likes: number;
};

type ConfirmDialogState = {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
};

type NotificationItem = {
  description: string;
  href: string;
  id: string;
  kind: NotificationKind;
  time: string;
  title: string;
};

type GlobalSearchResult = {
  description: string;
  href: string;
  id: string;
  meta: string;
  tab: GlobalSearchTab;
  tags: string[];
  title: string;
};

type PopularPost = {
  comments?: number;
  kind: string;
  likes?: number;
  score?: number;
  title: string;
  to: string;
  views?: number;
};

type BoardSearchState = {
  field: SearchField;
  query: string;
};

const baseNavItems: Array<{ key: PageKey; label: string }> = [
  { key: "learning", label: "AI 학습" },
  { key: "qa", label: "Q&A" },
  { key: "community", label: "커뮤니티" },
  { key: "integrations", label: "스킬/토큰" },
];

const pagePaths: Record<PageKey, string> = {
  learning: "/learning",
  qa: "/qa",
  community: "/community",
  integrations: "/integrations",
};

const qnaCategoryTabs = [
  "전체",
  "프론트엔드",
  "백엔드",
  "데브옵스",
  "데이터/AI",
  "모바일",
  "기타",
];

const globalSearchTabs: Array<{ key: GlobalSearchTab; label: string }> = [
  { key: "learning", label: "AI 학습" },
  { key: "qa", label: "Q&A" },
  { key: "community", label: "커뮤니티" },
];

const initialRecentSearches = [
  "React",
  "useMemo",
  "토큰",
  "모각코",
  "프로젝트",
  "NestJS",
];

const popularSearchTerms = [
  { label: "React", trend: "up" },
  { label: "토큰", trend: "up" },
  { label: "useMemo", trend: "same" },
  { label: "AI 학습", trend: "up" },
  { label: "NestJS", trend: "down" },
  { label: "댓글", trend: "same" },
  { label: "프로젝트", trend: "up" },
  { label: "모각코", trend: "down" },
];

const pageMeta: Record<
  PageKey,
  { eyebrow: string; title: string; description: string; tabs: string[] }
> = {
  learning: {
    eyebrow: "learning series",
    title: "프로젝트 그룹별로 AI 학습 글이 자동 등록됩니다",
    description:
      "Claude Code나 Codex가 작성한 코드를 분석해 API로 보내면, 같은 그룹 아래에 1편, 2편처럼 학습 에피소드가 쌓입니다.",
    tabs: ["전체 그룹", "React", "Backend", "전환", "인증/토큰"],
  },
  qa: {
    eyebrow: "questions",
    title: "AI가 작성한 코드, 이해 안 되는 부분을 질문하세요",
    description:
      "훅, 프레임워크 문법, API 호출 흐름처럼 코드 리뷰만으로 놓치기 쉬운 지점을 레포 문맥과 함께 묻고 답합니다.",
    tabs: qnaCategoryTabs,
  },
  community: {
    eyebrow: "community",
    title: "바이브 코딩 학습 경험을 공유하는 공간",
    description:
      "혼자 쓰는 설치에서는 숨길 수 있고, 팀이나 공개 커뮤니티로 운영할 때는 회고와 스터디 글을 함께 나눕니다.",
    tabs: ["전체", "사는 얘기", "회고", "스터디", "모각코", "프로젝트"],
  },
  integrations: {
    eyebrow: "integrations",
    title: "Codex와 Claude Code가 학습 자료를 남기도록 연결합니다",
    description:
      "관리자 토큰을 발급하고, 스킬 또는 플러그인이 같은 레포 그룹에 학습 자료를 누적하도록 설정합니다.",
    tabs: ["스킬 설치", "API 토큰", "레포 그룹", "호출 로그"],
  },
};

const groups: LearningGroup[] = [];

const posts: Post[] = [];

const popularPosts: PopularPost[] = [];
const POPULAR_PAGE_SIZE = 4;

const communityWriteCategories = pageMeta.community.tabs.filter(
  (tab) => tab !== "전체",
);
const qaWriteCategories = pageMeta.qa.tabs.filter((tab) => tab !== "전체");
const POSTS_PER_PAGE = 10;
const defaultBoardSearchState: BoardSearchState = {
  field: "all",
  query: "",
};
const searchFieldOptions = [
  { label: "전체", value: "all" },
  { label: "제목", value: "title" },
  { label: "내용", value: "content" },
  { label: "태그", value: "tag" },
] satisfies Array<{ label: string; value: SearchField }>;
const sortOptions = [
  { label: "최신순", value: "recent" },
  { label: "이름순", value: "name" },
  { label: "추천순", value: "recommend" },
  { label: "댓글순", value: "comments" },
  { label: "조회순", value: "views" },
] satisfies Array<{ label: string; value: SortKey }>;

const searchFieldPlaceholder: Record<SearchField, string> = {
  all: "제목, 내용, 태그 검색",
  content: "내용으로 검색",
  tag: "태그로 검색",
  title: "제목으로 검색",
};

const postMatchesFilters = (
  post: Post,
  tab: string,
  search: BoardSearchState,
) => {
  const matchesCategory = tab === "전체" || post.category === tab;
  const normalizedQuery = search.query.trim().replace(/^#/, "").toLowerCase();

  if (!normalizedQuery) return matchesCategory;

  const targetText = {
    all: [
      post.title,
      post.excerpt,
      post.board,
      post.category,
      post.repo,
      post.tags.join(" "),
    ],
    content: [post.excerpt],
    tag: [post.tags.join(" ")],
    title: [post.title],
  }[search.field]
    .join(" ")
    .toLowerCase();

  return matchesCategory && targetText.includes(normalizedQuery);
};

const getRecentSortIndex = (post: Post) => {
  const index = posts.findIndex((item) => item.id === post.id);

  return index === -1 ? -post.id : index;
};

const getPostAgeMinutes = (post: Post) => {
  if (post.time.includes("방금")) return 0;
  if (post.time.includes("어제")) return 24 * 60;

  const match = post.time.match(/(\d+)\s*(분|시간|일)\s*전/);

  if (!match) return Number.MAX_SAFE_INTEGER;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "분") return value;
  if (unit === "시간") return value * 60;

  return value * 24 * 60;
};

const sortPosts = (items: Post[], sortKey: SortKey) => {
  return [...items].sort((a, b) => {
    if (sortKey === "name") return a.title.localeCompare(b.title, "ko");
    if (sortKey === "recommend") return b.likes - a.likes;
    if (sortKey === "comments") return b.comments - a.comments;
    if (sortKey === "views") return b.views - a.views;

    return (
      getPostAgeMinutes(a) - getPostAgeMinutes(b) ||
      getRecentSortIndex(a) - getRecentSortIndex(b)
    );
  });
};

const textMatchesQuery = (text: string, query: string) => {
  return text.toLowerCase().includes(query.toLowerCase());
};

const getGlobalSearchResults = (
  query: string,
  learningGroups: LearningGroup[],
  postItems: Post[],
): GlobalSearchResult[] => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) return [];

  const learningResults = learningGroups.flatMap((group) =>
    group.episodes
      .filter((episode) =>
        textMatchesQuery(
          [
            group.name,
            group.project,
            group.goal,
            group.framework,
            episode.title,
            episode.summary,
            ...episode.concepts,
          ].join(" "),
          normalizedQuery,
        ),
      )
      .map((episode) => ({
        description: episode.summary,
        href: episodePath(group.id, episode.id),
        id: `learning-${group.id}-${episode.id}`,
        meta: `${group.name} · 조회 ${episode.views} · 댓글 ${episode.comments}`,
        tab: "learning" as const,
        tags: [group.project, ...episode.concepts.slice(0, 3)],
        title: episode.title,
      })),
  );
  const postResults = postItems
    .filter((post) =>
      textMatchesQuery(
        [
          post.board,
          post.category,
          post.title,
          post.excerpt,
          post.repo,
          ...post.tags,
        ].join(" "),
        normalizedQuery,
      ),
    )
    .map((post) => ({
      description: post.excerpt,
      href: postPath(post),
      id: `${post.page}-${post.id}`,
      meta: `${post.board} · 조회 ${post.views} · 댓글 ${post.comments}`,
      tab: post.page,
      tags: [post.repo, ...post.tags.slice(0, 3)],
      title: post.title,
    }));

  return [...learningResults, ...postResults];
};

const connectorCopy = {
  codex: {
    title: "Codex Skill",
    command: "codex skill install explain-code",
    payload: `{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "주문 폼 상태를 커스텀 훅으로 분리한 이유",
  "summary": "입력값, 검증 상태, 제출 흐름을 useOrderForm 훅으로 묶은 과정을 정리했습니다.",
  "overview": "이번 변경은 주문 폼 컴포넌트에 흩어진 상태와 검증 로직을 하나의 훅으로 이동해 화면은 렌더링에 집중하도록 만든 작업입니다.",
  "frameworks": ["React", "TanStack Query"],
  "concepts": ["useState", "custom hook", "controlled input"],
  "flow": ["입력 필드 상태 수집", "검증 메시지 분리", "submit mutation 연결"],
  "files": [
    {
      "path": "frontend/src/features/order/useOrderForm.ts",
      "summary": "주문 폼 상태와 검증 메시지를 관리하는 훅입니다.",
      "changeType": "added"
    }
  ],
  "codeSnippets": [
    {
      "title": "useOrderForm 훅",
      "language": "ts",
      "description": "컴포넌트 밖에서 입력 상태와 제출 가능 여부를 계산합니다.",
      "code": "export const useOrderForm = () => {\\n  const [symbol, setSymbol] = useState('BTC');\\n  const canSubmit = symbol.trim().length > 0;\\n  return { symbol, setSymbol, canSubmit };\\n};"
    },
    {
      "title": "주문 제출 핸들러",
      "language": "tsx",
      "description": "화면은 훅이 제공한 상태만 읽고 제출 mutation을 호출합니다.",
      "code": "const { symbol, canSubmit } = useOrderForm();\\nconst submitOrder = () => {\\n  if (!canSubmit) return;\\n  orderMutation.mutate({ symbol });\\n};"
    }
  ],
  "syntaxNotes": [
    {
      "name": "custom hook",
      "description": "React 컴포넌트에서 반복되는 상태와 이벤트 흐름을 함수로 분리해 재사용합니다."
    },
    {
      "name": "controlled input",
      "description": "입력값을 React state로 관리해 검증, 제출 가능 여부, 초기화를 같은 흐름에서 처리합니다.",
      "example": "const [symbol, setSymbol] = useState('BTC');"
    }
  ],
  "createdBy": "codex"
}`,
  },
  claude: {
    title: "Claude Code Plugin",
    command: "claude plugin add explain-code",
    payload: `{
  "groupKey": "coin-trade",
  "projectName": "실시간 코인 거래 대시보드",
  "title": "TokenGuard가 관리자 토큰을 검증하는 순서",
  "summary": "API 토큰의 만료, 권한, 접근 가능 그룹을 확인하는 백엔드 흐름을 정리했습니다.",
  "overview": "이번 변경은 Claude Code가 읽은 인증 로직을 토큰 파싱, 만료 검증, 권한 확인 순서로 풀어 학습 자료로 남기는 예시입니다.",
  "frameworks": ["NestJS", "PostgreSQL"],
  "concepts": ["Guard", "JWT", "RBAC"],
  "flow": ["Authorization 헤더 파싱", "토큰 만료 확인", "레포 그룹 권한 확인"],
  "files": [
    {
      "path": "backend/src/auth/token.guard.ts",
      "summary": "관리자 API 토큰의 만료와 권한을 검증합니다.",
      "changeType": "modified"
    }
  ],
  "codeSnippets": [
    {
      "title": "토큰 권한 검사",
      "language": "ts",
      "description": "write 권한이나 admin 권한이 있을 때만 자동 등록을 허용합니다.",
      "code": "if (!token.scopes.includes('write') && !token.scopes.includes('admin')) {\\n  throw new ForbiddenException('write 권한이 필요합니다.');\\n}"
    },
    {
      "title": "API 토큰 헤더 읽기",
      "language": "ts",
      "description": "AI 도구는 x-api-token 또는 Bearer 토큰으로 백엔드에 인증 정보를 전달합니다.",
      "code": "const rawToken = request.headers['x-api-token'] ?? getBearerToken(request.headers.authorization);\\nif (!rawToken) throw unauthorized('API 토큰이 필요합니다.');"
    }
  ],
  "syntaxNotes": [
    {
      "name": "Guard",
      "description": "요청이 라우터에 도달하기 전에 인증과 권한 조건을 검사하는 NestJS 계층입니다."
    },
    {
      "name": "RBAC",
      "description": "토큰 scope에 따라 read/write/admin 권한을 구분해 자동 등록 가능 범위를 제한합니다.",
      "example": "token.scopes.includes('write') || token.scopes.includes('admin')"
    }
  ],
  "createdBy": "claude"
}`,
  },
};

type RouteState = {
  activePage: PageKey;
  detailView: DetailView | null;
  redirectTo?: string;
  selectedEpisodeId?: string;
  selectedGroupId?: string;
};

const episodePath = (groupId: string, episodeId: string) =>
  `/learning/${encodeURIComponent(groupId)}/${encodeURIComponent(episodeId)}`;

const postPath = (post: Post) => `/${post.page}/${post.id}`;
const postEditPath = (post: Post) => `/${post.page}/${post.id}/edit`;
const writePath = (page: "qa" | "community") => `/${page}/write`;
const getPopularityScore = (metrics: {
  comments: number;
  dislikes: number;
  likes: number;
  views: number;
}) =>
  metrics.views + metrics.likes * 6 + metrics.comments * 10 - metrics.dislikes * 3;
const formatMetricCount = (value: number) => {
  if (value >= 1000) {
    const rounded = value / 1000;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
  }

  return value.toLocaleString("ko-KR");
};
const feedbackTargetKey = (target: FeedbackTarget) =>
  target.type === "post"
    ? `post:${target.postId}`
    : `episode:${target.groupId}:${target.episodeId}`;

type NormalizedEpisodeFile = {
  changeType?: "added" | "modified" | "removed" | "renamed";
  path: string;
  summary?: string;
};

type MarkdownBlock =
  | { text: string; type: "paragraph" }
  | { level: number; text: string; type: "heading" }
  | { items: string[]; type: "list" }
  | { text: string; type: "quote" }
  | { code: string; language?: string; type: "code" };

const changeTypeLabels = {
  added: "추가",
  modified: "수정",
  removed: "삭제",
  renamed: "이름 변경",
} satisfies Record<NonNullable<NormalizedEpisodeFile["changeType"]>, string>;

const normalizeEpisodeFiles = (
  files: ApiEpisodeBody["files"] | undefined,
): NormalizedEpisodeFile[] =>
  (files ?? [])
    .map((file) => (typeof file === "string" ? { path: file } : file))
    .filter((file) => file.path.trim().length > 0);

const syntaxNoteDetails: Record<
  string,
  { description: string; example?: string }
> = {
  "admin ux": {
    description:
      "관리자가 실수하기 쉬운 토큰 만료, 재발급, 권한 변경 같은 작업을 화면 흐름으로 안전하게 안내하는 설계 포인트입니다. 단순히 버튼을 배치하는 것이 아니라, 위험한 변경 전 확인 문구와 이후 상태 갱신까지 함께 고려합니다.",
  },
  "checklist state": {
    description:
      "체크리스트 항목의 완료 여부를 배열이나 map 형태의 상태로 관리하는 패턴입니다. 항목이 늘어나도 개별 완료 상태를 안정적으로 갱신할 수 있어 온보딩이나 학습 진행률 UI에 잘 맞습니다.",
    example:
      "setCheckedItems((current) => ({ ...current, [itemId]: !current[itemId] }));",
  },
  "codeSnippets": {
    description:
      "중요한 코드 조각을 여러 개 전달하기 위한 문서 필드입니다. 각 항목은 제목, 언어, 코드, 설명을 함께 가지므로 상세 페이지에서 코드와 그 코드가 맡은 역할을 독립된 단락으로 보여줄 수 있습니다.",
    example:
      '"codeSnippets": [{ "title": "useOrderForm 훅", "language": "ts", "code": "..." }]',
  },
  "component boundary": {
    description:
      "컴포넌트가 어디까지 책임지고 어디서부터 다른 컴포넌트나 훅으로 넘길지를 정하는 기준입니다. 렌더링, 상태 관리, 서버 통신이 한 파일에 섞일 때 경계를 나누면 테스트와 재사용이 쉬워집니다.",
  },
  "component composition": {
    description:
      "작은 컴포넌트를 조합해 복잡한 화면을 만드는 방식입니다. 이번 학습에서는 목록, 상태 배지, 상세 본문처럼 역할이 다른 UI를 분리해 각 컴포넌트가 하나의 책임만 갖도록 만드는 흐름을 설명합니다.",
    example:
      "<PostCard><StatusBadge /><PostSummary /></PostCard>",
  },
  "conditional rendering": {
    description:
      "상태나 데이터 존재 여부에 따라 다른 UI를 보여주는 React 렌더링 패턴입니다. 로딩, 빈 상태, 에러, 성공 상태를 명확히 나누면 사용자가 현재 화면의 의미를 바로 이해할 수 있습니다.",
    example: "{items.length > 0 ? <List items={items} /> : <EmptyState />}",
  },
  "controlled input": {
    description:
      "입력값을 DOM에 맡기지 않고 React state로 관리하는 방식입니다. 값, 검증 메시지, 제출 가능 여부를 같은 흐름에서 계산할 수 있어 폼이 커질수록 예측 가능한 구조를 만들 수 있습니다.",
    example:
      "const [value, setValue] = useState('');\n<input value={value} onChange={(event) => setValue(event.target.value)} />",
  },
  "custom hook": {
    description:
      "컴포넌트 안에 반복되거나 길어진 상태 로직을 함수로 분리하는 React 패턴입니다. 화면 컴포넌트는 렌더링에 집중하고, 입력값 관리나 API 호출 흐름은 훅에서 맡도록 책임을 나눌 수 있습니다.",
    example: "const { values, canSubmit, submit } = useOrderForm();",
  },
  "data fetching": {
    description:
      "서버에서 데이터를 가져오는 요청의 로딩, 성공, 실패 상태를 UI와 연결하는 흐름입니다. 요청 함수를 컴포넌트 밖으로 분리하면 화면은 데이터의 상태만 읽고 렌더링할 수 있습니다.",
  },
  "error boundary": {
    description:
      "렌더링 중 발생한 예외가 전체 앱을 깨뜨리지 않도록 특정 영역에서 잡아내는 React 패턴입니다. 서버 요청 실패와 렌더링 예외를 구분하면 사용자에게 더 정확한 복구 방법을 안내할 수 있습니다.",
  },
  expiration: {
    description:
      "토큰이나 세션처럼 시간이 지나면 사용할 수 없는 리소스의 만료 상태를 계산하는 개념입니다. 만료 전 알림, 만료 후 비활성화, 재발급 안내까지 하나의 흐름으로 연결해야 합니다.",
  },
  "form validation": {
    description:
      "사용자가 입력한 값이 제출 가능한지 확인하는 과정입니다. UI에서는 필드별 메시지, 제출 버튼 활성화, 서버 검증 실패 복구 흐름까지 함께 설계해야 좋은 사용성을 만들 수 있습니다.",
  },
  Guard: {
    description:
      "요청이 실제 핸들러에 도달하기 전에 인증과 권한 조건을 검사하는 백엔드 계층입니다. API 토큰 기반 자동 등록에서는 토큰 존재 여부, 만료, scope를 이 단계에서 먼저 검증합니다.",
  },
  JWT: {
    description:
      "사용자나 클라이언트의 인증 정보를 서명된 토큰으로 전달하는 방식입니다. 서버는 토큰을 복호화해 사용자를 식별하고, 만료 여부를 확인한 뒤 요청을 계속 처리할지 결정합니다.",
  },
  memo: {
    description:
      "입력이 바뀌지 않았을 때 컴포넌트나 계산 결과를 다시 만들지 않도록 재사용하는 최적화 방식입니다. 긴 리스트나 자주 갱신되는 화면에서 불필요한 렌더링을 줄이는 데 사용합니다.",
  },
  mutation: {
    description:
      "서버 데이터를 생성, 수정, 삭제하는 쓰기 요청을 뜻합니다. 읽기 요청과 달리 성공 이후 캐시 갱신, 낙관적 업데이트, 실패 시 롤백 같은 후속 처리를 함께 고려해야 합니다.",
  },
  ngIf: {
    description:
      "Angular에서 조건에 따라 템플릿 일부를 렌더링하거나 제거하는 지시자입니다. React로 옮길 때는 JSX 조건식이나 별도 컴포넌트 분기로 바꾸는 식으로 대응합니다.",
    example: "{isVisible && <Panel />}",
  },
  Observable: {
    description:
      "시간에 따라 여러 값을 흘려보내는 비동기 데이터 흐름입니다. Angular 서비스에서 자주 쓰이며, React Query로 전환할 때는 구독 흐름을 요청 함수와 query key 중심으로 재구성합니다.",
  },
  "optimistic update": {
    description:
      "서버 응답을 기다리기 전에 UI를 먼저 성공한 것처럼 갱신하는 방식입니다. 댓글 작성처럼 즉각적인 반응이 중요한 기능에 쓰지만, 실패했을 때 이전 상태로 되돌리는 로직이 필요합니다.",
  },
  progress: {
    description:
      "작업이나 학습이 얼마나 진행되었는지를 수치나 상태로 표현하는 개념입니다. 전체 항목 수와 완료 항목 수를 분리해 계산하면 필터나 새 항목 추가에도 안정적으로 대응할 수 있습니다.",
  },
  "query invalidation": {
    description:
      "쓰기 요청이 성공한 뒤 관련 읽기 캐시를 오래된 데이터로 표시하고 다시 불러오게 하는 TanStack Query 패턴입니다. 서버 상태와 화면 목록을 맞추는 핵심 후속 처리입니다.",
    example: "queryClient.invalidateQueries({ queryKey: ['orders'] });",
  },
  "query key": {
    description:
      "서버 데이터 캐시를 구분하기 위해 사용하는 고유한 배열 키입니다. 같은 API라도 필터, 페이지, 상세 id가 다르면 query key를 나눠야 캐시 충돌을 피할 수 있습니다.",
    example: "useQuery({ queryKey: ['group', groupId], queryFn: fetchGroup });",
  },
  RBAC: {
    description:
      "역할이나 권한 범위에 따라 접근 가능한 기능을 나누는 방식입니다. 자동 등록 API에서는 read/write/admin 같은 scope로 학습 에피소드 생성 가능 여부를 제한합니다.",
    example: "token.scopes.includes('write') || token.scopes.includes('admin')",
  },
  rollback: {
    description:
      "낙관적으로 먼저 바꾼 UI 상태를 요청 실패 시 이전 상태로 되돌리는 처리입니다. 사용자는 빠른 피드백을 받고, 실패한 경우에도 데이터 불일치가 남지 않도록 보호합니다.",
  },
  scope: {
    description:
      "토큰이나 사용자에게 허용된 작업 범위를 나타내는 권한 단위입니다. 자동 등록 API에서는 write scope가 있어야 새 학습 에피소드를 생성할 수 있습니다.",
  },
  "server data": {
    description:
      "클라이언트가 직접 소유하지 않고 서버가 원본으로 관리하는 데이터입니다. 화면에서는 캐시, 새로고침, 낙관적 업데이트를 통해 사용자 경험을 좋게 만들되 서버 상태와 어긋나지 않게 관리해야 합니다.",
  },
  "status badge": {
    description:
      "데이터의 현재 상태를 짧은 라벨로 보여주는 UI 패턴입니다. 해결됨, 진행 중, 실패처럼 사용자가 목록을 훑으며 바로 판단해야 하는 정보를 텍스트와 색상으로 압축해 전달합니다.",
  },
  "syntaxNotes": {
    description:
      "코드에서 사용된 프레임워크, 라이브러리, 문법 포인트를 설명하는 문서 필드입니다. 코드 블록과 분리해 저장하므로 긴 코드 옆에서 놓치기 쉬운 핵심 개념을 별도 단락으로 정리할 수 있습니다.",
    example:
      '"syntaxNotes": [{ "name": "useMutation", "description": "서버 쓰기 요청 상태를 관리합니다." }]',
  },
  "token lifecycle": {
    description:
      "토큰 발급, 사용, 만료, 재발급, 폐기까지 이어지는 전체 흐름입니다. 외부 AI 도구와 연동할 때는 새 토큰이 발급된 뒤 기존 클라이언트 설정도 함께 업데이트해야 합니다.",
  },
  useMutation: {
    description:
      "TanStack Query에서 서버에 값을 쓰는 요청을 관리하는 훅입니다. 로딩, 성공, 실패 상태와 후속 캐시 갱신을 한곳에 묶어 폼 제출이나 생성 요청을 안정적으로 다룰 수 있습니다.",
    example: "const orderMutation = useMutation({ mutationFn: createOrder });",
  },
  useState: {
    description:
      "컴포넌트 내부의 UI 상태를 저장하는 React 기본 훅입니다. 입력값, 선택 상태, 모달 열림 여부처럼 화면 상호작용에 따라 바뀌는 값을 관리할 때 사용합니다.",
    example: "const [value, setValue] = useState('');",
  },
};

const getSyntaxNoteDetail = (name: string) => {
  const normalized = name.trim().toLowerCase();
  const exact = syntaxNoteDetails[name.trim()];

  if (exact) return exact;

  return (
    syntaxNoteDetails[normalized] ?? {
      description:
        "이 개념은 이번 코드 변경에서 책임을 나누고 흐름을 이해하는 기준점입니다. 코드가 어떤 문제를 해결하기 위해 이 문법이나 라이브러리 기능을 선택했는지 함께 확인하면 재사용하기 쉽습니다.",
    }
  );
};

const getEpisodeDocument = (episode: Episode, group: LearningGroup) => {
  const body = episode.body ?? {};
  const files = normalizeEpisodeFiles(body.files);
  const codeSnippets =
    body.codeSnippets?.filter((snippet) => snippet.code.trim().length > 0) ??
    [];
  const syntaxNotes =
    body.syntaxNotes?.filter((note) => note.name.trim().length > 0) ?? [];
  const fallbackCodeSnippets: NonNullable<ApiEpisodeBody["codeSnippets"]> = [
    {
      code: JSON.stringify(
        {
          codeSnippets: [
            {
              code: "export const useOrderForm = () => ({ canSubmit: true });",
              language: "ts",
              title: "중요 코드 제목",
            },
          ],
          concepts: episode.concepts,
          createdBy: "codex",
          flow: episode.flow,
          groupKey: group.id,
          projectName: group.project,
          summary: episode.summary,
          syntaxNotes: [
            {
              description:
                "이 코드에서 사용한 프레임워크나 라이브러리 문법을 설명합니다.",
              name: episode.concepts[0] ?? "핵심 문법",
            },
          ],
          title: episode.title,
        },
        null,
        2,
      ),
      description:
        "Codex나 Claude Code가 백엔드 ingest API로 보내는 문서형 payload 구조입니다.",
      language: "json",
      title: "AI 학습 등록 payload",
    },
    {
      code: `const selectedGroup = groups.find((group) => group.id === "${group.id}");\nconst selectedEpisode = selectedGroup?.episodes.find(\n  (episode) => episode.id === "${episode.id}",\n);\n\nreturn selectedEpisode ? <LearningDetail episode={selectedEpisode} /> : null;`,
      description:
        "프론트는 그룹 목록에서 현재 에피소드를 찾고, 저장된 코드/문법 설명을 상세 페이지에 문서처럼 렌더링합니다.",
      language: "tsx",
      title: "AI 학습 상세 조회 흐름",
    },
    {
      code: `const syntaxNotes = episode.body?.syntaxNotes ?? [];\n\nreturn syntaxNotes.map((note) => ({\n  title: note.name,\n  description: note.description,\n  example: note.example,\n}));`,
      description:
        "코드 블록에서 사용된 라이브러리 문법은 syntaxNotes로 분리해 문법 설명 영역에서 더 자세히 보여줍니다.",
      language: "tsx",
      title: "문법 설명 데이터 정리",
    },
  ];
  const fallbackSyntaxNotes: NonNullable<ApiEpisodeBody["syntaxNotes"]> = [
    ...episode.concepts.map((concept) => ({
      ...getSyntaxNoteDetail(concept),
      name: concept,
    })),
    { ...getSyntaxNoteDetail("codeSnippets"), name: "codeSnippets" },
    { ...getSyntaxNoteDetail("syntaxNotes"), name: "syntaxNotes" },
  ];
  const enrichedSyntaxNotes = syntaxNotes.map((note) => {
    const fallback = getSyntaxNoteDetail(note.name);
    const isGeneric =
      note.description.length < 80 ||
      note.description.includes("이번 변경에서 코드의 책임");

    return {
      ...note,
      description: isGeneric ? fallback.description : note.description,
      example: note.example ?? fallback.example,
    };
  });
  const richCodeSnippets =
    codeSnippets.length >= 3
      ? codeSnippets
      : [...codeSnippets, ...fallbackCodeSnippets].slice(0, 3);
  const richSyntaxNotes =
    syntaxNotes.length >= 4
      ? enrichedSyntaxNotes
      : [...enrichedSyntaxNotes, ...fallbackSyntaxNotes].filter(
          (note, index, notes) =>
            notes.findIndex((item) => item.name === note.name) === index,
        );

  return {
    codeSnippets: richCodeSnippets,
    diffSummary: body.diffSummary,
    files,
    markdown: body.markdown,
    overview: body.overview ?? body.diffSummary ?? episode.summary,
    syntaxNotes: richSyntaxNotes,
  };
};

const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ text: paragraph.join(" "), type: "paragraph" });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ items: list, type: "list" });
    list = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push({ text: quote.join(" "), type: "quote" });
    quote = [];
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    const codeFence = trimmed.match(/^```([a-zA-Z0-9_-]+)?$/);
    if (codeFence) {
      const codeLines: string[] = [];
      flushTextBlocks();
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        code: codeLines.join("\n"),
        language: codeFence[1],
        type: "code",
      });
      continue;
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushTextBlocks();
      blocks.push({
        level: heading[1].length,
        text: heading[2],
        type: "heading",
      });
      continue;
    }

    const listItem = trimmed.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      flushQuote();
      list.push(listItem[1]);
      continue;
    }

    const quoteLine = trimmed.match(/^>\s?(.+)$/);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  flushTextBlocks();

  return blocks;
};

const codeLanguageAliases: Record<string, string> = {
  cjs: "javascript",
  html: "markup",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
  xml: "markup",
  yml: "yaml",
};

const normalizeCodeLanguage = (language?: string) => {
  if (!language) return "markup";

  const normalized = language.trim().toLowerCase();

  return codeLanguageAliases[normalized] ?? normalized;
};

const syntaxHighlighterStyle: CSSProperties = {
  background: "#0f172a",
  borderRadius: "8px",
  fontSize: "13px",
  lineHeight: "1.7",
  margin: 0,
  overflowX: "auto",
  padding: "16px",
};

const syntaxHighlighterCodeStyle: CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
};

function CodeBlock({
  className,
  code,
  language,
}: {
  className?: string;
  code: string;
  language?: string;
}) {
  return (
    <SyntaxHighlighter
      className={["md-code", className].filter(Boolean).join(" ")}
      codeTagProps={{ style: syntaxHighlighterCodeStyle }}
      customStyle={syntaxHighlighterStyle}
      language={normalizeCodeLanguage(language)}
      style={oneDark}
      wrapLongLines={false}
    >
      {code.trimEnd()}
    </SyntaxHighlighter>
  );
}

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some embedded browsers expose the API but reject writes without a prompt.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) throw new Error("Clipboard copy failed");
  } finally {
    textarea.remove();
  }
};

const parseRoute = (pathname: string): RouteState => {
  const [pageSegment, secondSegment, thirdSegment] = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (!pageSegment) {
    return {
      activePage: "learning",
      detailView: null,
      redirectTo: pagePaths.learning,
    };
  }

  if (pageSegment === "learning") {
    if (secondSegment && thirdSegment) {
      return {
        activePage: "learning",
        detailView: {
          type: "episode",
          groupId: secondSegment,
          episodeId: thirdSegment,
        },
        selectedEpisodeId: thirdSegment,
        selectedGroupId: secondSegment,
      };
    }

    return { activePage: "learning", detailView: null };
  }

  if (pageSegment === "qa" || pageSegment === "community") {
    if (secondSegment) {
      if (secondSegment === "write") {
        return {
          activePage: pageSegment,
          detailView: { type: "write", page: pageSegment },
        };
      }

      const postId = Number(secondSegment);
      if (Number.isFinite(postId)) {
        if (thirdSegment === "edit") {
          return {
            activePage: pageSegment,
            detailView: { type: "edit-post", postId },
          };
        }

        return {
          activePage: pageSegment,
          detailView: { type: "post", postId },
        };
      }

      return {
        activePage: pageSegment,
        detailView: null,
        redirectTo: pagePaths[pageSegment],
      };
    }

    return { activePage: pageSegment, detailView: null };
  }

  if (pageSegment === "integrations") {
    return { activePage: "integrations", detailView: null };
  }

  return {
    activePage: "learning",
    detailView: null,
    redirectTo: pagePaths.learning,
  };
};

function NotificationKindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "learning") return <BookMarked size={15} aria-hidden="true" />;
  if (kind === "comment") return <MessageSquare size={15} aria-hidden="true" />;
  if (kind === "milestone") return <Eye size={15} aria-hidden="true" />;
  if (kind === "popular") return <Flame size={15} aria-hidden="true" />;

  return <KeyRound size={15} aria-hidden="true" />;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(
    () => parseRoute(location.pathname),
    [location.pathname],
  );
  const activePage = route.activePage;
  const detailView = route.detailView;
  const viewedPostId = detailView?.type === "post" ? detailView.postId : null;
  const [activeTabs, setActiveTabs] = useState<Record<PageKey, string>>({
    community: pageMeta.community.tabs[0],
    integrations: pageMeta.integrations.tabs[0],
    learning: pageMeta.learning.tabs[0],
    qa: pageMeta.qa.tabs[0],
  });
  const [searchControls, setSearchControls] = useState<
    Record<BoardPageKey, BoardSearchState>
  >({
    community: defaultBoardSearchState,
    qa: defaultBoardSearchState,
  });
  const [sortKeys, setSortKeys] = useState<Record<BoardPageKey, SortKey>>({
    community: "recent",
    qa: "recent",
  });
  const [boardPages, setBoardPages] = useState<Record<BoardPageKey, number>>({
    community: 1,
    qa: 1,
  });
  const [connector, setConnector] = useState<Connector>("codex");
  const [groupItems, setGroupItems] = useState<LearningGroup[]>(groups);
  const [postItems, setPostItems] = useState<Post[]>(posts);
  const [selectedGroupId, setSelectedGroupId] = useState(
    groups[0]?.id ?? "",
  );
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(
    groups[0]?.episodes[0]?.id ?? "",
  );
  const [showQa, setShowQa] = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = window.localStorage.getItem("explain-code-theme");

    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";

    return "light";
  });
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const shareResetTimerRef = useRef<number | null>(null);
  const viewedPostIdRef = useRef<number | null>(null);
  const viewedPostCountsRef = useRef<Record<number, number>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState("mirae.dev");
  const [loggedIn, setLoggedIn] = useState(
    () =>
      Boolean(window.localStorage.getItem(runtimeConfig.authTokenStorageKey)) ||
      window.localStorage.getItem(runtimeConfig.authStateStorageKey) === "true",
  );
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchDraft, setGlobalSearchDraft] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchTab, setGlobalSearchTab] =
    useState<GlobalSearchTab>("learning");
  const [recentSearches, setRecentSearches] = useState(initialRecentSearches);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(6);
  const [serverNotifications, setServerNotifications] = useState<
    NotificationItem[]
  >([]);
  const [serverSearchResults, setServerSearchResults] = useState<
    GlobalSearchResult[] | null
  >(null);
  const [serverSearchCounts, setServerSearchCounts] = useState<Record<
    GlobalSearchTab,
    number
  > | null>(null);
  const [favoriteGroupIds, setFavoriteGroupIds] = useState<string[]>([]);
  const [showAllFavoriteGroups, setShowAllFavoriteGroups] = useState(false);
  const [showAllMyGroups, setShowAllMyGroups] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<number | null>(null);
  const [storedReactions, setStoredReactions] = useState<
    Record<string, UserReaction>
  >({});
  const [categoryScrollState, setCategoryScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const meta = pageMeta[activePage];
  const activeTab = activeTabs[activePage] ?? meta.tabs[0];
  const activeBoardKey: BoardPageKey | null =
    activePage === "qa" || activePage === "community" ? activePage : null;
  const activeSearch = activeBoardKey
    ? searchControls[activeBoardKey]
    : defaultBoardSearchState;
  const activeSort = activeBoardKey ? sortKeys[activeBoardKey] : "recent";
  const requestedBoardPage = activeBoardKey ? boardPages[activeBoardKey] : 1;
  const rankedPopularPosts = useMemo<PopularPost[]>(() => {
    const learningItems = groupItems.flatMap((group) =>
      group.episodes.map((episode) => ({
        comments: episode.comments,
        kind: "AI 학습",
        likes: episode.likes,
        score: getPopularityScore(episode),
        title: episode.title,
        to: episodePath(group.id, episode.id),
        views: episode.views,
      })),
    );
    const boardItems = postItems.map((post) => ({
      comments: post.comments,
      kind: post.page === "qa" ? "Q&A" : "커뮤니티",
      likes: post.likes,
      score: getPopularityScore(post),
      title: post.title,
      to: postPath(post),
      views: post.views,
    }));

    return [...learningItems, ...boardItems]
      .sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          (b.views ?? 0) - (a.views ?? 0) ||
          (b.likes ?? 0) - (a.likes ?? 0) ||
          (b.comments ?? 0) - (a.comments ?? 0),
      )
      .slice(0, POPULAR_PAGE_SIZE * 2);
  }, [groupItems, postItems]);
  const rankedPopularPostPages = useMemo(() => {
    const source =
      rankedPopularPosts.length > 0 ? rankedPopularPosts : popularPosts;
    const pages = Array.from(
      { length: Math.ceil(source.length / POPULAR_PAGE_SIZE) },
      (_, index) =>
        source.slice(
          index * POPULAR_PAGE_SIZE,
          (index + 1) * POPULAR_PAGE_SIZE,
        ),
    ).filter((page) => page.length > 0);

    return pages;
  }, [rankedPopularPosts]);
  const notificationItems = useMemo<NotificationItem[]>(() => {
    if (loggedIn) return serverNotifications;

    const viewThresholds = [500, 300, 100];
    const learningNotifications = groupItems.slice(0, 5).map((group, index) => {
      const episode = group.episodes[0];

      return {
        description: `${group.name} 그룹에 새 학습 에피소드가 등록되었습니다.`,
        href: episodePath(group.id, episode.id),
        id: `learning-${group.id}-${episode.id}`,
        kind: "learning" as const,
        time:
          ["방금 전", "12분 전", "34분 전", "1시간 전", "2시간 전"][index] ??
          "오늘",
        title: "AI가 학습 글을 등록했어요",
      };
    });
    const commentNotifications = postItems
      .filter((post) => post.author === currentUser && post.comments > 0)
      .slice(0, 4)
      .map((post) => ({
        description: `"${post.title}" 글에 새 댓글이 달렸습니다.`,
        href: postPath(post),
        id: `comment-${post.id}`,
        kind: "comment" as const,
        time: post.time,
        title: "내 게시글에 댓글이 달렸어요",
      }));
    const postMilestones = postItems
      .map((post) => ({
        post,
        threshold: viewThresholds.find((threshold) => post.views >= threshold),
      }))
      .filter((item): item is { post: Post; threshold: number } =>
        Boolean(item.threshold),
      )
      .slice(0, 4)
      .map(({ post, threshold }) => ({
        description: `"${post.title}" 글 조회수가 ${threshold}회를 넘었습니다.`,
        href: postPath(post),
        id: `milestone-post-${post.id}-${threshold}`,
        kind: "milestone" as const,
        time: post.time,
        title: "조회수 마일스톤을 달성했어요",
      }));
    const episodeMilestones = groupItems
      .flatMap((group) =>
        group.episodes.map((episode) => ({
          episode,
          group,
          threshold: viewThresholds.find(
            (threshold) => episode.views >= threshold,
          ),
        })),
      )
      .filter(
        (
          item,
        ): item is {
          episode: Episode;
          group: LearningGroup;
          threshold: number;
        } => Boolean(item.threshold),
      )
      .slice(0, 3)
      .map(({ episode, group, threshold }) => ({
        description: `"${episode.title}" 학습 글 조회수가 ${threshold}회를 넘었습니다.`,
        href: episodePath(group.id, episode.id),
        id: `milestone-episode-${group.id}-${episode.id}-${threshold}`,
        kind: "milestone" as const,
        time: episode.time,
        title: "AI 학습 글 조회수가 상승했어요",
      }));
    const popularNotificationSource =
      rankedPopularPosts.length > 0 ? rankedPopularPosts : popularPosts;
    const popularNotifications = popularNotificationSource.map((post, index) => ({
      description: `"${post.title}" 글이 오늘의 인기글 ${index + 1}위에 올랐습니다.`,
      href: post.to,
      id: `popular-${index}`,
      kind: "popular" as const,
      time: index < 4 ? "오늘" : "어제",
      title: "오늘의 인기글에 올랐어요",
    }));
    const tokenNotifications = [
      ["token-7d", "7일", "API 토큰 만료까지 7일 남았습니다."],
      ["token-3d", "3일", "API 토큰 만료까지 3일 남았습니다."],
      ["token-1d", "1일", "API 토큰 만료까지 1일 남았습니다."],
      ["token-1h", "1시간", "API 토큰 만료까지 1시간 남았습니다."],
    ].map(([id, time, description]) => ({
      description,
      href: pagePaths.integrations,
      id,
      kind: "token" as const,
      time: `${time} 남음`,
      title: "API 토큰 만료 알림",
    }));

    return [
      ...learningNotifications,
      ...commentNotifications,
      ...postMilestones,
      ...episodeMilestones,
      ...popularNotifications,
      ...tokenNotifications,
    ];
  }, [
    currentUser,
    groupItems,
    loggedIn,
    postItems,
    rankedPopularPosts,
    serverNotifications,
  ]);
  const visibleNotifications = notificationItems.slice(
    0,
    visibleNotificationCount,
  );
  const hasMoreNotifications =
    visibleNotificationCount < notificationItems.length;
  const globalSearchResults = useMemo(
    () =>
      serverSearchResults ??
      getGlobalSearchResults(globalSearchQuery, groupItems, postItems),
    [globalSearchQuery, groupItems, postItems, serverSearchResults],
  );
  const globalSearchCounts = useMemo(
    () =>
      serverSearchCounts ??
      globalSearchTabs.reduce(
        (counts, tab) => ({
          ...counts,
          [tab.key]: globalSearchResults.filter(
            (result) => result.tab === tab.key,
          ).length,
        }),
        {} as Record<GlobalSearchTab, number>,
      ),
    [globalSearchResults, serverSearchCounts],
  );
  const activeGlobalSearchResults = globalSearchResults.filter(
    (result) => result.tab === globalSearchTab,
  );
  const currentPosts = useMemo(() => {
    if (!activeBoardKey) return [];

    return sortPosts(
      postItems.filter(
        (post) =>
          post.page === activePage &&
          postMatchesFilters(post, activeTab, activeSearch),
      ),
      activeSort,
    );
  }, [
    activeBoardKey,
    activePage,
    activeSearch,
    activeSort,
    activeTab,
    postItems,
  ]);
  const totalPostPages = Math.max(
    1,
    Math.ceil(currentPosts.length / POSTS_PER_PAGE),
  );
  const activeBoardPage = Math.min(requestedBoardPage, totalPostPages);
  const paginatedPosts = useMemo(
    () =>
      currentPosts.slice(
        (activeBoardPage - 1) * POSTS_PER_PAGE,
        activeBoardPage * POSTS_PER_PAGE,
      ),
    [activeBoardPage, currentPosts],
  );
  const visiblePostStart =
    currentPosts.length === 0 ? 0 : (activeBoardPage - 1) * POSTS_PER_PAGE + 1;
  const visiblePostEnd = Math.min(
    activeBoardPage * POSTS_PER_PAGE,
    currentPosts.length,
  );
  const paginationSummary =
    currentPosts.length === 0
      ? "0 / 0"
      : `${visiblePostStart}-${visiblePostEnd} / ${currentPosts.length}`;
  const paginationPages = Array.from(
    { length: totalPostPages },
    (_, index) => index + 1,
  );

  const visibleNavItems = baseNavItems.filter((item) => {
    if (item.key === "qa") return showQa;
    if (item.key === "community") return showCommunity;
    if (item.key === "integrations") return loggedIn;
    return true;
  });
  const selectedGroup =
    groupItems.find(
      (group) => group.id === (route.selectedGroupId ?? selectedGroupId),
    ) ?? groupItems[0];
  const selectedEpisode =
    selectedGroup?.episodes.find(
      (episode) =>
        episode.id === (route.selectedEpisodeId ?? selectedEpisodeId),
    ) ?? selectedGroup?.episodes[0];
  const detailPost =
    detailView?.type === "post" || detailView?.type === "edit-post"
      ? postItems.find((post) => post.id === detailView.postId)
      : undefined;
  const detailGroup =
    detailView?.type === "episode"
      ? groupItems.find((group) => group.id === detailView.groupId)
      : undefined;
  const detailEpisode =
    detailView?.type === "episode"
      ? detailGroup?.episodes.find(
          (episode) => episode.id === detailView.episodeId,
        )
      : undefined;
  const favoriteGroups = groupItems.filter((group) =>
    favoriteGroupIds.includes(group.id),
  );
  const myGroups = groupItems.filter((group) => group.owner === currentUser);
  const visibleFavoriteGroups = showAllFavoriteGroups
    ? favoriteGroups
    : favoriteGroups.slice(0, 3);
  const visibleMyGroups = showAllMyGroups ? myGroups : myGroups.slice(0, 3);
  const categoryTabsShellClass = [
    "category-tabs-shell",
    categoryScrollState.canScrollLeft ? "has-left-fade" : "",
    categoryScrollState.canScrollRight ? "has-right-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const isDarkTheme = themeMode === "dark";
  const requiresLoginRoute =
    activePage === "integrations" ||
    detailView?.type === "write" ||
    detailView?.type === "edit-post";

  const handlePageChange = (page: PageKey) => {
    navigate(pagePaths[page]);
  };

  const toggleTheme = () => {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  };

  const openGlobalSearch = () => {
    setGlobalSearchDraft("");
    setGlobalSearchQuery("");
    setGlobalSearchTab("learning");
    setGlobalSearchOpen(true);
  };

  const toggleNotifications = () => {
    setNotificationsOpen((current) => {
      const next = !current;
      if (next) setVisibleNotificationCount(6);

      return next;
    });
  };

  const openNotification = (notification: NotificationItem) => {
    setNotificationsOpen(false);
    if (loggedIn) {
      setServerNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      );
      void markNotificationRead(notification.id)
        .then(refreshNotifications)
        .catch((error) => {
          console.error("Failed to mark notification as read", error);
        });
    }
    navigate(notification.href);
  };

  const submitGlobalSearch = (query: string) => {
    const nextQuery = query.trim();

    if (!nextQuery) return;

    setGlobalSearchDraft(nextQuery);
    setGlobalSearchQuery(nextQuery);
    setGlobalSearchTab("learning");
    setServerSearchResults(null);
    setServerSearchCounts(null);
    setRecentSearches((current) =>
      [
        nextQuery,
        ...current.filter(
          (item) => item.toLowerCase() !== nextQuery.toLowerCase(),
        ),
      ].slice(0, 8),
    );
    void searchAll(nextQuery)
      .then((response) => {
        setServerSearchResults(response.results);
        setServerSearchCounts(response.counts);
      })
      .catch((error) => {
        console.error("Failed to search", error);
      });
  };

  const updateGlobalSearchDraft = (value: string) => {
    setGlobalSearchDraft(value);

    if (!value.trim()) {
      setGlobalSearchQuery("");
      setGlobalSearchTab("learning");
      setServerSearchResults(null);
      setServerSearchCounts(null);
    }
  };

  const openGlobalSearchResult = (href: string) => {
    setGlobalSearchOpen(false);
    navigate(href);
  };

  const handleNotificationScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    if (element.scrollTop + element.clientHeight < element.scrollHeight - 24)
      return;

    setVisibleNotificationCount((current) =>
      Math.min(current + 5, notificationItems.length),
    );
  };

  const resetBoardPage = (page: BoardPageKey) => {
    setBoardPages((current) =>
      current[page] === 1 ? current : { ...current, [page]: 1 },
    );
  };

  const updateCategoryScrollState = useCallback(() => {
    const element = categoryTabsRef.current;

    if (!element) {
      setCategoryScrollState({ canScrollLeft: false, canScrollRight: false });
      return;
    }

    const hasOverflow = element.scrollWidth > element.clientWidth + 1;
    const canScrollLeft = hasOverflow && element.scrollLeft > 1;
    const canScrollRight =
      hasOverflow &&
      element.scrollLeft + element.clientWidth < element.scrollWidth - 1;

    setCategoryScrollState((current) =>
      current.canScrollLeft === canScrollLeft &&
      current.canScrollRight === canScrollRight
        ? current
        : { canScrollLeft, canScrollRight },
    );
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activePage, detailView]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("explain-code-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    window.localStorage.setItem(
      runtimeConfig.authStateStorageKey,
      String(loggedIn),
    );
  }, [loggedIn]);

  useEffect(
    () => () => {
      if (shareResetTimerRef.current) {
        window.clearTimeout(shareResetTimerRef.current);
      }
    },
    [],
  );

  const refreshPublicData = useCallback(async () => {
    try {
      const [groupResponse, postResponse] = await Promise.all([
        getProjectGroups(),
        getPosts(),
      ]);

      setGroupItems(groupResponse.groups);
      setPostItems(
        postResponse.posts.map((post) => {
          const viewedCount = viewedPostCountsRef.current[post.id];

          return viewedCount && viewedCount > post.views
            ? { ...post, views: viewedCount }
            : post;
        }),
      );
      setFavoriteGroupIds(
        groupResponse.groups
          .filter((group) => group.favorite)
          .map((group) => group.id),
      );
      setStoredReactions(() => {
        const next: Record<string, UserReaction> = {};

        for (const post of postResponse.posts) {
          if (post.viewerReaction) {
            next[feedbackTargetKey({ postId: post.id, type: "post" })] =
              post.viewerReaction;
          }
        }

        for (const group of groupResponse.groups) {
          for (const episode of group.episodes) {
            if (episode.viewerReaction) {
              next[
                feedbackTargetKey({
                  episodeId: episode.id,
                  groupId: group.id,
                  type: "episode",
                })
              ] = episode.viewerReaction;
            }
          }
        }

        return next;
      });

      const selectedGroupStillExists = groupResponse.groups.some(
        (group) => group.id === selectedGroupId,
      );

      if (!selectedGroupStillExists && groupResponse.groups[0]) {
        setSelectedGroupId(groupResponse.groups[0].id);
        setSelectedEpisodeId(groupResponse.groups[0].episodes[0]?.id ?? "");
      }
    } catch (error) {
      console.error("Failed to load API data", error);
    }
  }, [selectedGroupId]);

  const refreshNotifications = useCallback(async () => {
    if (!loggedIn) {
      setServerNotifications([]);
      return;
    }

    try {
      const response = await getNotifications(30);
      setServerNotifications(response.notifications);
      setNotificationsRead(response.unread === 0);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  }, [loggedIn]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshPublicData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, refreshPublicData]);

  useEffect(() => {
    const token = window.localStorage.getItem(
      runtimeConfig.authTokenStorageKey,
    );

    if (!token) {
      const timeout = window.setTimeout(() => setLoggedIn(false), 0);
      return () => window.clearTimeout(timeout);
    }

    const timeout = window.setTimeout(() => {
      void getMe()
        .then(({ user }) => {
          setCurrentUser(user.username);
          setLoggedIn(true);
        })
        .catch(() => {
          window.localStorage.removeItem(runtimeConfig.authTokenStorageKey);
          setLoggedIn(false);
        });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshNotifications();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshNotifications]);

  useEffect(() => {
    if (!viewedPostId) {
      viewedPostIdRef.current = null;
      return;
    }

    if (viewedPostIdRef.current === viewedPostId) return;

    viewedPostIdRef.current = viewedPostId;

    void getPost(viewedPostId)
      .then(({ post }) => {
        viewedPostCountsRef.current[post.id] = post.views;
        setPostItems((current) => {
          const exists = current.some((item) => item.id === post.id);

          if (!exists) return [post, ...current];

          return current.map((item) => (item.id === post.id ? post : item));
        });
        setStoredReactions((current) => ({
          ...current,
          [feedbackTargetKey({ postId: post.id, type: "post" })]:
            post.viewerReaction ?? null,
        }));
      })
      .catch((error) => {
        console.error("Failed to load post detail", error);
      });
  }, [viewedPostId]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [notificationsOpen]);

  useEffect(() => {
    const element = categoryTabsRef.current;
    if (element) element.scrollLeft = 0;

    const frame = window.requestAnimationFrame(updateCategoryScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [activePage, meta.tabs.length, updateCategoryScrollState]);

  useEffect(() => {
    window.addEventListener("resize", updateCategoryScrollState);
    return () =>
      window.removeEventListener("resize", updateCategoryScrollState);
  }, [updateCategoryScrollState]);

  const handleGroupChange = (groupId: string) => {
    const group =
      groupItems.find((item) => item.id === groupId) ??
      groupItems[0];
    if (!group) return;

    setSelectedGroupId(group.id);
    setSelectedEpisodeId(group.episodes[0]?.id ?? "");
  };

  const handleToggleFavoriteGroup = (groupId: string) => {
    setFavoriteGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((favoriteGroupId) => favoriteGroupId !== groupId)
        : [groupId, ...current],
    );
  };

  const openLearningGroup = (groupId: string) => {
    handleGroupChange(groupId);
    navigate(pagePaths.learning);
  };

  const openEpisodeDetail = (groupId: string, episodeId: string) => {
    setSelectedGroupId(groupId);
    setSelectedEpisodeId(episodeId);
    navigate(episodePath(groupId, episodeId));
  };

  const openPostDetail = (post: Post) => {
    navigate(postPath(post));
  };

  const handleReactionChange = (
    target: FeedbackTarget,
    nextReaction: UserReaction,
    counts: ReactionCounts,
  ) => {
    setStoredReactions((current) => ({
      ...current,
      [feedbackTargetKey(target)]: nextReaction,
    }));

    if (target.type === "post") {
      setPostItems((current) =>
        current.map((post) =>
          post.id === target.postId
            ? {
                ...post,
                dislikes: counts.dislikes,
                likes: counts.likes,
                viewerReaction: nextReaction,
              }
            : post,
        ),
      );
      return;
    }

    setGroupItems((current) =>
      current.map((group) =>
        group.id === target.groupId
          ? {
              ...group,
              episodes: group.episodes.map((episode) =>
                episode.id === target.episodeId
                  ? {
                      ...episode,
                      dislikes: counts.dislikes,
                      likes: counts.likes,
                      viewerReaction: nextReaction,
                    }
                  : episode,
              ),
            }
          : group,
      ),
    );
  };

  const handleSharePost = (post: Post) => {
    const url = new URL(postPath(post), window.location.origin).toString();

    void copyTextToClipboard(url)
      .then(() => {
        setCopiedPostId(post.id);
        toast.success("공유 URL이 복사되었습니다", {
          description: "원하는 곳에 붙여넣어 게시글을 공유할 수 있어요.",
          id: "post-share-copied",
        });

        if (shareResetTimerRef.current) {
          window.clearTimeout(shareResetTimerRef.current);
        }

        shareResetTimerRef.current = window.setTimeout(() => {
          setCopiedPostId(null);
        }, 2000);
      })
      .catch((error) => {
        console.error("Failed to copy post URL", error);
        toast.error("URL 복사에 실패했습니다", {
          description: "브라우저 권한을 확인한 뒤 다시 시도해 주세요.",
          id: "post-share-copy-failed",
        });
      });
  };

  const handlePostCreate = async (
    page: "community" | "qa",
    payload: Pick<
      Post,
      "board" | "category" | "excerpt" | "repo" | "tags" | "title"
    >,
  ) => {
    const response = await createPost({
      body: payload.excerpt,
      category: payload.category,
      excerpt: payload.excerpt,
      page,
      repo: payload.repo,
      tags: payload.tags,
      title: payload.title,
    });

    setPostItems((current) => [response.post, ...current]);
    navigate(postPath(response.post));
  };

  const handlePostUpdate = async (
    postId: number,
    updates: Pick<
      Post,
      "board" | "category" | "excerpt" | "repo" | "tags" | "title"
    >,
  ) => {
    const response = await updatePostRequest(postId, {
      body: updates.excerpt,
      category: updates.category,
      excerpt: updates.excerpt,
      repo: updates.repo,
      tags: updates.tags,
      title: updates.title,
    });

    setPostItems((current) =>
      current.map((post) => (post.id === postId ? response.post : post)),
    );

    return response.post;
  };

  const handlePostDelete = (post: Post) => {
    setConfirmDialog({
      confirmLabel: "삭제",
      description:
        "게시글을 삭제하면 작성한 내용과 댓글 흐름을 다시 확인할 수 없습니다. 정말 삭제하시겠습니까?",
      onConfirm: () => {
        void deletePostRequest(post.id).then(() => {
          setPostItems((current) =>
            current.filter((item) => item.id !== post.id),
          );
          setConfirmDialog(null);
          navigate(pagePaths[post.page]);
        });
      },
      title: "게시글 삭제",
    });
  };

  const handleToggleMenu = (key: "qa" | "community", checked: boolean) => {
    if (key === "qa") setShowQa(checked);
    if (key === "community") setShowCommunity(checked);
    if (
      (key === "qa" && !checked && activePage === "qa") ||
      (key === "community" && !checked && activePage === "community")
    ) {
      handlePageChange("learning");
    }
  };

  if (route.redirectTo && route.redirectTo !== location.pathname) {
    return <Navigate replace to={route.redirectTo} />;
  }

  if (!loggedIn && requiresLoginRoute) {
    return (
      <Navigate
        replace
        to={
          activePage === "qa" || activePage === "community"
            ? pagePaths[activePage]
            : pagePaths.learning
        }
      />
    );
  }

  return (
    <div
      className={
        isDarkTheme
          ? "community-shell theme-dark"
          : "community-shell theme-light"
      }
    >
      <Toaster
        className="app-sonner"
        closeButton
        duration={2400}
        mobileOffset={16}
        offset={24}
        position="bottom-center"
        theme={isDarkTheme ? "dark" : "light"}
        toastOptions={{
          className: "app-sonner-toast",
        }}
        visibleToasts={3}
      />
      <header className="site-header">
        <div className="header-inner">
          <button
            className="logo-button"
            type="button"
            onClick={() => handlePageChange("learning")}
          >
            <span className="logo-mark">
              <img className="brand-icon" src="/brand-icon.svg" alt="" />
            </span>
            <span>Explain Code</span>
          </button>

          <nav className="primary-nav" aria-label="주 메뉴">
            {visibleNavItems.map((item) => (
              <button
                aria-current={activePage === item.key ? "page" : undefined}
                className={
                  activePage === item.key ? "nav-link active" : "nav-link"
                }
                key={item.key}
                onClick={() => handlePageChange(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            aria-label="검색 열기"
            className="header-search"
            onClick={openGlobalSearch}
            title="검색"
            type="button"
          >
            <Search size={15} aria-hidden="true" />
            <span>검색</span>
          </button>

          <div className="header-actions">
            <button
              aria-label={
                isDarkTheme ? "라이트 모드로 전환" : "다크 모드로 전환"
              }
              aria-pressed={isDarkTheme}
              className={isDarkTheme ? "theme-toggle dark" : "theme-toggle"}
              onClick={toggleTheme}
              title={isDarkTheme ? "라이트 모드" : "다크 모드"}
              type="button"
            >
              <span className="theme-orbit" aria-hidden="true">
                <Sun className="theme-sun" size={16} />
                <Moon className="theme-moon" size={16} />
              </span>
            </button>
            <div className="notification-wrap" ref={notificationRef}>
              <button
                aria-expanded={notificationsOpen}
                aria-label={
                  loggedIn ? `알림 ${notificationItems.length}개` : "알림"
                }
                className={
                  notificationsOpen
                    ? "icon-button notification-trigger active"
                    : "icon-button notification-trigger"
                }
                onClick={toggleNotifications}
                type="button"
              >
                <Bell size={16} aria-hidden="true" />
                {loggedIn &&
                  !notificationsRead &&
                  notificationItems.length > 0 && (
                    <span className="notification-badge" aria-hidden="true" />
                  )}
              </button>
              {notificationsOpen && (
                <div
                  className="notification-popover"
                  role="dialog"
                  aria-label="알림"
                >
                  <div className="notification-head">
                    <strong>알림</strong>
                    <div className="notification-head-actions">
                      <span>
                        {loggedIn
                          ? `${notificationItems.length}개의 업데이트가 있습니다.`
                          : "로그인이 필요합니다."}
                      </span>
                      {loggedIn && (
                        <button
                          aria-label="모든 알림 읽음 처리"
                          className="notification-read-button"
                          disabled={
                            notificationsRead || notificationItems.length === 0
                          }
                          onClick={() => {
                            setNotificationsRead(true);
                            setServerNotifications([]);
                            setVisibleNotificationCount(6);
                            void markNotificationsRead()
                              .then(refreshNotifications)
                              .catch((error) => {
                                console.error(
                                  "Failed to mark notifications as read",
                                  error,
                                );
                              });
                          }}
                          title="모두 읽음"
                          type="button"
                        >
                          <CheckCheck size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {loggedIn ? (
                    <div
                      className="notification-list"
                      onScroll={handleNotificationScroll}
                    >
                      {visibleNotifications.map((notification) => (
                        <button
                          className={`notification-item ${notification.kind}`}
                          key={notification.id}
                          onClick={() => openNotification(notification)}
                          type="button"
                        >
                          <span className="notification-icon">
                            <NotificationKindIcon kind={notification.kind} />
                          </span>
                          <span className="notification-copy">
                            <strong>{notification.title}</strong>
                            <span>{notification.description}</span>
                            <em>{notification.time}</em>
                          </span>
                        </button>
                      ))}
                      {hasMoreNotifications && (
                        <div className="notification-loader" aria-hidden="true">
                          더 불러오는 중
                        </div>
                      )}
                      {notificationItems.length === 0 && (
                        <div className="notification-empty">
                          새 알림이 없습니다.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="notification-login-required">
                      <Bell size={18} aria-hidden="true" />
                      <strong>로그인 후 사용 가능한 기능입니다.</strong>
                      <span>
                        댓글, 조회수 마일스톤, API 토큰 만료 알림은 로그인 후
                        확인할 수 있습니다.
                      </span>
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          setLoginOpen(true);
                        }}
                        type="button"
                      >
                        로그인하기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="ghost-button"
              onClick={() => setLoginOpen(true)}
              type="button"
            >
              {loggedIn ? (
                <UserRound size={15} aria-hidden="true" />
              ) : (
                <LogIn size={15} aria-hidden="true" />
              )}
              <span>{loggedIn ? currentUser : "로그인"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page-wrap">
        <section className="popular-strip" aria-label="오늘의 인기글">
          <div className="popular-title">
            <Flame size={15} aria-hidden="true" />
            <strong>오늘의 인기글</strong>
          </div>
          <div className="popular-window">
            <div className="popular-track">
              {(rankedPopularPostPages.length > 0
                ? [...rankedPopularPostPages, rankedPopularPostPages[0]]
                : []
              ).map(
                (page, pageIndex) => (
                  <ol
                    aria-hidden={
                      pageIndex === rankedPopularPostPages.length
                        ? "true"
                        : undefined
                    }
                    className="popular-page"
                    key={`popular-page-${pageIndex}`}
                  >
                    {page.map((post, index) => {
                      const rank =
                        pageIndex === rankedPopularPostPages.length
                          ? index + 1
                          : pageIndex * 4 + index + 1;

                      return (
                        <li key={`${pageIndex}-${post.title}`}>
                          <span className="popular-rank">{rank}</span>
                          <button
                            onClick={() => navigate(post.to)}
                            tabIndex={
                              pageIndex === rankedPopularPostPages.length
                                ? -1
                                : undefined
                            }
                            type="button"
                          >
                            <span className="popular-kind">{post.kind}</span>
                            <span className="popular-post-title">
                              {post.title}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                ),
              )}
            </div>
          </div>
        </section>

        <div className={loggedIn ? "content-layout" : "content-layout no-rail"}>
          <section className="feed-panel">
            {detailView && (
              <>
                {detailView.type === "episode" &&
                  detailGroup &&
                  detailEpisode && (
                    <LearningDetail
                      episode={detailEpisode}
                      group={detailGroup}
                      loggedIn={loggedIn}
                      onBack={() => navigate(pagePaths.learning)}
                      onLoginRequired={() => setLoginOpen(true)}
                      onReactionChange={handleReactionChange}
                      target={{
                        episodeId: detailEpisode.id,
                        groupId: detailGroup.id,
                        type: "episode",
                      }}
                      viewerReaction={
                        storedReactions[
                          feedbackTargetKey({
                            episodeId: detailEpisode.id,
                            groupId: detailGroup.id,
                            type: "episode",
                          })
                        ] ??
                        detailEpisode.viewerReaction ??
                        null
                      }
                    />
                  )}
                {detailView.type === "post" && detailPost && (
                  <PostDetail
                    currentUser={currentUser}
                    loggedIn={loggedIn}
                    onBack={() => navigate(pagePaths[detailPost.page])}
                    onDelete={() => handlePostDelete(detailPost)}
                    onEdit={() => navigate(postEditPath(detailPost))}
                    onLoginRequired={() => setLoginOpen(true)}
                    onReactionChange={handleReactionChange}
                    post={detailPost}
                    target={{ postId: detailPost.id, type: "post" }}
                    viewerReaction={
                      storedReactions[
                        feedbackTargetKey({
                          postId: detailPost.id,
                          type: "post",
                        })
                      ] ??
                      detailPost.viewerReaction ??
                      null
                    }
                  />
                )}
                {detailView.type === "edit-post" && detailPost && (
                  <WritePostPage
                    key={`${detailPost.page}-${detailPost.id}-edit`}
                    groups={groupItems}
                    mode="edit"
                    onBack={() => navigate(postPath(detailPost))}
                    onSave={async (updates) => {
                      const updatedPost = await handlePostUpdate(
                        detailPost.id,
                        updates,
                      );
                      navigate(postPath(updatedPost));
                    }}
                    page={detailPost.page}
                    post={detailPost}
                  />
                )}
                {detailView.type === "write" && (
                  <WritePostPage
                    key={detailView.page}
                    groups={groupItems}
                    onBack={() => navigate(pagePaths[detailView.page])}
                    onSave={(payload) =>
                      handlePostCreate(detailView.page, payload)
                    }
                    page={detailView.page}
                  />
                )}
              </>
            )}

            {!detailView && (
              <>
                <div className="feed-header">
                  <div>
                    <span className="eyebrow">{meta.eyebrow}</span>
                    <h1>{meta.title}</h1>
                    <p>{meta.description}</p>
                  </div>
                  {loggedIn &&
                    (activePage === "qa" || activePage === "community") && (
                      <button
                        className="write-button secondary"
                        onClick={() => navigate(writePath(activePage))}
                        type="button"
                      >
                        <SquarePen size={15} aria-hidden="true" />
                        <span>새 글</span>
                      </button>
                    )}
                  {loggedIn && activePage === "learning" && (
                    <button
                      className="write-button secondary"
                      onClick={() => handlePageChange("integrations")}
                      type="button"
                    >
                      <Plug size={15} aria-hidden="true" />
                      <span>API 연동</span>
                    </button>
                  )}
                </div>

                {activeBoardKey && (
                  <div className="board-filter-panel">
                    <div
                      className="board-tools"
                      aria-label="게시글 검색과 정렬"
                    >
                      <div className="board-tool-select narrow">
                        <CustomSelect
                          label="검색 대상"
                          onChange={(value) => {
                            setSearchControls((current) => ({
                              ...current,
                              [activeBoardKey]: {
                                ...current[activeBoardKey],
                                field: value as SearchField,
                              },
                            }));
                            resetBoardPage(activeBoardKey);
                          }}
                          options={searchFieldOptions}
                          value={activeSearch.field}
                        />
                      </div>
                      <label className="board-search-input">
                        <Search size={14} aria-hidden="true" />
                        <input
                          onChange={(event) => {
                            setSearchControls((current) => ({
                              ...current,
                              [activeBoardKey]: {
                                ...current[activeBoardKey],
                                query: event.target.value,
                              },
                            }));
                            resetBoardPage(activeBoardKey);
                          }}
                          placeholder={
                            searchFieldPlaceholder[activeSearch.field]
                          }
                          value={activeSearch.query}
                        />
                      </label>
                      <div className="board-tool-select">
                        <CustomSelect
                          label="정렬"
                          onChange={(value) => {
                            setSortKeys((current) => ({
                              ...current,
                              [activeBoardKey]: value as SortKey,
                            }));
                            resetBoardPage(activeBoardKey);
                          }}
                          options={sortOptions}
                          value={activeSort}
                        />
                      </div>
                    </div>

                    <div className={categoryTabsShellClass}>
                      <div
                        className="category-tabs"
                        aria-label={`${meta.title} 카테고리`}
                        onScroll={updateCategoryScrollState}
                        ref={categoryTabsRef}
                      >
                        {meta.tabs.map((tab) => (
                          <button
                            className={activeTab === tab ? "selected" : ""}
                            key={tab}
                            onClick={() => {
                              setActiveTabs((current) => ({
                                ...current,
                                [activePage]: tab,
                              }));
                              if (activeBoardKey)
                                resetBoardPage(activeBoardKey);
                            }}
                            type="button"
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePage === "learning" && selectedGroup && selectedEpisode && (
                  <LearningSeries
                    groups={groupItems}
                    isFavoriteGroup={favoriteGroupIds.includes(
                      selectedGroup.id,
                    )}
                    loggedIn={loggedIn}
                    selectedEpisode={selectedEpisode}
                    selectedGroup={selectedGroup}
                    onEpisodeOpen={openEpisodeDetail}
                    onEpisodeSelect={setSelectedEpisodeId}
                    onFavoriteToggle={handleToggleFavoriteGroup}
                    onGroupChange={handleGroupChange}
                  />
                )}
                {activePage === "learning" && (!selectedGroup || !selectedEpisode) && (
                  <div className="post-empty">
                    <strong>등록된 학습 그룹이 없습니다.</strong>
                    <span>
                      백엔드를 실행한 뒤 Codex 또는 Claude Code 스킬로 학습
                      에피소드를 등록해주세요.
                    </span>
                  </div>
                )}

                {activePage === "integrations" && (
                  <IntegrationsPage
                    activeConnector={connector}
                    connector={connectorCopy[connector]}
                    groups={groupItems}
                    setConnector={setConnector}
                  />
                )}

                {(activePage === "qa" || activePage === "community") && (
                  <>
                    <div className="post-list">
                      {paginatedPosts.map((post) => (
                        <PostCard
                          key={post.id}
                          onOpen={openPostDetail}
                          onShare={handleSharePost}
                          post={post}
                          shared={copiedPostId === post.id}
                        />
                      ))}
                      {currentPosts.length === 0 && (
                        <div className="post-empty">
                          <strong>조건에 맞는 게시글이 없습니다.</strong>
                          <span>
                            카테고리, 검색어, 검색 대상을 다시 선택해보세요.
                          </span>
                        </div>
                      )}
                    </div>

                    {activeBoardKey && (
                      <div
                        className="post-pagination"
                        aria-label="게시글 페이지 이동"
                      >
                        <span>{paginationSummary}</span>
                        <div className="pagination-controls">
                          <button
                            disabled={activeBoardPage === 1}
                            onClick={() =>
                              setBoardPages((current) => ({
                                ...current,
                                [activeBoardKey]: Math.max(
                                  1,
                                  activeBoardPage - 1,
                                ),
                              }))
                            }
                            type="button"
                          >
                            이전
                          </button>
                          {paginationPages.map((page) => (
                            <button
                              aria-current={
                                activeBoardPage === page ? "page" : undefined
                              }
                              className={
                                activeBoardPage === page ? "selected" : ""
                              }
                              key={page}
                              onClick={() =>
                                setBoardPages((current) => ({
                                  ...current,
                                  [activeBoardKey]: page,
                                }))
                              }
                              type="button"
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            disabled={activeBoardPage === totalPostPages}
                            onClick={() =>
                              setBoardPages((current) => ({
                                ...current,
                                [activeBoardKey]: Math.min(
                                  totalPostPages,
                                  activeBoardPage + 1,
                                ),
                              }))
                            }
                            type="button"
                          >
                            다음
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {loggedIn && (
            <aside className="right-rail" aria-label="커뮤니티 보조 정보">
              <section className="side-card">
                <div className="side-card-title">
                  <Star size={15} aria-hidden="true" />
                  <strong>즐겨찾는 학습 그룹</strong>
                  <span>{favoriteGroups.length}</span>
                </div>
                <div className="repo-list">
                  {visibleFavoriteGroups.map((group) => (
                    <button
                      className={
                        selectedGroup?.id === group.id
                          ? "repo-item active"
                          : "repo-item"
                      }
                      key={group.id}
                      onClick={() => openLearningGroup(group.id)}
                      type="button"
                    >
                      <span className="repo-icon">
                        <Star size={14} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{group.name}</strong>
                        <small>{group.framework}</small>
                      </span>
                      <em>{group.episodes.length}편</em>
                    </button>
                  ))}
                  {favoriteGroups.length === 0 && (
                    <div className="repo-empty">
                      Project Group에서 별표를 눌러 추가하세요.
                    </div>
                  )}
                  {favoriteGroups.length > 3 && (
                    <button
                      className="repo-more-button"
                      onClick={() =>
                        setShowAllFavoriteGroups((current) => !current)
                      }
                      type="button"
                    >
                      {showAllFavoriteGroups
                        ? "접기"
                        : `더 보기 ${favoriteGroups.length - 3}개`}
                    </button>
                  )}
                </div>
              </section>

              <section className="side-card">
                <div className="side-card-title">
                  <UserRound size={15} aria-hidden="true" />
                  <strong>나의 학습 그룹</strong>
                  <span>{myGroups.length}</span>
                </div>
                <div className="repo-list">
                  {visibleMyGroups.map((group) => (
                    <button
                      className={
                        selectedGroup?.id === group.id
                          ? "repo-item active"
                          : "repo-item"
                      }
                      key={group.id}
                      onClick={() => openLearningGroup(group.id)}
                      type="button"
                    >
                      <span className="repo-icon">
                        <GitBranch size={14} aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{group.name}</strong>
                        <small>{group.framework}</small>
                      </span>
                      <em>{group.episodes.length}편</em>
                    </button>
                  ))}
                  {myGroups.length === 0 && (
                    <div className="repo-empty">
                      아직 생성한 학습 그룹이 없습니다.
                    </div>
                  )}
                  {myGroups.length > 3 && (
                    <button
                      className="repo-more-button"
                      onClick={() => setShowAllMyGroups((current) => !current)}
                      type="button"
                    >
                      {showAllMyGroups
                        ? "접기"
                        : `더 보기 ${myGroups.length - 3}개`}
                    </button>
                  )}
                </div>
              </section>

              <section className="side-card">
                <div className="side-card-title">
                  <ListFilter size={15} aria-hidden="true" />
                  <strong>운영 옵션</strong>
                </div>
                <div className="option-list">
                  <label className="option-checkbox">
                    <input
                      checked={showQa}
                      onChange={(event) =>
                        handleToggleMenu("qa", event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="option-checkmark" aria-hidden="true" />
                    <span>Q&A 메뉴</span>
                  </label>
                  <label className="option-checkbox">
                    <input
                      checked={showCommunity}
                      onChange={(event) =>
                        handleToggleMenu("community", event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className="option-checkmark" aria-hidden="true" />
                    <span>커뮤니티 메뉴</span>
                  </label>
                </div>
              </section>

              <section className="side-card accent">
                <div className="side-card-title">
                  <ShieldCheck size={15} aria-hidden="true" />
                  <strong>자동 등록 흐름</strong>
                </div>
                <p>
                  AI 도구가 코드를 작성한 뒤 레포 그룹 키와 관리자 토큰으로
                  API를 호출하면 학습 에피소드가 추가됩니다.
                </p>
                <button
                  className="rail-button"
                  onClick={() => handlePageChange("integrations")}
                  type="button"
                >
                  <KeyRound size={14} aria-hidden="true" />
                  토큰 관리
                </button>
              </section>
            </aside>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-line">
              <span className="logo-mark" aria-hidden="true">
                <img className="brand-icon" src="/brand-icon.svg" alt="" />
              </span>
              <strong>Explain Code</strong>
            </div>
            <span>© 2026 Explain Code. Open Source.</span>
          </div>
          <div className="footer-info" aria-label="Project contact">
            <a className="footer-info-row" href="mailto:eaea7314@gmail.com">
              <span>Email Address</span>
              <strong>
                <Mail size={13} aria-hidden="true" />
                eaea7314@gmail.com
              </strong>
            </a>
            <a
              className="footer-info-row"
              href="https://github.com/dong7314"
              rel="noreferrer"
              target="_blank"
            >
              <span>GitHub ID</span>
              <strong>
                <GitBranch size={13} aria-hidden="true" />
                dong7314
              </strong>
            </a>
            <div className="footer-info-row muted">
              <span>GitHub Repository</span>
              <strong>To be added</strong>
            </div>
          </div>
        </div>
      </footer>

      {globalSearchOpen && (
        <GlobalSearchModal
          activeTab={globalSearchTab}
          counts={globalSearchCounts}
          draft={globalSearchDraft}
          onClearRecent={() => setRecentSearches([])}
          onClose={() => setGlobalSearchOpen(false)}
          onDraftChange={updateGlobalSearchDraft}
          onOpenResult={openGlobalSearchResult}
          onSubmit={submitGlobalSearch}
          onTabChange={setGlobalSearchTab}
          query={globalSearchQuery}
          recentSearches={recentSearches}
          results={activeGlobalSearchResults}
        />
      )}
      {loginOpen && (
        <LoginModal
          currentUser={currentUser}
          loggedIn={loggedIn}
          onClose={() => setLoginOpen(false)}
          onLogin={async (credentials) => {
            const response =
              credentials.mode === "signup"
                ? await signup({
                    password: credentials.password,
                    passwordConfirm: credentials.passwordConfirm ?? "",
                    username: credentials.username,
                  })
                : await login({
                    password: credentials.password,
                    username: credentials.username,
                  });

            window.localStorage.setItem(
              runtimeConfig.authTokenStorageKey,
              response.token,
            );
            setCurrentUser(response.user.username);
            setLoggedIn(true);
            setLoginOpen(false);
            await refreshPublicData();
            await refreshNotifications();
          }}
          onLogout={() => {
            window.localStorage.removeItem(runtimeConfig.authTokenStorageKey);
            setLoggedIn(false);
            setLoginOpen(false);
            setServerNotifications([]);
          }}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          description={confirmDialog.description}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
        />
      )}
    </div>
  );
}

function LearningSeries({
  groups,
  isFavoriteGroup,
  loggedIn,
  selectedGroup,
  selectedEpisode,
  onFavoriteToggle,
  onGroupChange,
  onEpisodeOpen,
  onEpisodeSelect,
}: {
  groups: LearningGroup[];
  isFavoriteGroup: boolean;
  loggedIn: boolean;
  selectedGroup: LearningGroup;
  selectedEpisode: Episode;
  onFavoriteToggle: (groupId: string) => void;
  onGroupChange: (groupId: string) => void;
  onEpisodeOpen: (groupId: string, episodeId: string) => void;
  onEpisodeSelect: (episodeId: string) => void;
}) {
  const [groupQuery, setGroupQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("전체");
  const [groupSort, setGroupSort] = useState<"recent" | "episodes" | "name">(
    "recent",
  );
  const [sortOpen, setSortOpen] = useState(false);
  const groupDirectoryRef = useRef<HTMLDivElement | null>(null);
  const episodeListRef = useRef<HTMLDivElement | null>(null);
  const groupFilterRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);
  const [groupFilterScrollState, setGroupFilterScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const [groupScrollState, setGroupScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const [episodeScrollState, setEpisodeScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const groupFilters = qnaCategoryTabs;
  const sortOptions: Array<{
    label: string;
    value: "recent" | "episodes" | "name";
  }> = [
    { label: "최근 업데이트순", value: "recent" },
    { label: "에피소드 많은 순", value: "episodes" },
    { label: "이름순", value: "name" },
  ];
  const selectedSortLabel =
    sortOptions.find((option) => option.value === groupSort)?.label ??
    sortOptions[0].label;

  const visibleGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    const matchesFilter = (group: LearningGroup) => {
      const text = [
        group.name,
        group.project,
        group.goal,
        group.explainTarget,
        group.framework,
        group.owner,
      ]
        .join(" ")
        .toLowerCase();

      if (groupFilter === "전체") return true;
      if (groupFilter === "프론트엔드") {
        return /프론트|frontend|react|angular|next|ui|화면|컴포넌트|hook|훅|canvas/.test(
          text,
        );
      }
      if (groupFilter === "백엔드") {
        return /백엔드|backend|nestjs|fastapi|api|서버|postgresql|redis|guard/.test(
          text,
        );
      }
      if (groupFilter === "데브옵스") {
        return /데브옵스|devops|ci|cd|pipeline|github actions|배포|토큰|token|admin/.test(
          text,
        );
      }
      if (groupFilter === "데이터/AI") {
        return /데이터|data|ai|검색|embedding|요약|리뷰|review|학습/.test(text);
      }
      if (groupFilter === "모바일")
        return /모바일|mobile|ios|android|react native/.test(text);
      return text.includes(groupFilter.toLowerCase());
    };

    return groups
      .filter((group) => {
        const text = [
          group.name,
          group.project,
          group.goal,
          group.explainTarget,
          group.framework,
          group.owner,
        ]
          .join(" ")
          .toLowerCase();

        return (!query || text.includes(query)) && matchesFilter(group);
      })
      .sort((a, b) => {
        if (groupSort === "episodes")
          return b.episodes.length - a.episodes.length;
        if (groupSort === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [groupFilter, groupQuery, groupSort, groups]);

  const updateScrollState = useCallback(
    (
      element: HTMLDivElement | null,
      setState: Dispatch<
        SetStateAction<{ canScrollDown: boolean; canScrollUp: boolean }>
      >,
    ) => {
      if (!element) {
        setState({ canScrollDown: false, canScrollUp: false });
        return;
      }

      const hasOverflow = element.scrollHeight > element.clientHeight + 1;
      const canScrollUp = hasOverflow && element.scrollTop > 1;
      const canScrollDown =
        hasOverflow &&
        element.scrollTop + element.clientHeight < element.scrollHeight - 1;

      setState((current) =>
        current.canScrollDown === canScrollDown &&
        current.canScrollUp === canScrollUp
          ? current
          : { canScrollDown, canScrollUp },
      );
    },
    [],
  );

  const updateGroupScrollState = useCallback(() => {
    updateScrollState(groupDirectoryRef.current, setGroupScrollState);
  }, [updateScrollState]);

  const updateEpisodeScrollState = useCallback(() => {
    updateScrollState(episodeListRef.current, setEpisodeScrollState);
  }, [updateScrollState]);

  const updateGroupFilterScrollState = useCallback(() => {
    const element = groupFilterRef.current;

    if (!element) {
      setGroupFilterScrollState({
        canScrollLeft: false,
        canScrollRight: false,
      });
      return;
    }

    const hasOverflow = element.scrollWidth > element.clientWidth + 1;
    const canScrollLeft = hasOverflow && element.scrollLeft > 1;
    const canScrollRight =
      hasOverflow &&
      element.scrollLeft + element.clientWidth < element.scrollWidth - 1;

    setGroupFilterScrollState((current) =>
      current.canScrollLeft === canScrollLeft &&
      current.canScrollRight === canScrollRight
        ? current
        : { canScrollLeft, canScrollRight },
    );
  }, []);

  useEffect(() => {
    const element = groupDirectoryRef.current;
    if (element) element.scrollTop = 0;

    const frame = window.requestAnimationFrame(updateGroupScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [
    groupFilter,
    groupQuery,
    groupSort,
    updateGroupScrollState,
    visibleGroups.length,
  ]);

  useEffect(() => {
    const element = episodeListRef.current;
    if (element) element.scrollTop = 0;

    const frame = window.requestAnimationFrame(updateEpisodeScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [
    selectedGroup.id,
    selectedGroup.episodes.length,
    updateEpisodeScrollState,
  ]);

  useEffect(() => {
    window.addEventListener("resize", updateGroupScrollState);
    window.addEventListener("resize", updateEpisodeScrollState);
    window.addEventListener("resize", updateGroupFilterScrollState);
    return () => {
      window.removeEventListener("resize", updateGroupScrollState);
      window.removeEventListener("resize", updateEpisodeScrollState);
      window.removeEventListener("resize", updateGroupFilterScrollState);
    };
  }, [
    updateEpisodeScrollState,
    updateGroupFilterScrollState,
    updateGroupScrollState,
  ]);

  useEffect(() => {
    const element = groupFilterRef.current;
    if (element) element.scrollLeft = 0;

    const frame = window.requestAnimationFrame(updateGroupFilterScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [groupFilters.length, updateGroupFilterScrollState]);

  useEffect(() => {
    const closeSortMenu = (event: MouseEvent) => {
      if (!sortDropdownRef.current?.contains(event.target as Node)) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSortMenu);
    return () => document.removeEventListener("mousedown", closeSortMenu);
  }, []);

  const episodeListShellClass = [
    "episode-list-shell",
    episodeScrollState.canScrollUp ? "has-top-fade" : "",
    episodeScrollState.canScrollDown ? "has-bottom-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const groupDirectoryShellClass = [
    "group-directory-shell",
    groupScrollState.canScrollUp ? "has-top-fade" : "",
    groupScrollState.canScrollDown ? "has-bottom-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const groupFilterShellClass = [
    "group-filter-shell",
    groupFilterScrollState.canScrollLeft ? "has-left-fade" : "",
    groupFilterScrollState.canScrollRight ? "has-right-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="learning-series">
      <section className="group-explorer" aria-label="프로젝트 그룹 탐색">
        <div className="group-explorer-head">
          <div>
            <span className="eyebrow">project groups</span>
            <strong>프로젝트 그룹 탐색</strong>
          </div>
          <span>
            {visibleGroups.length}개 그룹
            {visibleGroups.length !== groups.length &&
              ` / 전체 ${groups.length}개`}
          </span>
        </div>

        <div className="group-toolbar">
          <label className="group-search">
            <Search size={15} aria-hidden="true" />
            <input
              onChange={(event) => setGroupQuery(event.target.value)}
              placeholder="그룹명, 프레임워크, 작성자로 검색"
              value={groupQuery}
            />
          </label>
          <div
            className={sortOpen ? "group-sort open" : "group-sort"}
            ref={sortDropdownRef}
          >
            <ListFilter size={14} aria-hidden="true" />
            <button
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              className="group-sort-trigger"
              onClick={() => setSortOpen((current) => !current)}
              type="button"
            >
              <span>{selectedSortLabel}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {sortOpen && (
              <div
                className="group-sort-menu"
                role="listbox"
                aria-label="그룹 정렬"
              >
                {sortOptions.map((option) => (
                  <button
                    aria-selected={groupSort === option.value}
                    className={
                      groupSort === option.value
                        ? "group-sort-option active"
                        : "group-sort-option"
                    }
                    key={option.value}
                    onClick={() => {
                      setGroupSort(option.value);
                      setSortOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={groupFilterShellClass}>
          <div
            className="group-filter-row"
            aria-label="그룹 필터"
            onScroll={updateGroupFilterScrollState}
            ref={groupFilterRef}
          >
            {groupFilters.map((filter) => (
              <button
                className={groupFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setGroupFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className={groupDirectoryShellClass}>
          <div
            className="group-directory"
            onScroll={updateGroupScrollState}
            ref={groupDirectoryRef}
          >
            {visibleGroups.map((group) => (
              <button
                className={
                  selectedGroup.id === group.id
                    ? "group-option active"
                    : "group-option"
                }
                key={group.id}
                onClick={() => onGroupChange(group.id)}
                type="button"
              >
                <span className="group-option-icon">
                  <Folder
                    className="folder-closed"
                    size={15}
                    aria-hidden="true"
                  />
                  <FolderOpen
                    className="folder-open"
                    size={15}
                    aria-hidden="true"
                  />
                </span>
                <span className="group-option-copy">
                  <strong>{group.name}</strong>
                  <small>{group.project}</small>
                </span>
                <span className="group-option-meta">
                  <strong>{group.episodes.length}편</strong>
                  <small>{group.episodes[0]?.time ?? "-"}</small>
                </span>
              </button>
            ))}
            {visibleGroups.length === 0 && (
              <div className="group-empty">
                조건에 맞는 프로젝트 그룹이 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="series-detail">
        <div className="series-summary">
          <div className="series-summary-main">
            <div className="series-summary-top">
              <div className="series-summary-heading">
                <span className="eyebrow">project group</span>
                <h2>{selectedGroup.project}</h2>
              </div>
              {loggedIn && (
                <button
                  aria-label={
                    isFavoriteGroup ? "즐겨찾기 해제" : "즐겨찾기 추가"
                  }
                  aria-pressed={isFavoriteGroup}
                  className={
                    isFavoriteGroup
                      ? "favorite-toggle active"
                      : "favorite-toggle"
                  }
                  onClick={() => onFavoriteToggle(selectedGroup.id)}
                  type="button"
                >
                  <Star size={17} aria-hidden="true" />
                </button>
              )}
            </div>
            <p>{selectedGroup.goal}</p>
            <div className="series-meta-strip" aria-label="프로젝트 그룹 요약">
              <div className="series-meta-item">
                <UserRound size={15} aria-hidden="true" />
                <span>작성자</span>
                <strong>{selectedGroup.owner}</strong>
              </div>
              <div className="series-meta-item">
                <BookOpen size={15} aria-hidden="true" />
                <span>에피소드</span>
                <strong>{selectedGroup.episodes.length}편</strong>
              </div>
              <div className="series-meta-item">
                <Clock3 size={15} aria-hidden="true" />
                <span>최근 업데이트</span>
                <strong>{selectedGroup.episodes[0]?.time ?? "-"}</strong>
              </div>
            </div>
          </div>
          <dl className="series-facts">
            <div>
              <dt>그룹</dt>
              <dd>{selectedGroup.name}</dd>
            </div>
            <div>
              <dt>설명 대상</dt>
              <dd>{selectedGroup.explainTarget}</dd>
            </div>
            <div>
              <dt>프레임워크</dt>
              <dd>{selectedGroup.framework}</dd>
            </div>
          </dl>
        </div>

        <div className="episode-layout">
          <div className={episodeListShellClass}>
            <div
              className="episode-list"
              onScroll={updateEpisodeScrollState}
              ref={episodeListRef}
              aria-label={`${selectedGroup.name} 에피소드`}
            >
              {selectedGroup.episodes.map((episode, index) => (
                <button
                  className={
                    selectedEpisode.id === episode.id
                      ? "episode-item active"
                      : "episode-item"
                  }
                  key={episode.id}
                  onClick={() => onEpisodeSelect(episode.id)}
                  type="button"
                >
                  <span>
                    {String(selectedGroup.episodes.length - index).padStart(
                      2,
                      "0",
                    )}
                    편
                  </span>
                  <strong>{episode.title}</strong>
                  <small>
                    {episode.time} · 댓글 {episode.comments}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <article className="episode-article">
            <div className="post-board">
              <span>AI 자동 등록</span>
              <span className="solved">
                <BookMarked size={13} aria-hidden="true" />
                학습 에피소드
              </span>
            </div>
            <h3>{selectedEpisode.title}</h3>
            <p>{selectedEpisode.summary}</p>
            <button
              className="read-detail-button"
              onClick={() =>
                onEpisodeOpen(selectedGroup.id, selectedEpisode.id)
              }
              type="button"
            >
              상세 페이지에서 읽기
            </button>

            <div className="explain-block">
              <strong>코드를 작성한 흐름</strong>
              <ol>
                {selectedEpisode.flow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="tag-row">
              {selectedEpisode.concepts.map((concept) => (
                <span key={concept}>
                  <Hash size={12} aria-hidden="true" />
                  {concept}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function LearningDetail({
  episode,
  group,
  loggedIn,
  onBack,
  onLoginRequired,
  onReactionChange,
  target,
  viewerReaction,
}: {
  episode: Episode;
  group: LearningGroup;
  loggedIn: boolean;
  onBack: () => void;
  onLoginRequired: () => void;
  onReactionChange: (
    target: FeedbackTarget,
    nextReaction: UserReaction,
    counts: ReactionCounts,
  ) => void;
  target: FeedbackTarget;
  viewerReaction: UserReaction;
}) {
  const episodeDocument = getEpisodeDocument(episode, group);
  const markdownBlocks = episodeDocument.markdown
    ? parseMarkdownBlocks(episodeDocument.markdown)
    : [];

  return (
    <article className="detail-page learning-detail-page">
      <button className="back-button" onClick={onBack} type="button">
        <ArrowLeft size={15} aria-hidden="true" />
        목록으로
      </button>

      <header className="detail-hero">
        <div className="detail-heading-row">
          <div className="detail-heading-copy">
            <div className="post-board">
              <span>{group.name}</span>
              <span className="solved">
                <BookMarked size={13} aria-hidden="true" />
                AI 자동 등록
              </span>
            </div>
            <h1>{episode.title}</h1>
            <p>{episode.summary}</p>
            <div className="detail-author-line">
              <div className="author-bundle">
                <BookMarked size={15} aria-hidden="true" />
                <span>AI 자동 등록</span>
              </div>
              <div className="article-meta-bundle">
                <span>{episode.time}</span>
                <span>조회 {episode.views}</span>
              </div>
            </div>
            <div className="detail-learning-tags">
              <span>{group.project}</span>
              {group.framework.split(", ").map((framework) => (
                <span key={framework}>{framework}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="markdown-page" aria-label="AI 학습 상세 본문">
        <div className="md-callout">
          <BookOpen size={17} aria-hidden="true" />
          <div>
            <strong>이번 코드 흐름</strong>
            <span>{episodeDocument.overview}</span>
          </div>
        </div>

        {episodeDocument.diffSummary && (
          <p className="md-lead">{episodeDocument.diffSummary}</p>
        )}

        <h2>코드 작성 플로우</h2>
        <ol className="md-steps">
          {episode.flow.map((step) => (
            <li key={step}>
              <strong>{step}</strong>
              <span>
                AI가 변경한 diff를 읽을 때 이 단계가 어떤 파일과 상태를
                움직였는지 먼저 확인합니다.
              </span>
            </li>
          ))}
        </ol>

        {episodeDocument.files.length > 0 && (
          <>
            <h2>변경 파일</h2>
            <div className="md-file-list">
              {episodeDocument.files.map((file) => (
                <section className="md-file-card" key={file.path}>
                  <FileText size={16} aria-hidden="true" />
                  <div>
                    <strong>{file.path}</strong>
                    {file.summary && <p>{file.summary}</p>}
                  </div>
                  {file.changeType && (
                    <span>{changeTypeLabels[file.changeType]}</span>
                  )}
                </section>
              ))}
            </div>
          </>
        )}

        <h2>중요 코드</h2>
        <div className="md-code-stack">
          {episodeDocument.codeSnippets.map((snippet, index) => (
            <section
              className="md-code-block"
              key={`${snippet.title ?? snippet.language ?? "code"}-${index}`}
            >
              <div className="md-code-head">
                <span>
                  <Code2 size={15} aria-hidden="true" />
                  <strong>{snippet.title ?? `중요 코드 ${index + 1}`}</strong>
                </span>
                <em>{snippet.language ?? "text"}</em>
              </div>
              <CodeBlock code={snippet.code} language={snippet.language} />
              {snippet.description && (
                <p className="md-code-description">{snippet.description}</p>
              )}
            </section>
          ))}
        </div>

        {markdownBlocks.length > 0 && (
          <>
            <h2>추가 문서</h2>
            <div className="md-rendered">
              {markdownBlocks.map((block, index) => {
                if (block.type === "heading") {
                  return (
                    <h3
                      className={`md-rendered-heading level-${block.level}`}
                      key={`${block.type}-${index}`}
                    >
                      {block.text}
                    </h3>
                  );
                }

                if (block.type === "list") {
                  return (
                    <ul className="md-rendered-list" key={`${block.type}-${index}`}>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "quote") {
                  return <blockquote key={`${block.type}-${index}`}>{block.text}</blockquote>;
                }

                if (block.type === "code") {
                  return (
                    <CodeBlock
                      code={block.code}
                      key={`${block.type}-${index}`}
                      language={block.language}
                    />
                  );
                }

                return <p key={`${block.type}-${index}`}>{block.text}</p>;
              })}
            </div>
          </>
        )}

        <h2>프레임워크/라이브러리 문법</h2>
        <div className="md-concepts md-syntax-grid">
          {episodeDocument.syntaxNotes.map((note) => (
            <section key={note.name}>
              <h3>{note.name}</h3>
              <p>{note.description}</p>
              {note.example && (
                <CodeBlock
                  className="md-inline-code"
                  code={note.example}
                  language="ts"
                />
              )}
              {note.referenceUrl && (
                <a href={note.referenceUrl} rel="noreferrer" target="_blank">
                  참고 문서 열기
                </a>
              )}
            </section>
          ))}
        </div>
      </section>

      <FeedbackBar
        commentCount={episode.comments}
        dislikeCount={episode.dislikes}
        likeCount={episode.likes}
        loggedIn={loggedIn}
        onLoginRequired={onLoginRequired}
        onReactionChange={onReactionChange}
        target={target}
        viewerReaction={viewerReaction}
      />
    </article>
  );
}

function WritePostPage({
  groups,
  mode = "create",
  onBack,
  onSave,
  page,
  post,
}: {
  groups: LearningGroup[];
  mode?: "create" | "edit";
  onBack: () => void;
  onSave?: (
    updates: Pick<
      Post,
      "board" | "category" | "excerpt" | "repo" | "tags" | "title"
    >,
  ) => Promise<void | Post> | void;
  page: "qa" | "community";
  post?: Post;
}) {
  const initialCommunityCategory =
    post?.page === "community"
      ? post.category ||
        post.board.replace(/^커뮤니티\s*/, "") ||
        communityWriteCategories[0]
      : communityWriteCategories[0];
  const initialQaCategory =
    post?.page === "qa" ? post.category : qaWriteCategories[0];
  const [title, setTitle] = useState(post?.title ?? "");
  const [selectedGroup, setSelectedGroup] = useState(
    post?.repo ?? groups[0]?.name ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    initialCommunityCategory,
  );
  const [selectedQaCategory, setSelectedQaCategory] =
    useState(initialQaCategory);
  const [tagDraft, setTagDraft] = useState("");
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [body, setBody] = useState(post?.excerpt ?? "");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const pageLabel = page === "qa" ? "Q&A" : "커뮤니티";
  const boardLabel =
    mode === "edit"
      ? page === "qa"
        ? "질문 수정"
        : "커뮤니티 글 수정"
      : page === "qa"
        ? "질문 작성"
        : "커뮤니티 글쓰기";
  const categoryLabel = page === "qa" ? selectedQaCategory : selectedCategory;
  const groupOptions = groups.map((group) => ({
    description: group.project,
    label: group.name,
    value: group.name,
  }));
  const qaCategoryOptions = qaWriteCategories.map((category) => ({
    label: category,
    value: category,
  }));
  const communityCategoryOptions = communityWriteCategories.map((category) => ({
    label: category,
    value: category,
  }));

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (page !== "qa" || selectedGroup.trim().length > 0);
  const submitLabel = mode === "edit" ? "저장" : "등록";
  const addTag = (rawTag = tagDraft) => {
    const nextTag = rawTag.trim().replace(/^#/, "");

    if (!nextTag) return;

    setTags((current) =>
      current.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
        ? current
        : [...current, nextTag],
    );
    setTagDraft("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  };

  const requestCancelEdit = () => {
    if (mode !== "edit") {
      onBack();
      return;
    }

    setConfirmDialog({
      confirmLabel: "나가기",
      description:
        "게시글 수정 취소 시에 작성된 내용이 사라집니다. 아직 저장하지 않은 제목, 본문, 태그 변경사항은 복구할 수 없습니다.",
      onConfirm: () => {
        setConfirmDialog(null);
        onBack();
      },
      title: "게시글 수정 취소",
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const nextCategory = page === "qa" ? selectedQaCategory : selectedCategory;
    const nextPayload = {
      board:
        page === "qa"
          ? `Q&A ${selectedQaCategory}`
          : `커뮤니티 ${selectedCategory}`,
      category: nextCategory,
      excerpt: body.trim(),
      repo: page === "qa" ? selectedGroup : (post?.repo ?? ""),
      tags,
      title: title.trim(),
    };

    if (mode === "edit") {
      void onSave?.(nextPayload);
      return;
    }

    void onSave?.(nextPayload);
  };

  return (
    <article className="detail-page write-post-page">
      <button className="back-button" onClick={requestCancelEdit} type="button">
        <ArrowLeft size={15} aria-hidden="true" />
        {mode === "edit" ? "게시글로" : "목록으로"}
      </button>

      <header className="detail-hero write-hero">
        <div className="post-board">
          <span>{pageLabel}</span>
          <span className="solved">
            <SquarePen size={13} aria-hidden="true" />새 글
          </span>
        </div>
        <div className="detail-heading-copy">
          <h1>{boardLabel}</h1>
          <p>
            프로젝트 문맥, 막힌 지점, AI가 만든 코드에서 확인하고 싶은 부분을
            함께 남겨보세요.
          </p>
        </div>
      </header>

      <form
        className="write-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <label className="write-field">
          <span>제목</span>
          <input
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              page === "qa"
                ? "궁금한 점을 한 문장으로 적어주세요"
                : "공유할 이야기를 적어주세요"
            }
            value={title}
          />
        </label>

        <div
          className={
            page === "qa"
              ? "write-field-grid three-columns"
              : "write-field-grid"
          }
        >
          {page === "qa" ? (
            <>
              <CustomSelect
                label="카테고리"
                onChange={setSelectedQaCategory}
                options={qaCategoryOptions}
                value={selectedQaCategory}
              />
              <CustomSelect
                label="프로젝트 그룹"
                onChange={setSelectedGroup}
                options={groupOptions}
                searchPlaceholder="프로젝트 그룹 검색"
                searchable
                value={selectedGroup}
              />
            </>
          ) : (
            <CustomSelect
              label="카테고리"
              onChange={setSelectedCategory}
              options={communityCategoryOptions}
              value={selectedCategory}
            />
          )}

          <label className="write-field">
            <span>태그</span>
            <div className="tag-composer">
              <div className="tag-input-row">
                <Hash size={14} aria-hidden="true" />
                <input
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag();
                    }

                    if (
                      event.key === "Backspace" &&
                      !tagDraft &&
                      tags.length > 0
                    ) {
                      removeTag(tags[tags.length - 1]);
                    }
                  }}
                  placeholder="태그 입력 후 Enter"
                  value={tagDraft}
                />
              </div>
            </div>
          </label>
        </div>

        <label className="write-field">
          <span>본문</span>
          <textarea
            onChange={(event) => setBody(event.target.value)}
            placeholder="코드 흐름, 시도한 방법, 이해가 필요한 부분을 적어주세요."
            value={body}
          />
        </label>

        <div className="write-form-footer">
          <div className="write-form-summary">
            <span className="write-summary-item">
              <ListFilter size={14} aria-hidden="true" />
              <span>{categoryLabel}</span>
            </span>
            {page === "qa" && (
              <span className="write-summary-item">
                <GitBranch size={14} aria-hidden="true" />
                <span>{selectedGroup}</span>
              </span>
            )}
            {tags.length > 0 && (
              <div className="write-footer-tags" aria-label="입력된 태그">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    type="button"
                  >
                    <span># {tag}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {mode === "edit" ? (
            <div className="write-form-actions">
              <button
                className="ghost-button write-cancel-button"
                onClick={requestCancelEdit}
                type="button"
              >
                취소
              </button>
              <button
                className="write-button"
                disabled={!canSubmit}
                type="submit"
              >
                <Send size={14} aria-hidden="true" />
                {submitLabel}
              </button>
            </div>
          ) : (
            <button
              className="write-button"
              disabled={!canSubmit}
              type="submit"
            >
              <Send size={14} aria-hidden="true" />
              {submitLabel}
            </button>
          )}
        </div>
      </form>
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          description={confirmDialog.description}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
        />
      )}
    </article>
  );
}

type SelectOption = {
  description?: string;
  label: string;
  value: string;
};

function CustomSelect({
  label,
  onChange,
  options,
  searchable = false,
  searchPlaceholder = "검색",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.label, option.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    const closeSelect = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSelect);
    return () => document.removeEventListener("mousedown", closeSelect);
  }, []);

  return (
    <div className="write-field">
      <span>{label}</span>
      <div
        className={open ? "custom-select open" : "custom-select"}
        ref={selectRef}
      >
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          className="custom-select-trigger"
          onClick={() => {
            setOpen((current) => !current);
            setQuery("");
          }}
          type="button"
        >
          <span>
            <strong>{selectedOption.label}</strong>
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>

        {open && (
          <div className="custom-select-menu">
            {searchable && (
              <label className="custom-select-search">
                <Search size={14} aria-hidden="true" />
                <input
                  autoFocus
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  value={query}
                />
              </label>
            )}
            <div className="custom-select-options" role="listbox">
              {visibleOptions.map((option) => (
                <button
                  aria-selected={option.value === value}
                  className={
                    option.value === value
                      ? "custom-select-option selected"
                      : "custom-select-option"
                  }
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  role="option"
                  type="button"
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                </button>
              ))}
              {visibleOptions.length === 0 && (
                <div className="custom-select-empty">검색 결과가 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostDetail({
  currentUser,
  loggedIn,
  onBack,
  onDelete,
  onEdit,
  onLoginRequired,
  onReactionChange,
  post,
  target,
  viewerReaction,
}: {
  currentUser: string;
  loggedIn: boolean;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onLoginRequired: () => void;
  onReactionChange: (
    target: FeedbackTarget,
    nextReaction: UserReaction,
    counts: ReactionCounts,
  ) => void;
  post: Post;
  target: FeedbackTarget;
  viewerReaction: UserReaction;
}) {
  const isOwnPost = loggedIn && post.author === currentUser;

  return (
    <article className="detail-page">
      <div className="detail-topbar">
        <button className="back-button" onClick={onBack} type="button">
          <ArrowLeft size={15} aria-hidden="true" />
          목록으로
        </button>

        {isOwnPost && (
          <div className="owner-actions" aria-label="내 게시글 관리">
            <button
              className="owner-action-button"
              onClick={onEdit}
              type="button"
            >
              <SquarePen size={14} aria-hidden="true" />
              수정
            </button>
            <button
              className="owner-action-button danger"
              onClick={onDelete}
              type="button"
            >
              <Trash2 size={14} aria-hidden="true" />
              삭제
            </button>
          </div>
        )}
      </div>

      <header className="detail-hero">
        <div className="detail-heading-row">
          <div className="detail-heading-copy">
            <div className="post-board">
              <span>{post.board}</span>
              {post.solved && (
                <span className="solved">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  해결됨
                </span>
              )}
            </div>
            <h1>{post.title}</h1>
            <div className="detail-author-line">
              <div className="author-bundle">
                <UserRound size={15} aria-hidden="true" />
                <span>{post.author}</span>
              </div>
              <div className="article-meta-bundle">
                <span>{post.time}</span>
                <span>조회 {post.views}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="post-detail-body">
        <p>{post.excerpt}</p>
        <div className="tag-row">
          {post.tags.map((tag) => (
            <span key={tag}>
              <Hash size={12} aria-hidden="true" />
              {tag}
            </span>
          ))}
        </div>
      </section>

      <FeedbackBar
        commentCount={post.comments}
        dislikeCount={post.dislikes}
        likeCount={post.likes}
        loggedIn={loggedIn}
        onLoginRequired={onLoginRequired}
        onReactionChange={onReactionChange}
        target={target}
        viewerReaction={viewerReaction}
      />
    </article>
  );
}

function PostCard({
  onOpen,
  onShare,
  post,
  shared,
}: {
  onOpen: (post: Post) => void;
  onShare: (post: Post) => void;
  post: Post;
  shared: boolean;
}) {
  return (
    <article className="post-card">
      <div className="post-board">
        <span>{post.board}</span>
        {post.solved && (
          <span className="solved">
            <CheckCircle2 size={13} aria-hidden="true" />
            해결됨
          </span>
        )}
      </div>
      <button className="post-title" onClick={() => onOpen(post)} type="button">
        {post.title}
      </button>
      <p>{post.excerpt}</p>

      <div className="tag-row">
        {post.tags.map((tag) => (
          <span key={tag}>
            <Hash size={12} aria-hidden="true" />
            {tag}
          </span>
        ))}
      </div>

      <footer className="post-meta">
        <div className="author-line">
          <UserRound size={14} aria-hidden="true" />
          <span>{post.author}</span>
          <span>{post.time}</span>
          <span>{post.repo}</span>
        </div>
        <div className="post-stats">
          <span>
            <MessageSquare size={14} aria-hidden="true" />
            {post.comments}
          </span>
          <span>
            <Eye size={14} aria-hidden="true" />
            {post.views}
          </span>
          <button
            aria-label={shared ? "게시글 URL 복사됨" : "게시글 URL 복사"}
            className={shared ? "copied" : ""}
            onClick={(event) => {
              event.stopPropagation();
              onShare(post);
            }}
            title={shared ? "복사됨" : "URL 복사"}
            type="button"
          >
            <Share2 size={14} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </article>
  );
}

function FeedbackBar({
  commentCount,
  dislikeCount,
  likeCount,
  loggedIn,
  onLoginRequired,
  onReactionChange,
  target,
  viewerReaction,
}: {
  commentCount: number;
  dislikeCount: number;
  likeCount: number;
  loggedIn: boolean;
  onLoginRequired: () => void;
  onReactionChange: (
    target: FeedbackTarget,
    nextReaction: UserReaction,
    counts: ReactionCounts,
  ) => void;
  target: FeedbackTarget;
  viewerReaction: UserReaction;
}) {
  const [reaction, setReaction] = useState<UserReaction>(viewerReaction);
  const [comments, setComments] = useState<ThreadCommentItem[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({
    dislikes: dislikeCount,
    likes: likeCount,
  });
  const [draft, setDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(
    null,
  );
  const [replyDraft, setReplyDraft] = useState("");
  const [editingReply, setEditingReply] = useState<{
    commentId: number;
    replyId: number;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const targetKey = feedbackTargetKey(target);
  const targetType = target.type;
  const targetPostId = target.type === "post" ? target.postId : null;
  const targetGroupId = target.type === "episode" ? target.groupId : null;
  const targetEpisodeId = target.type === "episode" ? target.episodeId : null;

  const localCommentCount = comments.reduce(
    (sum, comment) => sum + 1 + comment.replies.length,
    0,
  );
  const displayedCommentCount = commentsLoaded
    ? localCommentCount
    : commentCount;

  const loadComments = useCallback(async () => {
    try {
      const response =
        targetType === "post"
          ? await getPostComments(Number(targetPostId))
          : await getEpisodeComments(String(targetGroupId), String(targetEpisodeId));

      setComments(response.comments);
      setCommentsLoaded(true);
    } catch (error) {
      console.error("Failed to load comments", error);
      setCommentsLoaded(true);
    }
  }, [targetEpisodeId, targetGroupId, targetPostId, targetType]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReaction(viewerReaction);
      setReactionCounts({ dislikes: dislikeCount, likes: likeCount });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [dislikeCount, likeCount, targetKey, viewerReaction]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCommentsLoaded(false);
      setComments([]);
      void loadComments();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadComments]);

  const handleReaction = (nextReaction: "like" | "dislike") => {
    if (!loggedIn) {
      onLoginRequired();
      return;
    }

    const nextValue = reaction === nextReaction ? null : nextReaction;

    setReaction(nextValue);
    void (
      target.type === "post"
        ? setPostReaction(target.postId, nextValue)
        : setEpisodeReaction(target.groupId, target.episodeId, nextValue)
    )
      .then((counts) => {
        setReactionCounts(counts);
        onReactionChange(target, nextValue, counts);
      })
      .catch((error) => {
        console.error("Failed to update reaction", error);
        setReaction(reaction);
      });
  };

  const addComment = () => {
    if (!loggedIn) {
      onLoginRequired();
      return;
    }

    const next = draft.trim();
    if (!next) return;
    void (
      target.type === "post"
        ? createPostComment(target.postId, { body: next })
        : createEpisodeComment(target.groupId, target.episodeId, { body: next })
    ).then(() => {
      setDraft("");
      void loadComments();
    });
  };

  const startReply = (commentId: number) => {
    if (!loggedIn) {
      onLoginRequired();
      return;
    }

    setReplyingCommentId(commentId);
    setReplyDraft("");
    setEditingCommentId(null);
    setEditingReply(null);
  };

  const cancelReply = () => {
    setReplyingCommentId(null);
    setReplyDraft("");
  };

  const addReply = (commentId: number) => {
    if (!loggedIn) {
      onLoginRequired();
      return;
    }

    const next = replyDraft.trim();
    if (!next) return;

    void (
      target.type === "post"
        ? createPostComment(target.postId, { body: next, parentId: commentId })
        : createEpisodeComment(target.groupId, target.episodeId, {
            body: next,
            parentId: commentId,
          })
    ).then(() => {
      cancelReply();
      void loadComments();
    });
  };

  const startEditComment = (comment: CommentItem) => {
    setEditingCommentId(comment.id);
    setEditingDraft(comment.body);
    setReplyingCommentId(null);
    setEditingReply(null);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingDraft("");
  };

  const startEditReply = (commentId: number, reply: CommentItem) => {
    setEditingReply({ commentId, replyId: reply.id });
    setEditingDraft(reply.body);
    setEditingCommentId(null);
    setReplyingCommentId(null);
  };

  const cancelEditReply = () => {
    setEditingReply(null);
    setEditingDraft("");
  };

  const saveEditComment = (commentId: number) => {
    const nextBody = editingDraft.trim();

    if (!nextBody) return;

    void updateCommentRequest(commentId, nextBody).then(() => {
      cancelEditComment();
      void loadComments();
    });
  };

  const saveEditReply = (replyId: number) => {
    const nextBody = editingDraft.trim();

    if (!nextBody) return;

    void updateCommentRequest(replyId, nextBody).then(() => {
      cancelEditReply();
      void loadComments();
    });
  };

  const deleteComment = (commentId: number) => {
    setConfirmDialog({
      confirmLabel: "삭제",
      description:
        "댓글을 삭제하면 작성한 내용을 다시 확인할 수 없습니다. 정말 삭제하시겠습니까?",
      onConfirm: () => {
        void deleteCommentRequest(commentId).then(() => {
          if (editingCommentId === commentId) cancelEditComment();
          if (replyingCommentId === commentId) cancelReply();
          if (editingReply?.commentId === commentId) cancelEditReply();
          setConfirmDialog(null);
          void loadComments();
        });
      },
      title: "댓글 삭제",
    });
  };

  const deleteReply = (commentId: number, replyId: number) => {
    setConfirmDialog({
      confirmLabel: "삭제",
      description:
        "답글을 삭제하면 작성한 내용을 다시 확인할 수 없습니다. 정말 삭제하시겠습니까?",
      onConfirm: () => {
        void deleteCommentRequest(replyId).then(() => {
          if (
            editingReply?.commentId === commentId &&
            editingReply.replyId === replyId
          ) {
            cancelEditReply();
          }
          setConfirmDialog(null);
          void loadComments();
        });
      },
      title: "답글 삭제",
    });
  };

  return (
    <div className="feedback-box">
      <div className="vote-panel" aria-label="게시글 반응">
        <button
          aria-disabled={!loggedIn}
          className={
            reaction === "like"
              ? "vote-button selected"
              : loggedIn
                ? "vote-button"
                : "vote-button locked"
          }
          onClick={() => handleReaction("like")}
          type="button"
        >
          <ThumbsUp size={14} aria-hidden="true" />
          <span>추천</span>
          <strong>{reactionCounts.likes}</strong>
        </button>
        <button
          aria-disabled={!loggedIn}
          className={
            reaction === "dislike"
              ? "vote-button selected danger"
              : loggedIn
                ? "vote-button"
                : "vote-button locked"
          }
          onClick={() => handleReaction("dislike")}
          type="button"
        >
          <ThumbsDown size={14} aria-hidden="true" />
          <span>비추천</span>
          <strong>{reactionCounts.dislikes}</strong>
        </button>
      </div>

      <section className="comment-section">
        <div className="comment-heading">
          <strong>댓글 {displayedCommentCount}</strong>
          <span>의견을 남겨 학습 흐름을 함께 다듬어보세요.</span>
        </div>

        {loggedIn ? (
          <div className="comment-compose">
            <div className="comment-avatar">
              <UserRound size={15} aria-hidden="true" />
            </div>
            <div className="comment-input-wrap">
              <textarea
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                    addComment();
                }}
                placeholder="댓글을 남겨보세요. Ctrl/⌘ + Enter로 등록"
                value={draft}
              />
            </div>
            <button
              className="comment-submit-button"
              onClick={addComment}
              type="button"
              aria-label="댓글 등록"
            >
              <Send size={14} aria-hidden="true" />
              등록
            </button>
          </div>
        ) : (
          <div className="comment-login-required">
            <UserRound size={16} aria-hidden="true" />
            <div>
              <strong>댓글은 로그인 이후 작성할 수 있습니다.</strong>
              <span>
                질문을 남기거나 학습 글에 의견을 더하려면 먼저 로그인해주세요.
              </span>
            </div>
            <button onClick={onLoginRequired} type="button">
              로그인
            </button>
          </div>
        )}

        <div className={comments.length > 0 ? "comment-list" : "comment-list empty"}>
          {comments.map((comment) => (
            <div className="comment-item" key={comment.id}>
              <div className="comment-avatar small">
                <UserRound size={13} aria-hidden="true" />
              </div>
              <div className="comment-content">
                <div className="comment-meta">
                  <div className="comment-meta-main">
                    <strong>{comment.author}</strong>
                    <span>{comment.time}</span>
                  </div>
                  {loggedIn && editingCommentId !== comment.id && (
                    <div className="comment-actions" aria-label="댓글 관리">
                      <button
                        onClick={() => startReply(comment.id)}
                        type="button"
                      >
                        답글
                      </button>
                      {comment.owned && (
                        <>
                          <button
                            onClick={() => startEditComment(comment)}
                            type="button"
                          >
                            수정
                          </button>
                          <button
                            className="danger"
                            onClick={() => deleteComment(comment.id)}
                            type="button"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <div className="comment-edit-compose">
                    <div className="comment-input-wrap">
                      <textarea
                        onChange={(event) =>
                          setEditingDraft(event.target.value)
                        }
                        value={editingDraft}
                      />
                    </div>
                    <div className="comment-edit-actions">
                      <button
                        className="comment-cancel-button"
                        onClick={cancelEditComment}
                        type="button"
                      >
                        취소
                      </button>
                      <button
                        className="comment-submit-button"
                        onClick={() => saveEditComment(comment.id)}
                        type="button"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{comment.body}</p>
                )}
                {comment.replies.length > 0 && (
                  <div className="reply-list">
                    {comment.replies.map((reply) => (
                      <div className="reply-item" key={reply.id}>
                        <div className="comment-avatar tiny">
                          <UserRound size={12} aria-hidden="true" />
                        </div>
                        <div className="comment-content">
                          <div className="comment-meta">
                            <div className="comment-meta-main">
                              <strong>{reply.author}</strong>
                              <span>{reply.time}</span>
                            </div>
                            {loggedIn &&
                              reply.owned &&
                              (editingReply?.commentId !== comment.id ||
                                editingReply.replyId !== reply.id) && (
                                <div
                                  className="comment-actions"
                                  aria-label="내 답글 관리"
                                >
                                  <button
                                    onClick={() =>
                                      startEditReply(comment.id, reply)
                                    }
                                    type="button"
                                  >
                                    수정
                                  </button>
                                  <button
                                    className="danger"
                                    onClick={() =>
                                      deleteReply(comment.id, reply.id)
                                    }
                                    type="button"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                          </div>
                          {editingReply?.commentId === comment.id &&
                          editingReply.replyId === reply.id ? (
                            <div className="comment-edit-compose">
                              <div className="comment-input-wrap">
                                <textarea
                                  onChange={(event) =>
                                    setEditingDraft(event.target.value)
                                  }
                                  value={editingDraft}
                                />
                              </div>
                              <div className="comment-edit-actions">
                                <button
                                  className="comment-cancel-button"
                                  onClick={cancelEditReply}
                                  type="button"
                                >
                                  취소
                                </button>
                                <button
                                  className="comment-submit-button"
                                  onClick={() => saveEditReply(reply.id)}
                                  type="button"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p>{reply.body}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {replyingCommentId === comment.id && (
                  <div className="reply-compose">
                    <div className="comment-avatar tiny">
                      <UserRound size={12} aria-hidden="true" />
                    </div>
                    <div className="comment-input-wrap">
                      <textarea
                        onChange={(event) => setReplyDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            (event.metaKey || event.ctrlKey) &&
                            event.key === "Enter"
                          ) {
                            addReply(comment.id);
                          }
                        }}
                        placeholder={`${comment.author}님에게 답글을 남겨보세요.`}
                        value={replyDraft}
                      />
                    </div>
                    <div className="comment-edit-actions">
                      <button
                        className="comment-cancel-button"
                        onClick={cancelReply}
                        type="button"
                      >
                        취소
                      </button>
                      <button
                        className="comment-submit-button"
                        onClick={() => addReply(comment.id)}
                        type="button"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          description={confirmDialog.description}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
        />
      )}
    </div>
  );
}

function IntegrationsPage({
  activeConnector,
  connector,
  groups,
  setConnector,
}: {
  activeConnector: Connector;
  connector: (typeof connectorCopy)[Connector];
  groups: LearningGroup[];
  setConnector: (connector: Connector) => void;
}) {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [logs, setLogs] = useState<ApiIntegrationLog[]>([]);
  const [stats, setStats] = useState<ApiIntegrationStats | null>(null);
  const [issuedPlainToken, setIssuedPlainToken] = useState("");
  const [expandedPayloadConnector, setExpandedPayloadConnector] =
    useState<Connector | null>(null);

  const refreshIntegrationData = useCallback(async () => {
    try {
      const [tokenResponse, logResponse] = await Promise.all([
        getApiTokens(),
        getIntegrationLogs(),
      ]);

      setTokens(tokenResponse.tokens);
      setLogs(logResponse.logs);
      setStats(logResponse.stats);
    } catch (error) {
      console.error("Failed to load integration data", error);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshIntegrationData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshIntegrationData]);

  const copyInstallCommand = () => {
    void navigator.clipboard?.writeText(connector.command);
  };

  const requestTokenReissue = () => {
    const currentToken = tokens.find((token) => !token.revokedAt);

    setConfirmDialog({
      confirmLabel: currentToken ? "재발급" : "발급",
      description:
        "API 토큰을 재발급하면 Claude Code 및 Codex에게 발급된 토큰 정보를 새 토큰으로 전달해서 업데이트해야 합니다.\n업데이트 전에는 자동 등록 호출이 실패할 수 있습니다. 계속 진행하시겠습니까?",
      onConfirm: () => {
        void (
          currentToken ? reissueApiToken(currentToken.id) : createApiToken()
        ).then((response) => {
          setIssuedPlainToken(response.plainToken);
          setConfirmDialog(null);
          void refreshIntegrationData();
        });
      },
      title: currentToken ? "API 토큰 재발급" : "API 토큰 발급",
    });
  };

  const activeToken = tokens.find((token) => !token.revokedAt) ?? tokens[0];
  const fallbackStats = useMemo<ApiIntegrationStats>(() => {
    const participantNames = new Set(
      groups.map((group) => group.owner).filter(Boolean),
    );

    return {
      callCount: logs.length,
      episodeCount: groups.reduce(
        (total, group) => total + group.episodes.length,
        0,
      ),
      groupCount: groups.length,
      participantCount: participantNames.size,
    };
  }, [groups, logs.length]);
  const integrationStats = stats ?? fallbackStats;
  const payloadExpanded = expandedPayloadConnector === activeConnector;

  return (
    <div className="integration-page">
      <section className="install-card">
        <div className="install-heading">
          <div>
            <span className="eyebrow">client setup</span>
            <h2>AI 도구가 학습 에피소드를 남기는 방식</h2>
          </div>
        </div>

        <div
          className="connector-tabs"
          role="tablist"
          aria-label="AI 도구 선택"
        >
          <button
            className={activeConnector === "codex" ? "selected" : ""}
            onClick={() => setConnector("codex")}
            type="button"
          >
            Codex
          </button>
          <button
            className={activeConnector === "claude" ? "selected" : ""}
            onClick={() => setConnector("claude")}
            type="button"
          >
            Claude Code
          </button>
        </div>

        <div className="command-box">
          <div className="command-box-head">
            <span>
              <TerminalSquare size={15} aria-hidden="true" />
              <strong>{connector.title}</strong>
            </span>
            <button
              aria-label={`${connector.title} 설치 명령 복사`}
              className="command-copy-button"
              onClick={copyInstallCommand}
              title="설치 명령 복사"
              type="button"
            >
              <Copy size={15} aria-hidden="true" />
            </button>
          </div>
          <code className="command-line">{connector.command}</code>
          <div
            className={
              payloadExpanded
                ? "payload-preview expanded"
                : "payload-preview"
            }
          >
            <code>{connector.payload}</code>
          </div>
          <button
            aria-expanded={payloadExpanded}
            className={
              payloadExpanded ? "payload-toggle expanded" : "payload-toggle"
            }
            onClick={() =>
              setExpandedPayloadConnector((current) =>
                current === activeConnector ? null : activeConnector,
              )
            }
            type="button"
          >
            <span>{payloadExpanded ? "예시 접기" : "payload 예시 전체 보기"}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="token-card">
        <div className="install-heading">
          <div>
            <span className="eyebrow">admin token</span>
            <h2>API 토큰</h2>
          </div>
        </div>

        <div className="token-row">
          <code>
            {issuedPlainToken || activeToken?.tokenPrefix || "발급된 토큰 없음"}
          </code>
          <span>{activeToken?.scopes.join(", ") || "read, write"}</span>
          <span>{activeToken ? "활성 토큰" : "토큰 발급 필요"}</span>
          <button onClick={requestTokenReissue} type="button">
            {activeToken ? "재발급" : "발급"}
          </button>
        </div>

        <div className="token-guide">
          <span>
            <BadgeHelp size={14} aria-hidden="true" />
            누구나 API를 호출하지 못하도록 관리자 로그인 후 토큰을 발급합니다.
          </span>
          <span>
            <NotebookTabs size={14} aria-hidden="true" />
            토큰은 레포 그룹 키와 함께 전달되어 같은 그룹에 학습 에피소드를
            누적합니다.
          </span>
        </div>
      </section>

      <section className="log-card">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div className="log-row" key={log.id}>
              <FileText size={15} aria-hidden="true" />
              <span>
                <strong>{log.episodeTitle || log.message}</strong>
                <small>{log.groupName || log.groupId || "알 수 없는 그룹"}</small>
              </span>
              <em>
                <Clock3 size={13} aria-hidden="true" />
                {log.time}
              </em>
            </div>
          ))
        ) : (
          <div className="log-empty">아직 기록된 API 호출 로그가 없습니다.</div>
        )}
      </section>

      <section className="metric-strip">
        <span>
          <BookOpen size={14} aria-hidden="true" />
          {formatMetricCount(integrationStats.episodeCount)} 에피소드
        </span>
        <span>
          <UsersRound size={14} aria-hidden="true" />
          {formatMetricCount(integrationStats.participantCount)} 참여자
        </span>
        <span>
          <Code2 size={14} aria-hidden="true" />
          {formatMetricCount(integrationStats.groupCount)} 레포 그룹
        </span>
        <span>
          <Zap size={14} aria-hidden="true" />
          {formatMetricCount(integrationStats.callCount)} 호출
        </span>
      </section>
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          description={confirmDialog.description}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
        />
      )}
    </div>
  );
}

function GlobalSearchModal({
  activeTab,
  counts,
  draft,
  onClearRecent,
  onClose,
  onDraftChange,
  onOpenResult,
  onSubmit,
  onTabChange,
  query,
  recentSearches,
  results,
}: {
  activeTab: GlobalSearchTab;
  counts: Record<GlobalSearchTab, number>;
  draft: string;
  onClearRecent: () => void;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onOpenResult: (href: string) => void;
  onSubmit: (query: string) => void;
  onTabChange: (tab: GlobalSearchTab) => void;
  query: string;
  recentSearches: string[];
  results: GlobalSearchResult[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultListRef = useRef<HTMLDivElement | null>(null);
  const [resultScrollState, setResultScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const hasQuery = draft.trim().length > 0 && query.trim().length > 0;
  const totalCount = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const resultListShellClass = [
    "search-result-list-shell",
    resultScrollState.canScrollUp ? "has-top-fade" : "",
    resultScrollState.canScrollDown ? "has-bottom-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const updateResultScrollState = useCallback(() => {
    const element = resultListRef.current;

    if (!element) {
      setResultScrollState({ canScrollDown: false, canScrollUp: false });
      return;
    }

    const hasOverflow = element.scrollHeight > element.clientHeight + 1;
    const canScrollUp = hasOverflow && element.scrollTop > 1;
    const canScrollDown =
      hasOverflow &&
      element.scrollTop + element.clientHeight < element.scrollHeight - 1;

    setResultScrollState((current) =>
      current.canScrollDown === canScrollDown &&
      current.canScrollUp === canScrollUp
        ? current
        : { canScrollDown, canScrollUp },
    );
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resultListRef.current) resultListRef.current.scrollTop = 0;

    const frame = window.requestAnimationFrame(updateResultScrollState);
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, query, results.length, updateResultScrollState]);

  const clearSearch = () => {
    onDraftChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className="search-modal-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-label="통합 검색"
        aria-labelledby="global-search-title"
        className="search-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="search-modal-head">
          <strong id="global-search-title">검색하기</strong>
          <button
            className="search-modal-close"
            onClick={onClose}
            type="button"
            aria-label="검색 닫기"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form
          className="search-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(draft);
          }}
        >
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="검색어"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit(event.currentTarget.value);
              }
            }}
            placeholder="검색어를 입력해 주세요."
            ref={inputRef}
            value={draft}
          />
          {draft.length > 0 && (
            <button
              aria-label="검색어 초기화"
              className="search-input-clear"
              onClick={clearSearch}
              onMouseDown={(event) => event.preventDefault()}
              title="검색어 초기화"
              type="button"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </form>

        {!hasQuery ? (
          <div className="search-discovery">
            <section className="search-discovery-section">
              <div className="search-section-head">
                <strong>최근 검색어</strong>
                {recentSearches.length > 0 && (
                  <button onClick={onClearRecent} type="button">
                    전체 삭제
                  </button>
                )}
              </div>
              <div className="search-chip-row">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => onSubmit(term)}
                    type="button"
                  >
                    {term}
                  </button>
                ))}
                {recentSearches.length === 0 && (
                  <span className="search-empty-text">
                    최근 검색어가 없습니다.
                  </span>
                )}
              </div>
            </section>

            <section className="search-discovery-section">
              <div className="search-section-head">
                <strong>인기 검색어</strong>
                <span>실시간 기준</span>
              </div>
              <ol className="search-popular-list">
                {popularSearchTerms.map((term, index) => (
                  <li key={term.label}>
                    <button onClick={() => onSubmit(term.label)} type="button">
                      <span>{index + 1}</span>
                      <strong>{term.label}</strong>
                      <em className={term.trend}>
                        {term.trend === "up"
                          ? "▲"
                          : term.trend === "down"
                            ? "▼"
                            : "-"}
                      </em>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : (
          <div className="search-results-view">
            <div className="search-results-head">
              <strong>"{query}" 검색 결과</strong>
              <span>전체 {totalCount}개</span>
            </div>

            <div
              className="search-result-tabs"
              role="tablist"
              aria-label="검색 결과 분류"
            >
              {globalSearchTabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.key}
                  className={activeTab === tab.key ? "active" : ""}
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span>{counts[tab.key]}</span>
                </button>
              ))}
            </div>

            <div className={resultListShellClass}>
              <div
                className="search-result-list"
                onScroll={updateResultScrollState}
                ref={resultListRef}
              >
                {results.map((result) => (
                  <button
                    className="search-result-card"
                    key={result.id}
                    onClick={() => onOpenResult(result.href)}
                    type="button"
                  >
                    <span className="search-result-meta">{result.meta}</span>
                    <strong>{result.title}</strong>
                    <p>{result.description}</p>
                    <span className="search-result-tags">
                      {result.tags.slice(0, 4).map((tag) => (
                        <em key={tag}># {tag}</em>
                      ))}
                    </span>
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="search-result-empty">
                    <strong>검색 결과가 없습니다.</strong>
                    <span>다른 키워드로 다시 검색해 보세요.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function LoginModal({
  currentUser,
  loggedIn,
  onClose,
  onLogin,
  onLogout,
}: {
  currentUser: string;
  loggedIn: boolean;
  onClose: () => void;
  onLogin: (credentials: {
    mode: "login" | "signup";
    password: string;
    passwordConfirm?: string;
    username: string;
  }) => Promise<void>;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("mirae.dev");
  const [password, setPassword] = useState("explain-code-demo");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";
  const title = loggedIn ? "로그인됨" : isSignup ? "회원가입" : "로그인";
  const description = loggedIn
    ? `현재 ${currentUser} 계정으로 접속 중입니다.`
    : isSignup
      ? "학습 글 작성과 댓글 참여에 사용할 계정을 만들어주세요."
      : "AI 학습 글 작성, 댓글, 관리자 토큰 발급은 로그인 후 사용할 수 있습니다.";
  const primaryLabel = isSignup ? "회원가입" : "로그인";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    if (isSignup && password !== passwordConfirm) {
      setAuthError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    void onLogin({
      mode,
      password,
      passwordConfirm,
      username,
    })
      .catch((error) => {
        setAuthError(
          error instanceof Error
            ? error.message
            : "로그인 처리 중 오류가 발생했습니다.",
        );
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <section
        className="login-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        aria-describedby="login-modal-description"
      >
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="닫기"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="login-modal-head">
          <span className="logo-mark">
            <img className="brand-icon" src="/brand-icon.svg" alt="" />
          </span>
          <div>
            <span className="login-eyebrow">Explain Code account</span>
            <h2 id="login-modal-title">{title}</h2>
          </div>
        </div>
        <p id="login-modal-description">{description}</p>

        {!loggedIn && (
          <>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>아이디</span>
                <div className="auth-input-wrap">
                  <UserRound size={16} aria-hidden="true" />
                  <input
                    autoComplete="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="아이디를 입력해 주세요."
                    type="text"
                    value={username}
                  />
                </div>
              </label>

              <label className="auth-field">
                <span>비밀번호</span>
                <div className="auth-input-wrap">
                  <KeyRound size={16} aria-hidden="true" />
                  <input
                    autoComplete={
                      isSignup ? "new-password" : "current-password"
                    }
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호"
                    type="password"
                    value={password}
                  />
                </div>
              </label>

              {isSignup && (
                <label className="auth-field">
                  <span>비밀번호 확인</span>
                  <div className="auth-input-wrap">
                    <KeyRound size={16} aria-hidden="true" />
                    <input
                      autoComplete="new-password"
                      onChange={(event) =>
                        setPasswordConfirm(event.target.value)
                      }
                      placeholder="비밀번호를 한 번 더 입력해 주세요."
                      type="password"
                      value={passwordConfirm}
                    />
                  </div>
                </label>
              )}

              {isSignup && (
                <p className="auth-helper">
                  아이디와 비밀번호만으로 빠르게 시작할 수 있습니다.
                </p>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              <button
                className="write-button auth-submit"
                disabled={submitting}
                type="submit"
              >
                <LogIn size={15} aria-hidden="true" />
                <span>{submitting ? "처리 중" : primaryLabel}</span>
              </button>
            </form>

            <div className="auth-links">
              <span>
                {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}
              </span>
              <button
                onClick={() => setMode(isSignup ? "login" : "signup")}
                type="button"
              >
                {isSignup ? "로그인하기" : "회원가입"}
              </button>
            </div>
          </>
        )}
        {loggedIn && (
          <>
            <div className="auth-account-card">
              <span>현재 계정</span>
              <strong>{currentUser}</strong>
              <p>댓글 작성과 API 토큰 관리 권한이 활성화되어 있습니다.</p>
            </div>
            <button
              className="ghost-button modal-action"
              onClick={onLogout}
              type="button"
            >
              로그아웃
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function ConfirmDialog({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        className="confirm-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="confirm-dialog-copy">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-cancel-button"
            onClick={onCancel}
            type="button"
          >
            취소
          </button>
          <button
            className="confirm-delete-button"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
