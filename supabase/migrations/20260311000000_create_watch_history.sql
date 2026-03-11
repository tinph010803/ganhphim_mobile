/*
  # Create watch_history table
  Lưu tiến trình xem phim theo từng user, đồng bộ đa thiết bị qua Supabase.
  user_id là ID từ hệ thống auth riêng (gtavn), không phải Supabase auth.
*/

CREATE TABLE IF NOT EXISTS watch_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text NOT NULL,
  movie_id     text NOT NULL,
  movie_slug   text NOT NULL,
  movie_title  text NOT NULL DEFAULT '',
  poster_url   text NOT NULL DEFAULT '',
  episode_name text NOT NULL DEFAULT '',
  server_label text NOT NULL DEFAULT '',
  time         numeric NOT NULL DEFAULT 0,
  duration     numeric NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id, episode_name)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user
  ON watch_history (user_id, updated_at DESC);

ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access watch_history"
  ON watch_history FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
