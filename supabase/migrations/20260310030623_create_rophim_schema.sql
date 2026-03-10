/*
  # Create RoPhim Movie App Schema

  1. New Tables
    - `movies`
      - `id` (uuid, primary key)
      - `title` (text) - Vietnamese title
      - `title_en` (text) - English title
      - `description` (text) - Movie description
      - `poster_url` (text) - Movie poster image URL
      - `imdb_rating` (numeric) - IMDb rating
      - `year` (integer) - Release year
      - `episodes` (integer) - Number of episodes (for series)
      - `current_episode` (integer) - Latest available episode
      - `duration` (integer) - Duration in minutes (for movies)
      - `quality` (text) - Video quality (HD, 4K, etc.)
      - `age_rating` (text) - Age rating (T13, T16, T18, etc.)
      - `is_series` (boolean) - True if TV series, false if movie
      - `is_featured` (boolean) - Featured on home carousel
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `slug` (text, unique) - URL-friendly slug
      - `created_at` (timestamptz)

    - `movie_categories`
      - `movie_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key)
      - Primary key on (movie_id, category_id)

    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (text) - User identifier
      - `movie_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, movie_id)

  2. Security
    - Enable RLS on all tables
    - Public read access for movies and categories
    - Authenticated users can manage their own favorites
*/

-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_en text NOT NULL,
  description text DEFAULT '',
  poster_url text NOT NULL,
  imdb_rating numeric(3,1) DEFAULT 0,
  year integer NOT NULL,
  episodes integer DEFAULT 1,
  current_episode integer DEFAULT 1,
  duration integer DEFAULT 0,
  quality text DEFAULT 'HD',
  age_rating text DEFAULT 'T13',
  is_series boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create movie_categories junction table
CREATE TABLE IF NOT EXISTS movie_categories (
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, category_id)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  movie_id uuid REFERENCES movies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- Enable RLS
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movies (public read)
CREATE POLICY "Anyone can view movies"
  ON movies FOR SELECT
  TO public
  USING (true);

-- RLS Policies for categories (public read)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

-- RLS Policies for movie_categories (public read)
CREATE POLICY "Anyone can view movie categories"
  ON movie_categories FOR SELECT
  TO public
  USING (true);

-- RLS Policies for favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can remove their own favorites"
  ON favorites FOR DELETE
  TO public
  USING (true);

-- Insert sample categories
INSERT INTO categories (name, slug) VALUES
  ('Đề xuất', 'de-xuat'),
  ('Phim bộ', 'phim-bo'),
  ('Phim lẻ', 'phim-le'),
  ('Phim Trung Quốc', 'phim-trung-quoc'),
  ('Phim US-UK', 'phim-us-uk'),
  ('Hành động', 'hanh-dong'),
  ('Kinh dị', 'kinh-di'),
  ('Tình cảm', 'tinh-cam'),
  ('Hài hước', 'hai-huoc')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample movies
INSERT INTO movies (title, title_en, description, poster_url, imdb_rating, year, episodes, current_episode, quality, age_rating, is_series, is_featured) VALUES
  ('Ám Ảnh Kinh Hoàng: Nghị Lễ Cuối Cùng', 'The Conjuring: Last Rites', 'Đến với hồi kết của vũ trụ The Conjuring, The Conjuring: Nghị Lễ Cuối Cùng theo chân cặp đôi trừ tà Ed và Lorrai...', 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg', 6.2, 2025, 1, 1, '4K', 'T18', false, true),
  ('Sơn Hà Chấm', 'Fight for Love', 'Một câu chuyện tình yêu đầy cảm xúc giữa hai người từ hai thế giới khác nhau.', 'https://images.pexels.com/photos/7234381/pexels-photo-7234381.jpeg', 7.5, 2025, 22, 22, 'HD', 'T13', true, false),
  ('Sơn Thần Dị Văn Lục', 'Vengeance of the Mountain God', 'Hành trình phiêu lưu kỳ ảo đầy nguy hiểm trong thế giới thần thoại.', 'https://images.pexels.com/photos/7234395/pexels-photo-7234395.jpeg', 7.2, 2025, 10, 10, 'HD', 'T16', true, false),
  ('Vân Thâm Bất Tri Mộng', 'Eclipse of Illusion', 'Một câu chuyện phức tạp về ảo ảnh và thực tại.', 'https://images.pexels.com/photos/7234389/pexels-photo-7234389.jpeg', 6.8, 2025, 20, 20, '4K', 'T13', true, false),
  ('Maxton Hall - Thế Giới Giữa Chúng Ta', 'Maxton Hall: The World Between Us', 'Câu chuyện về tình yêu và quyền lực tại một trường quý tộc.', 'https://images.pexels.com/photos/7234391/pexels-photo-7234391.jpeg', 8.1, 2025, 1, 1, 'HD', 'T13', false, false),
  ('Tin Ngầm', 'The Lowdown', 'Một bộ phim ly kỳ về những bí mật và âm mưu.', 'https://images.pexels.com/photos/7234386/pexels-photo-7234386.jpeg', 7.0, 2025, 8, 8, 'HD', 'T16', true, false),
  ('Robin Hood', 'Robin Hood', 'Phiên bản hiện đại của huyền thoại Robin Hood.', 'https://images.pexels.com/photos/7234392/pexels-photo-7234392.jpeg', 6.5, 2025, 2, 2, 'HD', 'T13', true, false),
  ('Ám Hà Truyện', 'Blood River', 'Một câu chuyện kinh dị về dòng sông bí ẩn.', 'https://images.pexels.com/photos/7991332/pexels-photo-7991332.jpeg', 6.9, 2025, 34, 34, 'HD', 'T13', true, false),
  ('Đừng Rung Động Vì Anh', 'Everyone Loves Me', 'Một bộ phim tình cảm lãng mạn đầy cảm động.', 'https://images.pexels.com/photos/7234398/pexels-photo-7234398.jpeg', 7.8, 2024, 24, 24, 'HD', 'T13', true, false),
  ('Dị Phỉ Xung Thiên', 'Search for Soul Stone', 'Hành trình tìm kiếm viên đá linh hồn huyền thoại.', 'https://images.pexels.com/photos/7234384/pexels-photo-7234384.jpeg', 7.3, 2025, 22, 22, 'HD', 'T13', true, false),
  ('Kỳ Lân Chuyện Phát', 'Mad Unicorn', 'Một bộ phim hài hước về những tình huống kỳ quặc.', 'https://images.pexels.com/photos/7234387/pexels-photo-7234387.jpeg', 6.7, 2025, 7, 7, 'HD', 'T16', true, false),
  ('Trò Chơi Ảo Giác: Ares', 'TRON: Ares', 'Phần tiếp theo của series TRON huyền thoại.', 'https://images.pexels.com/photos/7234393/pexels-photo-7234393.jpeg', 7.1, 2025, 1, 1, '4K', 'T13', false, false)
ON CONFLICT DO NOTHING;
