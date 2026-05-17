import { apiRequest } from "./http";

export type AuthUser = {
  displayName: string;
  id: string;
  role: "admin" | "member";
  username: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ApiEpisodeFile =
  | string
  | {
      changeType?: "added" | "modified" | "removed" | "renamed";
      path: string;
      summary?: string;
    };

export type ApiEpisodeCodeSnippet = {
  code: string;
  description?: string;
  language?: string;
  title?: string;
};

export type ApiEpisodeSyntaxNote = {
  description: string;
  example?: string;
  name: string;
  referenceUrl?: string;
};

export type ApiEpisodeBody = {
  codeSnippets?: ApiEpisodeCodeSnippet[];
  diffSummary?: string;
  files?: ApiEpisodeFile[];
  markdown?: string;
  overview?: string;
  sessionId?: string;
  syntaxNotes?: ApiEpisodeSyntaxNote[];
};

export type ApiEpisode = {
  body?: ApiEpisodeBody;
  comments: number;
  concepts: string[];
  dislikes: number;
  flow: string[];
  groupId: string;
  id: string;
  likes: number;
  source?: string;
  summary: string;
  time: string;
  title: string;
  viewerReaction?: "dislike" | "like" | null;
  views: number;
};

export type ApiLearningGroup = {
  episodeCount?: number;
  episodes: ApiEpisode[];
  explainTarget: string;
  favorite?: boolean;
  framework: string;
  frameworks: string[];
  goal: string;
  id: string;
  name: string;
  owner: string;
  project: string;
  time?: string;
};

export type ApiPost = {
  author: string;
  board: string;
  body?: string;
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
  time: string;
  title: string;
  viewerReaction?: "dislike" | "like" | null;
  views: number;
};

export type ApiComment = {
  author: string;
  body: string;
  id: number;
  owned: boolean;
  replies: Array<Omit<ApiComment, "replies">>;
  time: string;
};

export type ApiNotification = {
  description: string;
  href: string;
  id: string;
  kind: "comment" | "learning" | "milestone" | "popular" | "token";
  read: boolean;
  time: string;
  title: string;
};

export type ApiSearchResult = {
  description: string;
  href: string;
  id: string;
  meta: string;
  tab: "community" | "learning" | "qa";
  tags: string[];
  title: string;
};

export type ApiTokenItem = {
  createdAt: string;
  expiresAt: string;
  id: string;
  lastUsedAt: string | null;
  name: string;
  revokedAt: string | null;
  scopes: string[];
  tokenPrefix: string;
};

export type ApiIntegrationLog = {
  connector: string;
  episodeId: string | null;
  episodeTitle?: string | null;
  groupId: string | null;
  groupName?: string | null;
  id: number;
  message: string;
  status: "failed" | "success";
  time: string;
};

export type ApiIntegrationStats = {
  callCount: number;
  episodeCount: number;
  groupCount: number;
  participantCount: number;
};

export type PostPayload = {
  body: string;
  category: string;
  excerpt?: string;
  page: "community" | "qa";
  repo: string;
  solved?: boolean;
  tags: string[];
  title: string;
};

export const login = (credentials: { password: string; username: string }) =>
  apiRequest<AuthResponse>("/auth/login", {
    body: JSON.stringify(credentials),
    method: "POST",
  });

export const signup = (credentials: {
  password: string;
  passwordConfirm: string;
  username: string;
}) =>
  apiRequest<AuthResponse>("/auth/signup", {
    body: JSON.stringify(credentials),
    method: "POST",
  });

export const getMe = () => apiRequest<{ user: AuthUser }>("/auth/me");

export const getProjectGroups = () =>
  apiRequest<{ groups: ApiLearningGroup[] }>("/project-groups");

export const getPosts = () =>
  apiRequest<{ posts: ApiPost[] }>("/posts?pageSize=50");

export const getPost = (postId: number) =>
  apiRequest<{ post: ApiPost }>(`/posts/${postId}`);

export const createPost = (payload: PostPayload) =>
  apiRequest<{ post: ApiPost }>("/posts", {
    body: JSON.stringify(payload),
    method: "POST",
  });

export const updatePost = (postId: number, payload: Partial<PostPayload>) =>
  apiRequest<{ post: ApiPost }>(`/posts/${postId}`, {
    body: JSON.stringify(payload),
    method: "PATCH",
  });

export const deletePost = (postId: number) =>
  apiRequest<void>(`/posts/${postId}`, { method: "DELETE" });

export const getPostComments = (postId: number) =>
  apiRequest<{ comments: ApiComment[] }>(`/posts/${postId}/comments`);

export const createPostComment = (
  postId: number,
  payload: { body: string; parentId?: number },
) =>
  apiRequest<{ comment: { id: string } }>(`/posts/${postId}/comments`, {
    body: JSON.stringify(payload),
    method: "POST",
  });

export const getEpisodeComments = (groupId: string, episodeId: string) =>
  apiRequest<{ comments: ApiComment[] }>(
    `/project-groups/${groupId}/episodes/${episodeId}/comments`,
  );

export const createEpisodeComment = (
  groupId: string,
  episodeId: string,
  payload: { body: string; parentId?: number },
) =>
  apiRequest<{ comment: { id: string } }>(
    `/project-groups/${groupId}/episodes/${episodeId}/comments`,
    {
      body: JSON.stringify(payload),
      method: "POST",
    },
  );

export const updateComment = (commentId: number, body: string) =>
  apiRequest<{ comment: { id: string } }>(`/comments/${commentId}`, {
    body: JSON.stringify({ body }),
    method: "PATCH",
  });

export const deleteComment = (commentId: number) =>
  apiRequest<void>(`/comments/${commentId}`, { method: "DELETE" });

export const setPostReaction = (
  postId: number,
  value: "dislike" | "like" | null,
) =>
  apiRequest<{ dislikes: number; likes: number }>(`/posts/${postId}/reaction`, {
    body: JSON.stringify({ value }),
    method: "PUT",
  });

export const setEpisodeReaction = (
  groupId: string,
  episodeId: string,
  value: "dislike" | "like" | null,
) =>
  apiRequest<{ dislikes: number; likes: number }>(
    `/project-groups/${groupId}/episodes/${episodeId}/reaction`,
    {
      body: JSON.stringify({ value }),
      method: "PUT",
    },
  );

export const searchAll = (query: string) =>
  apiRequest<{
    counts: Record<"community" | "learning" | "qa", number>;
    results: ApiSearchResult[];
  }>(`/search?q=${encodeURIComponent(query)}`);

export const getNotifications = (limit = 30) =>
  apiRequest<{
    hasMore: boolean;
    notifications: ApiNotification[];
    total: number;
    unread: number;
  }>(`/notifications?limit=${limit}`);

export const markNotificationsRead = () =>
  apiRequest<void>("/notifications/read-all", { method: "PATCH" });

export const markNotificationRead = (notificationId: string) =>
  apiRequest<void>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });

export const getApiTokens = () =>
  apiRequest<{ tokens: ApiTokenItem[] }>("/api-tokens");

export const createApiToken = () =>
  apiRequest<{ plainToken: string; token: ApiTokenItem }>("/api-tokens", {
    body: JSON.stringify({
      expiresInDays: 24,
      name: "관리자 API 토큰",
      scopes: ["read", "write"],
    }),
    method: "POST",
  });

export const reissueApiToken = (tokenId: string) =>
  apiRequest<{ plainToken: string; token: ApiTokenItem }>(
    `/api-tokens/${tokenId}/reissue`,
    { method: "POST" },
  );

export const getIntegrationLogs = () =>
  apiRequest<{ logs: ApiIntegrationLog[]; stats: ApiIntegrationStats }>(
    "/integration-logs?limit=10",
  );
