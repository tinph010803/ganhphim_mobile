/**
 * Featured Overrides — quản lý danh sách phim nổi bật
 * - Nguồn chính: Supabase (bảng `featured_overrides`)
 * - Cache offline: AsyncStorage (dùng khi không có mạng)
 * - Fallback cuối: dữ liệu mặc định hardcode
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface FeaturedOverride {
  slug: string;
  bg?: string;
  character?: string;
  titleImg?: string;
  /** Tỷ lệ width ảnh nhân vật so với màn hình (0–1), mặc định 0.60 */
  charW?: number;
  /** Tỷ lệ height ảnh nhân vật so với banner (0–1.5), mặc định 1.1 */
  charH?: number;
  /** Khoảng cách từ mép phải (px), mặc định -10 */
  charRight?: number;
  /** Khoảng cách từ mép dưới (px), mặc định 0 */
  charBottom?: number;
}

const CACHE_KEY = 'featured_overrides_cache_v1';

/** Dữ liệu mặc định — fallback khi Supabase và cache đều không có */
const DEFAULT_OVERRIDES: FeaturedOverride[] = [
  {
    slug: 'nghe-thuat-lua-doi-cua-sarah',
    bg: 'https://sf-static.onflixcdn.pics/images/pic/1771002086_bg_%20Sarah_onflix.webp',
    character: 'https://sf-static.onflixcdn.pics/images/pic/1770999672_Sarah_onflix.webp',
    titleImg: 'https://sf-static.onflixcdn.pics/images/pic/1770999603_url.webp',
  },
  {
    slug: 'bui-hoa-hong',
    bg: 'https://pics.ibytecdn.org/images/pic/1772315778_bg-bui-hoa-hong.webp',
    character: 'https://pics.ibytecdn.org/images/pic/1772316152_bui-hoa-hong-onflix.webp',
    titleImg: 'https://pics.ibytecdn.org/images/pic/1772315871_url.webp',
    charW: 0.72,
    charH: 1.05,
    charRight: -20,
    charBottom: 0,
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

/** Map row Supabase → FeaturedOverride */
function rowToOverride(row: any): FeaturedOverride {
  return {
    slug: row.slug,
    bg: row.bg ?? undefined,
    character: row.character_url ?? undefined,
    titleImg: row.title_img ?? undefined,
    charW: row.char_w ?? undefined,
    charH: row.char_h ?? undefined,
    charRight: row.char_right ?? undefined,
    charBottom: row.char_bottom ?? undefined,
  };
}

/**
 * Đọc từ Supabase. Nếu offline/lỗi → dùng AsyncStorage cache.
 * Nếu cache cũng không có → dùng DEFAULT_OVERRIDES.
 */
export async function loadFeaturedOverrides(): Promise<FeaturedOverride[]> {
  try {
    const { data, error } = await supabase
      .from('featured_overrides')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      const list = data.map(rowToOverride);
      // Cập nhật cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
      return list;
    }
  } catch {}

  // Fallback: AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FeaturedOverride[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_OVERRIDES;
}

/**
 * Lưu lên Supabase (upsert theo slug) và cập nhật cache local.
 */
export async function saveFeaturedOverrides(list: FeaturedOverride[]): Promise<void> {
  const rows = list.map((o, i) => ({
    slug: o.slug,
    bg: o.bg ?? null,
    character_url: o.character ?? null,
    title_img: o.titleImg ?? null,
    char_w: o.charW ?? null,
    char_h: o.charH ?? null,
    char_right: o.charRight ?? null,
    char_bottom: o.charBottom ?? null,
    sort_order: i,
    updated_at: new Date().toISOString(),
  }));

  // Xoá các slug cũ không còn trong list, rồi upsert
  const { error: delError } = await supabase
    .from('featured_overrides')
    .delete()
    .not('slug', 'in', `(${list.map((o) => `"${o.slug}"`).join(',')})`);

  if (delError) throw new Error(delError.message);

  const { error: upsertError } = await supabase
    .from('featured_overrides')
    .upsert(rows, { onConflict: 'slug' });

  if (upsertError) throw new Error(upsertError.message);

  // Cập nhật cache local
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
}

/**
 * Reset: xoá toàn bộ trên Supabase, xoá cache, insert lại default.
 */
export async function resetFeaturedOverrides(): Promise<void> {
  await supabase.from('featured_overrides').delete().neq('slug', '');
  await AsyncStorage.removeItem(CACHE_KEY);

  const rows = DEFAULT_OVERRIDES.map((o, i) => ({
    slug: o.slug,
    bg: o.bg ?? null,
    character_url: o.character ?? null,
    title_img: o.titleImg ?? null,
    char_w: o.charW ?? null,
    char_h: o.charH ?? null,
    char_right: o.charRight ?? null,
    char_bottom: o.charBottom ?? null,
    sort_order: i,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from('featured_overrides').upsert(rows, { onConflict: 'slug' });
}

/** Chuyển mảng sang Record để dùng trong FeaturedCarousel */
export function overridesToRecord(
  list: FeaturedOverride[]
): Record<string, Omit<FeaturedOverride, 'slug'>> {
  return Object.fromEntries(list.map(({ slug, ...rest }) => [slug, rest]));
}
