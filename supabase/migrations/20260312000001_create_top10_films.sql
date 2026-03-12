/*
  # Create Top 10 Single Films Table
  Lưu danh sách slug của Top 10 Phim Lẻ do admin chọn.
  Nếu bảng rỗng → home screen tự fallback về 10 phim lẻ mới nhất từ API.
*/

CREATE TABLE IF NOT EXISTS top10_films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE top10_films ENABLE ROW LEVEL SECURITY;

-- Tất cả mọi người đều đọc được
CREATE POLICY "Public read top10_films"
  ON top10_films FOR SELECT
  USING (true);

-- Cho phép ghi qua anon key (kiểm soát admin phía app)
CREATE POLICY "Anon write top10_films"
  ON top10_films FOR ALL
  USING (true)
  WITH CHECK (true);
