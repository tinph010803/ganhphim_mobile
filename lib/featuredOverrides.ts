/**
 * Featured Overrides — danh sách phim nổi bật hardcode
 * - Không gọi Supabase
 * - Có thể lưu local bằng AsyncStorage nếu cần
 * - Nguồn mặc định là mảng hardcode bên dưới
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeaturedOverride {
  slug: string;
  bg?: string;
  character?: string;
  titleImg?: string;
  trailerUrl?: string;
  /** Tỷ lệ width ảnh nhân vật so với màn hình (0–1), mặc định 0.60 */
  charW?: number;
  /** Tỷ lệ height ảnh nhân vật so với banner (0–1.5), mặc định 1.1 */
  charH?: number;
  /** Khoảng cách từ mép phải (px), mặc định -10 */
  charRight?: number;
  /** Khoảng cách từ mép dưới (px), mặc định 0 */
  charBottom?: number;
}

const CACHE_KEY = 'featured_overrides_cache_v2';

/** Dữ liệu mặc định — hardcode theo sort_order */
export const FEATURED_OVERRIDES: FeaturedOverride[] = [
  {
    slug: 'nguyet-lan-y-ky',
    titleImg: 'https://sf-static.onflixcdn.pics/images/pic/1775038312_url.png',
    trailerUrl: 'https://res.cloudinary.com/df2amyjzw/video/upload/sp_auto/v1775190197/nguyetlanyky_mwuhcz.m3u8',
  },
  {
    slug: 'mo-tu-tu',
    titleImg: 'https://sf-static.onflixcdn.pics/images/pic/1774685404_url.webp',
    trailerUrl: 'https://res.cloudinary.com/df2amyjzw/video/upload/sp_auto/v1775011804/motutu_wpe4k3.m3u8',
  },
  {
    slug: 'xin-chao-1983',
    bg: 'https://sf-static.onflixcdn.pics/images/pic/1773748924_url.webp',
    character: 'https://sf-static.onflixcdn.pics/images/pic/1773748635_url.webp',
    titleImg: 'https://sf-static.onflixcdn.pics/images/pic/1773748957_url.webp',
    charH: 0.72,
    charBottom: 0,
  },
  {
    slug: 'truc-ngoc',
    bg: 'https://pics.ibytecdn.org/images/pic/1772791752_url.webp',
    character: 'https://pics.ibytecdn.org/images/pic/1772791880_url.webp',
    titleImg: 'https://pics.ibytecdn.org/images/pic/1772791902_url.webp',
    charH: 0.72,
  },
  {
    slug: 'nghe-thuat-lua-doi-cua-sarah',
    bg: 'https://sf-static.onflixcdn.pics/images/pic/1771002086_bg_%20Sarah_onflix.webp',
    character: 'https://sf-static.onflixcdn.pics/images/pic/1770999672_Sarah_onflix.webp',
    titleImg: 'https://sf-static.onflixcdn.pics/images/pic/1770999603_url.webp',
  },
  {
    slug: 'tieng-yeu-nay-anh-dich-duoc-khong',
    bg: 'https://pics.ibytecdn.org/images/pic/1770748620_bg_tynaddk_onflix.png',
    character: 'https://pics.ibytecdn.org/images/pic/1770748579_tynaddk_onflix.webp',
    titleImg: 'https://occ-0-325-395.1.nflxso.net/dnm/api/v6/S4oi7EPZbv2UEPaukW54OORa0S8/AAAABWQIQTF0EvZbwaTWW7DJY1f2niB_zXEUEiSJZ_57U25R8a_DEL9FAEneWszREn6KptkK0GUdX5s_X61kFwfqoUjVakSsJWpu9g.webp?r=c14',
    charW: 0.68,
    charH: 0.90,
    charRight: -15,
    charBottom: 0,
  },
];

/**
 * Load featured overrides from local cache immediately.
 * No Supabase call.
 */
export async function loadFeaturedOverridesFromCache(): Promise<FeaturedOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FeaturedOverride[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return FEATURED_OVERRIDES;
}

/**
 * Refresh featured overrides in background.
 * Since the source is hardcoded, this just returns the current data.
 */
export async function refreshFeaturedOverridesInBackground(): Promise<FeaturedOverride[]> {
  return loadFeaturedOverrides();
}

/**
 * Đọc featured overrides từ local cache, không gọi Supabase.
 */
export async function loadFeaturedOverrides(): Promise<FeaturedOverride[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FeaturedOverride[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return FEATURED_OVERRIDES;
}

/**
 * Lưu local cache theo máy hiện tại.
 */
export async function saveFeaturedOverrides(list: FeaturedOverride[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
}

/**
 * Reset về danh sách hardcode mặc định.
 */
export async function resetFeaturedOverrides(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

/** Chuyển mảng sang Record để dùng trong FeaturedCarousel */
export function overridesToRecord(
  list: FeaturedOverride[]
): Record<string, Omit<FeaturedOverride, 'slug'>> {
  return Object.fromEntries(list.map(({ slug, ...rest }) => [slug, rest]));
}
