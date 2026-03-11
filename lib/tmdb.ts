const TMDB_API_KEY = 'dd4f0dce7b88b26dd4acfd94752b1cec';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_url: string | null;
}

export async function getTMDBCast(
  tmdbId: number | string,
  type: 'movie' | 'tv' = 'movie',
): Promise<CastMember[]> {
  try {
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/credits?api_key=${TMDB_API_KEY}&language=vi-VN`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { cast?: any[] };
    const cast = data?.cast ?? [];
    return cast.slice(0, 20).map((c) => ({
      id: Number(c.id),
      name: String(c.name ?? ''),
      character: String(c.character ?? ''),
      profile_url: c.profile_path ? `${TMDB_IMAGE_BASE}${c.profile_path}` : null,
    }));
  } catch {
    return [];
  }
}

export async function searchTMDB(
  title: string,
  year?: number,
): Promise<{ id: number; type: 'movie' | 'tv' } | null> {
  try {
    const movieUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${TMDB_API_KEY}${year ? `&year=${year}` : ''}`;
    const movieRes = await fetch(movieUrl);
    if (movieRes.ok) {
      const movieData = (await movieRes.json()) as { results?: any[] };
      if ((movieData.results?.length ?? 0) > 0) {
        return { id: Number(movieData.results![0].id), type: 'movie' };
      }
    }

    const tvUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${TMDB_API_KEY}`;
    const tvRes = await fetch(tvUrl);
    if (tvRes.ok) {
      const tvData = (await tvRes.json()) as { results?: any[] };
      if ((tvData.results?.length ?? 0) > 0) {
        return { id: Number(tvData.results![0].id), type: 'tv' };
      }
    }

    return null;
  } catch {
    return null;
  }
}
