/*
  # Allow app settings writes from the app
  Lưu cấu hình link profile từ màn Admin trong app.
*/

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public read app_settings'
  ) THEN
    CREATE POLICY "Public read app_settings"
      ON app_settings FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Anon write app_settings'
  ) THEN
    CREATE POLICY "Anon write app_settings"
      ON app_settings FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
  ('ro1_url', 'https://cobephim.com', 'URL mặc định cho màn Rổ 1'),
  ('ro2_url', 'https://rophim.stream', 'URL mặc định cho màn Rổ 2'),
  ('sports_url', 'https://demnaylive.my/', 'URL mặc định cho màn thể thao GanhTheThao'),
  ('onflix_url', 'https://520-1314.onflix.run/', 'URL mặc định cho màn Onflix'),
  ('rophim_api_url', 'https://cobephim.com/baseapi/api/v1', 'Base API mặc định cho lịch chiếu')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();