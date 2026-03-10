import { Movie } from '@/types/movie';

const OPHIM_BASE_URL = 'https://ophim1.com';
const OPHIM_IMAGE_BASE_URL = 'https://img.ophim.live';
const HOME_CACHE_TTL = 5 * 60 * 1000;

let homeCache: { data: Movie[]; expiresAt: number } | null = null;
let homePendingPromise: Promise<Movie[]> | null = null;
const detailCache = new Map<string, Movie>();

type OPhimResponse = {
  data?: {
    items?: unknown[];
    item?: Record<string, unknown>;
    APP_DOMAIN_CDN_IMAGE?: string;
  };
  items?: unknown[];
};

function normalizeImageUrl(url?: string): string {
  if (!url) {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${OPHIM_IMAGE_BASE_URL}${url}`;
  }

  return `${OPHIM_IMAGE_BASE_URL}/uploads/movies/${url}`;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const extracted = value.match(/\d+(\.\d+)?/);
    if (extracted) {
      return Number(extracted[0]);
    }
  }

  return fallback;
}

function stripHtml(content: string): string {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapOPhimMovie(raw: any): Movie {
  const episodeTotal = toNumber(raw.episode_total, 1);
  const currentEpisode = Math.max(toNumber(raw.episode_current, 1), 1);
  const rating = toNumber(raw.imdb?.vote_average ?? raw.tmdb?.vote_average ?? raw.imdb_rating, 0);

  return {
    id: String(raw.slug || raw._id || raw.id || `${raw.name || 'movie'}-${raw.year || 'unknown'}`),
    slug: String(raw.slug || raw._id || raw.id || ''),
    title: String(raw.name || raw.title || 'Đang cập nhật'),
    title_en: String(raw.origin_name || raw.title_en || raw.name || ''),
    description: stripHtml(String(raw.content || raw.description || 'Chưa có mô tả cho phim này.')),
    poster_url: normalizeImageUrl(raw.poster_url || raw.thumb_url),
    imdb_rating: Number(rating.toFixed(1)),
    year: toNumber(raw.year, new Date().getFullYear()),
    episodes: Math.max(episodeTotal, currentEpisode),
    current_episode: currentEpisode,
    duration: toNumber(raw.time, 0),
    quality: String(raw.quality || 'HD'),
    age_rating: String(raw.age_rating || 'T13'),
    is_series: Math.max(episodeTotal, currentEpisode) > 1,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stream_url: raw?.episodes?.[0]?.server_data?.[0]?.link_embed || raw?.episodes?.[0]?.server_data?.[0]?.link_m3u8,
    episodes_data: Array.isArray(raw?.episodes?.[0]?.server_data)
      ? raw.episodes[0].server_data.map((ep: any) => ({
          name: String(ep.name || ep.slug || 'Tập 1'),
          link_embed: String(ep.link_embed || ''),
          link_m3u8: String(ep.link_m3u8 || ''),
        }))
      : [],
  };
}

async function fetchOPhim(path: string): Promise<OPhimResponse> {
  const response = await fetch(`${OPHIM_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`OPhim request failed: ${response.status}`);
  }

  return (await response.json()) as OPhimResponse;
}

export async function getHomeMovies(): Promise<Movie[]> {
  if (homeCache && Date.now() < homeCache.expiresAt) {
    return homeCache.data;
  }

  if (homePendingPromise) {
    return homePendingPromise;
  }

  homePendingPromise = (async () => {
    const json = await fetchOPhim('/v1/api/home');
    const items = (json?.data?.items || json?.items || []) as any[];
    const data = items
      .map(mapOPhimMovie)
      .filter((movie) => !!movie.id && !!movie.slug);
    homeCache = {
      data,
      expiresAt: Date.now() + HOME_CACHE_TTL,
    };
    return data;
  })();

  try {
    return await homePendingPromise;
  } finally {
    homePendingPromise = null;
  }
}

export async function getMovieBySlug(slug: string): Promise<Movie | null> {
  const cached = detailCache.get(slug);
  if (cached) {
    return cached;
  }

  const json = await fetchOPhim(`/v1/api/phim/${slug}`);

  // Detail endpoint returns data.item (not top-level movie)
  const item = (json?.data as any)?.item as Record<string, unknown> | undefined;

  if (!item) {
    return null;
  }

  const movie = mapOPhimMovie(item);
  detailCache.set(slug, movie);
  return movie;
}