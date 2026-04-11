/*
  # Create App Settings Table
  Lưu các cấu hình dùng chung của app để có thể đổi từ Supabase mà không cần build lại.
*/

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_settings"
  ON app_settings FOR SELECT
  USING (true);

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
  (
    'sports_url',
    'https://demnaylive.my/',
    'URL mặc định cho màn thể thao GanhTheThao'
  )
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();