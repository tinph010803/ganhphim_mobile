import { supabase } from './supabase';
import { getMoviesByType, getMovieBySlug } from './ophim';
import { Movie } from '@/types/movie';

export async function loadTop10Slugs(): Promise<string[] | null> {
  try {
    const { data, error } = await supabase
      .from('top10_films')
      .select('slug, sort_order')
      .order('sort_order');
    if (!error && data && data.length > 0) {
      return data.map((r: any) => r.slug as string);
    }
  } catch {}
  return null; // null = dùng API fallback
}

export async function saveTop10Slugs(slugs: string[]): Promise<void> {
  // Xoá tất cả rồi insert lại theo thứ tự mới
  await supabase.from('top10_films').delete().neq('slug', '__none__');
  if (slugs.length > 0) {
    await supabase.from('top10_films').insert(
      slugs.map((slug, i) => ({ slug, sort_order: i }))
    );
  }
}

export async function getTop10Films(): Promise<Movie[]> {
  try {
    const slugs = await loadTop10Slugs();
    if (slugs && slugs.length > 0) {
      const results = await Promise.all(slugs.map((s) => getMovieBySlug(s)));
      return results.filter(Boolean) as Movie[];
    }
  } catch {}
  // Fallback: 10 phim lẻ mới nhất
  try {
    const movies = await getMoviesByType('phim-le');
    return movies.slice(0, 10);
  } catch {
    return [];
  }
}
