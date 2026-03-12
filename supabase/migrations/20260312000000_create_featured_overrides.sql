/*
  # Create Featured Overrides Table
  Lưu danh sách phim nổi bật (banner carousel) với ảnh tùy chỉnh.
  Admin có thể chỉnh trong app, dữ liệu được đồng bộ lên Supabase.
*/

CREATE TABLE IF NOT EXISTS featured_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  bg text,
  character_url text,
  title_img text,
  char_w numeric,
  char_h numeric,
  char_right numeric,
  char_bottom numeric,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE featured_overrides ENABLE ROW LEVEL SECURITY;

-- Tất cả mọi người đều đọc được
CREATE POLICY "Public read featured_overrides"
  ON featured_overrides FOR SELECT
  USING (true);

-- Cho phép ghi qua anon key (kiểm soát admin phía app)
CREATE POLICY "Anon write featured_overrides"
  ON featured_overrides FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed dữ liệu mặc định
INSERT INTO featured_overrides (slug, bg, character_url, title_img, char_w, char_h, char_right, char_bottom, sort_order)
VALUES
  (
    'nghe-thuat-lua-doi-cua-sarah',
    'https://sf-static.onflixcdn.pics/images/pic/1771002086_bg_%20Sarah_onflix.webp',
    'https://sf-static.onflixcdn.pics/images/pic/1770999672_Sarah_onflix.webp',
    'https://sf-static.onflixcdn.pics/images/pic/1770999603_url.webp',
    NULL, NULL, NULL, NULL, 0
  ),
  (
    'bui-hoa-hong',
    'https://pics.ibytecdn.org/images/pic/1772315778_bg-bui-hoa-hong.webp',
    'https://pics.ibytecdn.org/images/pic/1772316152_bui-hoa-hong-onflix.webp',
    'https://pics.ibytecdn.org/images/pic/1772315871_url.webp',
    0.72, 1.05, -20, 0, 1
  ),
  (
    'tieng-yeu-nay-anh-dich-duoc-khong',
    'https://pics.ibytecdn.org/images/pic/1770748620_bg_tynaddk_onflix.png',
    'https://pics.ibytecdn.org/images/pic/1770748579_tynaddk_onflix.webp',
    'https://occ-0-325-395.1.nflxso.net/dnm/api/v6/S4oi7EPZbv2UEPaukW54OORa0S8/AAAABWQIQTF0EvZbwaTWW7DJY1f2niB_zXEUEiSJZ_57U25R8a_DEL9FAEneWszREn6KptkK0GUdX5s_X61kFwfqoUjVakSsJWpu9g.webp?r=c14',
    0.68, 0.90, -15, 0, 2
  )
ON CONFLICT (slug) DO NOTHING;
