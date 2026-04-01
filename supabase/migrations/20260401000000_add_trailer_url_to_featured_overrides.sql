/*
  # Add trailer_url to featured_overrides
  Cho phep luu link trailer tuy chon cho tung phim noi bat.
*/

ALTER TABLE featured_overrides
ADD COLUMN IF NOT EXISTS trailer_url text;
