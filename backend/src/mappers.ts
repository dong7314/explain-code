import { timeAgo } from "./utils/time.js";

type UserRow = {
  displayName?: string;
  display_name?: string;
  id: string;
  role: string;
  username: string;
};

type GroupRow = {
  created_at: Date;
  explain_target: string;
  frameworks: string[];
  goal: string;
  id: string;
  name: string;
  owner_username: string | null;
  project: string;
  updated_at: Date;
};

type EpisodeRow = {
  body: unknown;
  comments_count: number;
  concepts: string[];
  created_at: Date;
  dislikes_count: number;
  flow: string[];
  group_id: string;
  id: string;
  likes_count: number;
  source: string;
  summary: string;
  title: string;
  updated_at: Date;
  viewer_reaction?: -1 | 1 | null;
  views_count: number;
};

type PostRow = {
  author_username: string | null;
  board: string;
  body: string;
  category: string;
  comments_count: number;
  created_at: Date;
  dislikes_count: number;
  excerpt: string;
  id: number;
  likes_count: number;
  page: "community" | "qa";
  repo: string;
  solved: boolean;
  tags: string[];
  title: string;
  updated_at: Date;
  viewer_reaction?: -1 | 1 | null;
  views_count: number;
};

type CommentRow = {
  author_username: string;
  body: string;
  created_at: Date;
  deleted_at: Date | null;
  id: string;
  owned?: boolean;
  parent_id: string | null;
  updated_at: Date;
};

type CommentTreeItem = {
  author: string;
  body: string;
  id: number;
  owned: boolean;
  replies: Array<Omit<CommentTreeItem, "replies">>;
  time: string;
};

export const mapUser = (row: UserRow) => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name ?? row.displayName ?? row.username,
  role: row.role,
});

const mapViewerReaction = (value: unknown) => {
  if (value === 1) return "like";
  if (value === -1) return "dislike";
  return null;
};

export const mapGroup = (row: any) => ({
  id: row.id,
  name: row.name,
  project: row.project,
  goal: row.goal,
  explainTarget: row.explain_target,
  frameworks: row.frameworks,
  framework: row.frameworks.join(", "),
  owner: row.owner_username ?? "unknown",
  time: timeAgo(row.updated_at),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapEpisode = (row: any) => ({
  id: row.id,
  groupId: row.group_id,
  title: row.title,
  summary: row.summary,
  flow: row.flow,
  concepts: row.concepts,
  body: row.body,
  source: row.source,
  time: timeAgo(row.created_at),
  likes: row.likes_count,
  dislikes: row.dislikes_count,
  comments: row.comments_count,
  views: row.views_count,
  viewerReaction: mapViewerReaction(row.viewer_reaction),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapPost = (row: any) => ({
  id: row.id,
  page: row.page,
  board: row.board,
  category: row.category,
  title: row.title,
  excerpt: row.excerpt,
  body: row.body,
  author: row.author_username ?? "unknown",
  repo: row.repo,
  time: timeAgo(row.created_at),
  comments: row.comments_count,
  likes: row.likes_count,
  dislikes: row.dislikes_count,
  views: row.views_count,
  tags: row.tags,
  solved: row.solved,
  viewerReaction: mapViewerReaction(row.viewer_reaction),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapCommentTree = (
  rows: any[],
  currentUserId: string | undefined,
) => {
  const byId = new Map<string, CommentTreeItem>();
  const roots: CommentTreeItem[] = [];

  for (const row of rows) {
    if (row.deleted_at) continue;

    const item = {
      id: Number(row.id),
      author: row.author_username,
      body: row.body,
      owned: Boolean(currentUserId && row.owned),
      time: timeAgo(row.created_at),
      replies: [],
    };

    if (!row.parent_id) {
      byId.set(row.id, item);
      roots.push(item);
    } else {
      byId.get(row.parent_id)?.replies.push(item);
    }
  }

  return roots;
};
