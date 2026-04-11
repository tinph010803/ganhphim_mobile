import { supabase } from './supabase';

const APP_SETTINGS_TABLE = 'app_settings';

function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function getAppSettingValue(settingKey: string, fallbackValue: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from(APP_SETTINGS_TABLE)
      .select('setting_value')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (!error && data?.setting_value) {
      const normalized = normalizeHttpUrl(data.setting_value);
      if (normalized) {
        return normalized;
      }
    }
  } catch {
    // Ignore missing table/network errors and use the fallback below.
  }

  return fallbackValue;
}

export function loadSportsUrl(fallbackValue: string): Promise<string> {
  return getAppSettingValue('sports_url', fallbackValue);
}