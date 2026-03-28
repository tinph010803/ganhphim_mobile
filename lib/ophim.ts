import { Movie } from '@/types/movie';

const OPHIM_BASE_URL = 'https://ophim1.com';
const OPHIM_IMAGE_BASE_URL = 'https://img.ophim.live';
const KKPHIM_BASE_URL = 'https://phimapi.com';
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

type KKServerEpisode = {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
};

type KKServer = {
  server_name?: string;
  server_data?: KKServerEpisode[];
};

type KKMoviePayload = {
  slug?: string;
  origin_name?: string;
  episode_total?: string | number;
  episode_current?: string | number;
};

type KKDetailResponse = {
  status?: boolean;
  movie?: KKMoviePayload;
  episodes?: KKServer[];
};

function normalizeImageUrl(url?: string): string {
  if (!url || url.trim() === '') {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg';
  }

  // Xử lý protocol-relative URL: //example.com/...
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Path tuyệt đối: /uploads/movies/...
  if (url.startsWith('/')) {
    return `${OPHIM_IMAGE_BASE_URL}${url}`;
  }

  // Path đã có uploads/movies/ rồi → không ghép thêm
  if (url.startsWith('uploads/')) {
    return `${OPHIM_IMAGE_BASE_URL}/${url}`;
  }

  // Còn lại mới ghép đầy đủ
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

function normalizeCompareText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapEpisodesList(rawEpisodes: unknown): Array<{ name: string; link_embed: string; link_m3u8: string }> {
  return Array.isArray(rawEpisodes)
    ? rawEpisodes.map((ep: any) => ({
        name: String(ep.name || ep.slug || 'Tập 1'),
        link_embed: String(ep.link_embed || ''),
        link_m3u8: String(ep.link_m3u8 || ''),
      }))
    : [];
}

function extractEpisodeNumber(value: string): number {
  const match = value.match(/\d+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCurrentEpisodeFromServers(servers: Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }>): number {
  const maxFromServers = servers.reduce((max, server) => {
    const maxInServer = server.episodes.reduce((acc, ep) => Math.max(acc, extractEpisodeNumber(ep.name)), 0);
    return Math.max(max, maxInServer);
  }, 0);
  return Math.max(maxFromServers, 1);
}

function buildKKServers(rawServers: KKServer[] | undefined): Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }> {
  if (!Array.isArray(rawServers)) return [];
  return rawServers
    .map((srv, index) => ({
      name: `${String(srv.server_name || `Máy chủ ${index + 1}`)} [KK]`,
      episodes: mapEpisodesList(srv.server_data),
    }))
    .filter((srv) => srv.episodes.length > 0);
}

async function fetchKKMovieBySlug(slug: string): Promise<KKDetailResponse | null> {
  try {
    const response = await fetch(`${KKPHIM_BASE_URL}/phim/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as KKDetailResponse;
    if (!json?.status || !json.movie) {
      return null;
    }

    return json;
  } catch {
    return null;
  }
}

function shouldMergeKKMovie(ophimRaw: Record<string, unknown>, kkMovie: KKMoviePayload): boolean {
  const ophimSlug = normalizeCompareText(ophimRaw.slug);
  const kkSlug = normalizeCompareText(kkMovie.slug);
  if (!ophimSlug || !kkSlug || ophimSlug !== kkSlug) {
    return false;
  }

  const ophimOrigin = normalizeCompareText(ophimRaw.origin_name || ophimRaw.name);
  const kkOrigin = normalizeCompareText(kkMovie.origin_name);
  if (!ophimOrigin || !kkOrigin) {
    return false;
  }

  return ophimOrigin === kkOrigin;
}

function mapOPhimMovie(raw: any): Movie {
  const episodeTotal = toNumber(raw.episode_total, 1);
  const rawEpisodeCurrent = String(raw.episode_current || '');
  const isTrailerStatus =
    String(raw.status || '').toLowerCase() === 'trailer' ||
    rawEpisodeCurrent.toLowerCase() === 'trailer';
  const currentEpisode = isTrailerStatus ? 0 : Math.max(toNumber(raw.episode_current, 1), 1);
  const rating = toNumber(raw.imdb?.vote_average ?? raw.tmdb?.vote_average ?? raw.imdb_rating, 0);

  const genres: string[] = Array.isArray(raw.category)
    ? raw.category.map((c: any) => String(c.name || '')).filter(Boolean)
    : [];

  const country: string = Array.isArray(raw.country)
    ? (raw.country[0]?.name || '')
    : String(raw.country?.name || raw.country || '');

  const director: string = Array.isArray(raw.director)
    ? raw.director.filter(Boolean).join(', ')
    : String(raw.director || '');

  const actors: string[] = Array.isArray(raw.actor)
    ? raw.actor.filter(Boolean)
    : typeof raw.actor === 'string' && raw.actor
    ? [raw.actor]
    : [];

  return {
    id: String(raw.slug || raw._id || raw.id || `${raw.name || 'movie'}-${raw.year || 'unknown'}`),
    slug: String(raw.slug || raw._id || raw.id || ''),
    title: String(raw.name || raw.title || 'Đang cập nhật'),
    title_en: String(raw.origin_name || raw.title_en || raw.name || ''),
    description: stripHtml(String(raw.content || raw.description || 'Chưa có mô tả cho phim này.')),
    thumb_url: normalizeImageUrl(raw.thumb_url || raw.poster_url),
    poster_url: normalizeImageUrl(raw.poster_url || raw.thumb_url),
    imdb_rating: Number(rating.toFixed(1)),
    year: toNumber(raw.year, new Date().getFullYear()),
    episodes: Math.max(episodeTotal, currentEpisode),
    current_episode: currentEpisode,
    duration: toNumber(raw.time, 0),
    duration_text: String(raw.time || ''),
    quality: String(raw.quality || 'HD'),
    age_rating: String(raw.age_rating || 'T13'),
    is_series: !isTrailerStatus && Math.max(episodeTotal, currentEpisode) > 1,
    status: isTrailerStatus ? 'trailer' : String(raw.status || ''),
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stream_url: raw?.episodes?.[0]?.server_data?.[0]?.link_embed || raw?.episodes?.[0]?.server_data?.[0]?.link_m3u8,
    trailer_url: String(raw.trailer_url || ''),
    episodes_data: Array.isArray(raw?.episodes?.[0]?.server_data)
      ? raw.episodes[0].server_data.map((ep: any) => ({
          name: String(ep.name || ep.slug || 'Tập 1'),
          link_embed: String(ep.link_embed || ''),
          link_m3u8: String(ep.link_m3u8 || ''),
        }))
      : [],
    servers: Array.isArray(raw?.episodes)
      ? raw.episodes.map((srv: any) => ({
          name: String(srv.server_name || 'Server 1'),
          episodes: Array.isArray(srv.server_data)
            ? srv.server_data.map((ep: any) => ({
                name: String(ep.name || ep.slug || 'Tập 1'),
                link_embed: String(ep.link_embed || ''),
                link_m3u8: String(ep.link_m3u8 || ''),
              }))
            : [],
        }))
      : [],
    genres,
    country,
    director,
    actors,
    tmdb_id: raw.tmdb?.id ? Number(raw.tmdb.id) : undefined,
    tmdb_type: raw.tmdb?.type === 'tv' ? 'tv' : 'movie',
    lang: String(raw.lang || ''),
    lang_key: Array.isArray(raw.lang_key) ? (raw.lang_key as string[]) : [],
    last_episodes: Array.isArray(raw.last_episodes)
      ? raw.last_episodes.map((ep: any) => ({
          server_name: String(ep.server_name || ''),
          name: String(ep.name || ''),
          is_ai: Boolean(ep.is_ai),
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
      .filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
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

export async function getMoviesByCountry(country: string, page: number = 1): Promise<Movie[]> {
  try {
    const json = await fetchOPhim(`/v1/api/quoc-gia/${country}?page=${page}`);
    const items = (json?.data?.items || json?.items || []) as any[];
    return items.map(mapOPhimMovie).filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
  } catch {
    return [];
  }
}

function parseTotalPages(data: any): number {
  const p = data?.params?.pagination ?? data?.pagination ?? {};
  if (p.totalPages) return Number(p.totalPages);
  if (p.total_pages) return Number(p.total_pages);
  if (p.totalItems && p.totalItemsPerPage)
    return Math.ceil(Number(p.totalItems) / Number(p.totalItemsPerPage));
  if (p.total && p.limit) return Math.ceil(Number(p.total) / Number(p.limit));
  return 1;
}

export async function getMoviesByCountryPaged(
  country: string,
  page: number = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const json = await fetchOPhim(`/v1/api/quoc-gia/${country}?page=${page}`);
    const items = (json?.data?.items || json?.items || []) as any[];
    const totalPages = parseTotalPages(json?.data as any);
    const movies = items.map(mapOPhimMovie).filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function getMoviesByType(type: string, page: number = 1): Promise<Movie[]> {
  try {
    const json = await fetchOPhim(`/v1/api/danh-sach/${type}?page=${page}`);
    const items = (json?.data?.items || json?.items || []) as any[];
    return items.map(mapOPhimMovie).filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
  } catch {
    return [];
  }
}

export async function getMoviesByTypePaged(
  type: string,
  page: number = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const json = await fetchOPhim(`/v1/api/danh-sach/${type}?page=${page}`);
    const items = (json?.data?.items || json?.items || []) as any[];
    const totalPages = parseTotalPages(json?.data as any);
    const movies = items.map(mapOPhimMovie).filter((movie) => !!movie.id && !!movie.slug && movie.status !== 'trailer');
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function getMoviesByGenrePaged(
  genre: string,
  page: number = 1,
  sort: 'moi-nhat' | 'xem-nhieu' = 'moi-nhat',
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const sortParam =
      sort === 'xem-nhieu' ? '&sort_field=view&sort_type=desc' : '';
    const json = await fetchOPhim(`/v1/api/the-loai/${genre}?page=${page}${sortParam}`);
    const items = (json?.data?.items || json?.items || []) as any[];
    const totalPages = parseTotalPages(json?.data as any);
    const movies = items.map(mapOPhimMovie).filter((m) => !!m.id && !!m.slug && m.status !== 'trailer');
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
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

  const kk = await fetchKKMovieBySlug(slug);
  if (kk?.movie && shouldMergeKKMovie(item, kk.movie)) {
    const kkServers = buildKKServers(kk.episodes);
    if (kkServers.length > 0) {
      const mergedServers = [...(movie.servers || []), ...kkServers];
      const firstEpisodes = mergedServers[0]?.episodes || [];
      const kkTotal = toNumber(kk.movie.episode_total, 0);
      const kkCurrent = toNumber(kk.movie.episode_current, 0);
      const mergedCurrent = Math.max(kkCurrent, getCurrentEpisodeFromServers(mergedServers));

      movie.servers = mergedServers;
      movie.episodes_data = firstEpisodes;
      movie.stream_url = firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || movie.stream_url;
      movie.current_episode = Math.max(mergedCurrent, movie.current_episode, 1);
      movie.episodes = Math.max(kkTotal, mergedCurrent, movie.episodes, movie.current_episode);
    }
  }

  detailCache.set(slug, movie);
  return movie;
}

export async function getMoviesFilteredPaged(
  params: {
    movieType?: string;
    country?: string;
    genre?: string;
    year?: number | null;
    sort?: string;
  },
  page = 1,
): Promise<{ movies: Movie[]; totalPages: number }> {
  try {
    const { movieType, country, genre, year, sort } = params;
    const extra: string[] = [`page=${page}`];
    if (year) extra.push(`year=${year}`);
    if (sort) extra.push(`sort_field=${encodeURIComponent(sort)}`, `sort_type=desc`);

    let path: string;
    if (movieType) {
      path = `/v1/api/danh-sach/${encodeURIComponent(movieType)}?${extra.join('&')}`;
    } else if (genre) {
      path = `/v1/api/the-loai/${encodeURIComponent(genre)}?${extra.join('&')}`;
    } else if (country) {
      path = `/v1/api/quoc-gia/${encodeURIComponent(country)}?${extra.join('&')}`;
    } else {
      path = `/v1/api/danh-sach/phim-moi?${extra.join('&')}`;
    }

    const json = await fetchOPhim(path);
    const items = ((json?.data as any)?.items || []) as any[];
    const totalPages = parseTotalPages(json?.data as any);
    const movies = items.map(mapOPhimMovie).filter((m: Movie) => !!m.id && !!m.slug && m.status !== 'trailer');
    return { movies, totalPages };
  } catch {
    return { movies: [], totalPages: 1 };
  }
}

export async function searchMovies(keyword: string): Promise<Movie[]> {
  try {
    const json = await fetchOPhim(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24`);
    const items = (json?.data?.items || (json?.data as any)?.items || []) as any[];
    return items.map(mapOPhimMovie).filter((m) => !!m.id && !!m.slug);
  } catch {
    return [];
  }
}

export async function searchMoviesWithFilters(params: {
  keyword?: string;
  genre?: string;
  country?: string;
  type?: string;
  year?: number | null;
  sort?: string;
}): Promise<Movie[]> {
  try {
    const { keyword, genre, country, type, year, sort } = params;
    const kw = keyword?.trim() ?? '';

    const extra: string[] = [];
    if (year) extra.push(`year=${year}`);
    if (sort) extra.push(`sort_field=${encodeURIComponent(sort)}`, `sort_type=desc`);

    let path: string;

    if (kw) {
      const q: string[] = [`keyword=${encodeURIComponent(kw)}`, 'limit=24'];
      if (genre) q.push(`the_loai=${genre}`);
      if (country) q.push(`quoc_gia=${country}`);
      if (type) q.push(`loai=${type}`);
      q.push(...extra);
      path = `/v1/api/tim-kiem?${q.join('&')}`;
    } else if (type) {
      const q: string[] = ['page=1'];
      if (genre) q.push(`the_loai=${genre}`);
      if (country) q.push(`quoc_gia=${country}`);
      q.push(...extra);
      path = `/v1/api/danh-sach/${encodeURIComponent(type)}?${q.join('&')}`;
    } else if (genre) {
      const q: string[] = ['page=1'];
      if (country) q.push(`quoc_gia=${country}`);
      q.push(...extra);
      path = `/v1/api/the-loai/${encodeURIComponent(genre)}?${q.join('&')}`;
    } else if (country) {
      const q: string[] = ['page=1'];
      q.push(...extra);
      path = `/v1/api/quoc-gia/${encodeURIComponent(country)}?${q.join('&')}`;
    } else {
      const q: string[] = ['page=1'];
      q.push(...extra);
      path = `/v1/api/danh-sach/phim-bo?${q.join('&')}`;
    }

    const json = await fetchOPhim(path);
    const items = ((json?.data as any)?.items || []) as any[];
    return items.map(mapOPhimMovie).filter((m: Movie) => !!m.id && !!m.slug);
  } catch {
    return [];
  }
}