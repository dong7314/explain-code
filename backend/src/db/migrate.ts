import { pool } from "./pool.js";

const migration = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_groups (
  id text PRIMARY KEY,
  name text NOT NULL,
  project text NOT NULL,
  goal text NOT NULL,
  explain_target text NOT NULL,
  frameworks text[] NOT NULL DEFAULT '{}',
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  id text NOT NULL,
  group_id text NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  flow text[] NOT NULL DEFAULT '{}',
  concepts text[] NOT NULL DEFAULT '{}',
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'codex', 'claude', 'api')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  dislikes_count integer NOT NULL DEFAULT 0 CHECK (dislikes_count >= 0),
  comments_count integer NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, id)
);

CREATE TABLE IF NOT EXISTS posts (
  id serial PRIMARY KEY,
  page text NOT NULL CHECK (page IN ('qa', 'community')),
  board text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  repo text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  solved boolean NOT NULL DEFAULT false,
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  dislikes_count integer NOT NULL DEFAULT 0 CHECK (dislikes_count >= 0),
  comments_count integer NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id bigserial PRIMARY KEY,
  resource_type text NOT NULL CHECK (resource_type IN ('post', 'episode')),
  post_id integer REFERENCES posts(id) ON DELETE CASCADE,
  group_id text REFERENCES project_groups(id) ON DELETE CASCADE,
  episode_id text,
  parent_id bigint REFERENCES comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (resource_type = 'post' AND post_id IS NOT NULL AND group_id IS NULL AND episode_id IS NULL)
    OR
    (resource_type = 'episode' AND post_id IS NULL AND group_id IS NOT NULL AND episode_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS reactions (
  id bigserial PRIMARY KEY,
  resource_type text NOT NULL CHECK (resource_type IN ('post', 'episode', 'comment')),
  target_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, target_key, user_id)
);

CREATE TABLE IF NOT EXISTS content_views (
  id bigserial PRIMARY KEY,
  resource_type text NOT NULL CHECK (resource_type IN ('post', 'episode')),
  target_key text NOT NULL,
  viewer_key text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_type, target_key, viewer_key)
);

CREATE TABLE IF NOT EXISTS project_group_favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id text NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_prefix text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{read,write}',
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id bigserial PRIMARY KEY,
  connector text NOT NULL CHECK (connector IN ('codex', 'claude', 'api', 'manual')),
  group_id text REFERENCES project_groups(id) ON DELETE SET NULL,
  episode_id text,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('comment', 'learning', 'milestone', 'popular', 'token')),
  title text NOT NULL,
  description text NOT NULL,
  href text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_terms (
  normalized_term text PRIMARY KEY,
  term text NOT NULL,
  search_count integer NOT NULL DEFAULT 0 CHECK (search_count >= 0),
  rank_position integer,
  previous_rank_position integer,
  last_searched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS search_terms
  ADD COLUMN IF NOT EXISTS rank_position integer;

ALTER TABLE IF EXISTS search_terms
  ADD COLUMN IF NOT EXISTS previous_rank_position integer;

CREATE INDEX IF NOT EXISTS idx_project_groups_owner ON project_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_episodes_group ON episodes(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_page_created ON posts(page, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_episode ON comments(group_id, episode_id, parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(resource_type, target_key);
CREATE INDEX IF NOT EXISTS idx_content_views_target ON content_views(resource_type, target_key, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_popular ON search_terms(search_count DESC, last_searched_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'project_groups',
    'episodes',
    'posts',
    'comments',
    'reactions',
    'search_terms'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END $$;
`;

const run = async () => {
  await pool.query(migration);
  console.log("Database migration completed.");
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
