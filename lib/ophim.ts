import { Movie } from '@/types/movie';

const OPHIM_BASE_URL = 'https://ophim1.com';
const OPHIM_IMAGE_BASE_URL = 'https://img.ophim.live';
const KKPHIM_BASE_URL = 'https://phimapi.com';
const NGUONC_BASE_URL = 'https://phim.nguonc.com/api';
const HOME_CACHE_TTL = 5 * 60 * 1000;

let homeCache: { data: Movie[]; expiresAt: number } | null = null;
let homePendingPromise: Promise<Movie[]> | null = null;
const detailCache = new Map<string, Movie>();
const detailPendingCache = new Map<string, Promise<Movie | null>>();
const detailEnrichPendingCache = new Map<string, Promise<void>>();
const EXTERNAL_SOURCE_TIMEOUT_MS = 2500;

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
  msg?: string;
  movie?: KKMoviePayload;
  episodes?: KKServer[];
};

type KKSearchMovie = {
  slug?: string;
  origin_name?: string;
  name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  episode_current?: number | string;
  episode_total?: number | string;
  quality?: string;
  lang?: string;
};

type NguoncEpisodeItem = {
  name?: string;
  slug?: string;
  embed?: string;
  m3u8?: string;
};

type NguoncEpisodeServer = {
  server_name?: string;
  items?: NguoncEpisodeItem[];
};

type NguoncCategoryBlock = {
  group?: {
    id?: string;
    name?: string;
  };
  list?: Array<{
    id?: string;
    name?: string;
  }>;
};

type NguoncMoviePayload = {
  id?: string;
  name?: string;
  slug?: string;
  original_name?: string;
  thumb_url?: string;
  poster_url?: string;
  description?: string;
  total_episodes?: number | string;
  current_episode?: number | string;
  time?: string;
  quality?: string;
  language?: string;
  director?: string | null;
  casts?: string;
  category?: Record<string, NguoncCategoryBlock>;
  episodes?: NguoncEpisodeServer[];
};

type NguoncDetailResponse = {
  status?: string;
  movie?: NguoncMoviePayload;
};

type NguoncSearchMovie = {
  slug?: string;
  original_name?: string;
  name?: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  current_episode?: number | string;
  total_episodes?: number | string;
  quality?: string;
  language?: string;
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

function normalizeKKImageUrl(url?: string): string {
  if (!url || url.trim() === '') {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg';
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `https://phimimg.com${url}`;
  }

  if (url.startsWith('upload/')) {
    return `https://phimimg.com/${url}`;
  }

  return normalizeImageUrl(url);
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

function mapNguoncEpisodesList(rawEpisodes: unknown): Array<{ name: string; link_embed: string; link_m3u8: string }> {
  return Array.isArray(rawEpisodes)
    ? rawEpisodes.map((ep: NguoncEpisodeItem) => ({
        name: String(ep.name || ep.slug || 'Tập 1'),
        link_embed: String(ep.embed || ''),
        link_m3u8: String(ep.m3u8 || ''),
      }))
    : [];
}

function buildNguoncServers(rawServers: NguoncEpisodeServer[] | undefined): Array<{ name: string; episodes: Array<{ name: string; link_embed: string; link_m3u8: string }> }> {
  if (!Array.isArray(rawServers)) return [];
  return rawServers
    .map((srv, index) => ({
      name: `${String(srv.server_name || `Máy chủ ${index + 1}`)} [NC]`,
      episodes: mapNguoncEpisodesList(srv.items),
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

async function fetchNguoncMovieBySlug(slug: string): Promise<NguoncDetailResponse | null> {
  try {
    const response = await fetch(`${NGUONC_BASE_URL}/film/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as NguoncDetailResponse;
    if (json?.status !== 'success' || !json.movie) {
      return null;
    }

    return json;
  } catch {
    return null;
  }
}

function collectNguoncSearchMovies(payload: unknown): NguoncSearchMovie[] {
  const out: NguoncSearchMovie[] = [];
  const walk = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;

    const rec = node as Record<string, unknown>;
    const slug = typeof rec.slug === 'string' ? rec.slug : '';
    const originalName = typeof rec.original_name === 'string' ? rec.original_name : '';
    const name = typeof rec.name === 'string' ? rec.name : '';
    const hasMovieSignals =
      !!originalName ||
      typeof rec.thumb_url === 'string' ||
      typeof rec.poster_url === 'string' ||
      typeof rec.current_episode === 'string' ||
      typeof rec.current_episode === 'number' ||
      typeof rec.total_episodes === 'string' ||
      typeof rec.total_episodes === 'number';

    if (slug && hasMovieSignals) {
      out.push({
        slug,
        original_name: originalName,
        name,
        thumb_url: typeof rec.thumb_url === 'string' ? rec.thumb_url : '',
        poster_url: typeof rec.poster_url === 'string' ? rec.poster_url : '',
        year: (typeof rec.year === 'string' || typeof rec.year === 'number') ? rec.year : undefined,
        current_episode: (typeof rec.current_episode === 'string' || typeof rec.current_episode === 'number') ? rec.current_episode : undefined,
        total_episodes: (typeof rec.total_episodes === 'string' || typeof rec.total_episodes === 'number') ? rec.total_episodes : undefined,
        quality: typeof rec.quality === 'string' ? rec.quality : '',
        language: typeof rec.language === 'string' ? rec.language : '',
      });
    }

    Object.values(rec).forEach((value) => {
      if (value && (Array.isArray(value) || typeof value === 'object')) {
        walk(value);
      }
    });
  };

  walk(payload);

  const seen = new Set<string>();
  return out.filter((item) => {
    const key = `${item.slug || ''}|${item.original_name || ''}|${item.name || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNguoncSearchCandidates(keyword: string): Promise<NguoncSearchMovie[]> {
  const q = keyword.trim();
  if (!q) return [];

  try {
    const response = await fetch(`${NGUONC_BASE_URL}/films/search?keyword=${encodeURIComponent(q)}`);
    if (!response.ok) return [];
    const json = (await response.json()) as unknown;
    return collectNguoncSearchMovies(json).filter((item) => !!item.slug);
  } catch {
    return [];
  }
}

async function resolveNguoncMovieForOphim(
  ophimSlug: string,
  ophimOriginName: string,
): Promise<NguoncDetailResponse | null> {
  const bySlug = await fetchNguoncMovieBySlug(ophimSlug);
  if (bySlug?.movie) {
    return bySlug;
  }

  const normalizedOrigin = normalizeCompareText(ophimOriginName);
  if (!normalizedOrigin) {
    return null;
  }

  const candidates = await fetchNguoncSearchCandidates(ophimOriginName);
  const exact = candidates.find((item) => {
    const cOrigin = normalizeCompareText(item.original_name || item.name || '');
    return !!cOrigin && cOrigin === normalizedOrigin;
  });

  if (!exact?.slug) {
    return null;
  }

  return fetchNguoncMovieBySlug(exact.slug);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue);
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallbackValue);
      });
  });
}

function shouldMergeKKMovie(ophimRaw: Record<string, unknown>, kkMovie: KKMoviePayload): boolean {
  const ophimSlug = normalizeCompareText(ophimRaw.slug);
  const kkSlug = normalizeCompareText(kkMovie.slug);
  const sameSlug = !!ophimSlug && !!kkSlug && ophimSlug === kkSlug;
  if (sameSlug) {
    return true;
  }

  const ophimOrigin = normalizeCompareText(ophimRaw.origin_name || ophimRaw.name);
  const kkOrigin = normalizeCompareText(kkMovie.origin_name);
  return !!ophimOrigin && !!kkOrigin && ophimOrigin === kkOrigin;
}

function collectKKSearchMovies(payload: unknown): KKSearchMovie[] {
  const out: KKSearchMovie[] = [];

  const walk = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;

    const rec = node as Record<string, unknown>;
    const slug = typeof rec.slug === 'string' ? rec.slug : '';
    const originName = typeof rec.origin_name === 'string' ? rec.origin_name : '';
    const name = typeof rec.name === 'string' ? rec.name : '';

    const hasMovieSignals =
      !!originName ||
      typeof rec.thumb_url === 'string' ||
      typeof rec.poster_url === 'string' ||
      typeof rec.episode_current === 'string' ||
      typeof rec.episode_current === 'number' ||
      typeof rec.episode_total === 'string' ||
      typeof rec.episode_total === 'number';

    if (slug && hasMovieSignals) {
      out.push({
        slug,
        origin_name: originName,
        name,
        thumb_url: typeof rec.thumb_url === 'string' ? rec.thumb_url : '',
        poster_url: typeof rec.poster_url === 'string' ? rec.poster_url : '',
        year: (typeof rec.year === 'string' || typeof rec.year === 'number') ? rec.year : undefined,
        episode_current: (typeof rec.episode_current === 'string' || typeof rec.episode_current === 'number') ? rec.episode_current : undefined,
        episode_total: (typeof rec.episode_total === 'string' || typeof rec.episode_total === 'number') ? rec.episode_total : undefined,
        quality: typeof rec.quality === 'string' ? rec.quality : '',
        lang: typeof rec.lang === 'string' ? rec.lang : '',
      });
    }

    Object.values(rec).forEach((value) => {
      if (value && (Array.isArray(value) || typeof value === 'object')) {
        walk(value);
      }
    });
  };

  walk(payload);

  const seen = new Set<string>();
  return out.filter((item) => {
    const key = `${item.slug || ''}|${item.origin_name || ''}|${item.name || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchKKSearchCandidates(keyword: string): Promise<KKSearchMovie[]> {
  const q = keyword.trim();
  if (!q) return [];

  const endpoints = [
    `${KKPHIM_BASE_URL}/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}`,
    `${KKPHIM_BASE_URL}/api/films/search?keyword=${encodeURIComponent(q)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const json = (await response.json()) as unknown;
      const movies = collectKKSearchMovies(json).filter((item) => !!item.slug);
      if (movies.length > 0) {
        return movies;
      }
    } catch {
      // try next endpoint
    }
  }

  return [];
}

async function resolveKKMovieForOphim(
  ophimSlug: string,
  ophimOriginName: string,
): Promise<KKDetailResponse | null> {
  const bySlug = await fetchKKMovieBySlug(ophimSlug);
  if (bySlug?.movie) {
    return bySlug;
  }

  const normalizedOrigin = normalizeCompareText(ophimOriginName);
  if (!normalizedOrigin) {
    return null;
  }

  const candidates = await fetchKKSearchCandidates(ophimOriginName);
  const exact = candidates.find((item) => {
    const cOrigin = normalizeCompareText(item.origin_name || item.name || '');
    return !!cOrigin && cOrigin === normalizedOrigin;
  });

  if (!exact?.slug) {
    return null;
  }

  return fetchKKMovieBySlug(exact.slug);
}

function shouldMergeNguoncMovie(ophimRaw: Record<string, unknown>, ncMovie: NguoncMoviePayload): boolean {
  const ophimSlug = normalizeCompareText(ophimRaw.slug);
  const ncSlug = normalizeCompareText(ncMovie.slug);
  const sameSlug = !!ophimSlug && !!ncSlug && ophimSlug === ncSlug;
  if (sameSlug) {
    return true;
  }

  const ophimOrigin = normalizeCompareText(ophimRaw.origin_name || ophimRaw.name);
  const ncOrigin = normalizeCompareText(ncMovie.original_name || ncMovie.name);
  return !!ophimOrigin && !!ncOrigin && ophimOrigin === ncOrigin;
}

function mapNguoncMovie(ncMovie: NguoncMoviePayload, requestedSlug: string): Movie {
  const servers = buildNguoncServers(ncMovie.episodes);
  const firstEpisodes = servers[0]?.episodes ?? [];
  const totalEpisodes = Math.max(toNumber(ncMovie.total_episodes, 1), 1);
  const currentEpisode = Math.max(toNumber(ncMovie.current_episode, 1), 1);

  const categoryBlocks = Object.values(ncMovie.category || {});
  const genreGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'theloai');
  const countryGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'quocgia');
  const yearGroup = categoryBlocks.find((block) => normalizeCompareText(block.group?.name) === 'nam');

  const genres = (genreGroup?.list || []).map((item) => String(item.name || '')).filter(Boolean);
  const country = (countryGroup?.list || []).map((item) => String(item.name || '')).find(Boolean) || '';
  const yearName = (yearGroup?.list || []).map((item) => String(item.name || '')).find(Boolean) || '';
  const year = Math.max(toNumber(yearName, new Date().getFullYear()), 1900);
  const actors = String(ncMovie.casts || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    id: String(ncMovie.slug || ncMovie.id || requestedSlug),
    slug: String(ncMovie.slug || requestedSlug),
    title: String(ncMovie.name || 'Đang cập nhật'),
    title_en: String(ncMovie.original_name || ncMovie.name || ''),
    description: String(ncMovie.description || 'Chưa có mô tả cho phim này.'),
    thumb_url: normalizeImageUrl(ncMovie.thumb_url || ncMovie.poster_url),
    poster_url: normalizeImageUrl(ncMovie.poster_url || ncMovie.thumb_url),
    imdb_rating: 0,
    year,
    episodes: Math.max(totalEpisodes, currentEpisode),
    current_episode: Math.min(Math.max(currentEpisode, 1), Math.max(totalEpisodes, 1)),
    duration: toNumber(ncMovie.time, 0),
    duration_text: String(ncMovie.time || ''),
    quality: String(ncMovie.quality || 'HD'),
    age_rating: 'T13',
    is_series: Math.max(totalEpisodes, currentEpisode) > 1,
    status: totalEpisodes > 0 && currentEpisode >= totalEpisodes ? 'completed' : 'ongoing',
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stream_url: firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || '',
    episodes_data: firstEpisodes,
    servers,
    genres,
    country,
    director: String(ncMovie.director || ''),
    actors,
    lang: String(ncMovie.language || ''),
    lang_key: [],
    last_episodes: [],
  };
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
    // trailer_url: String(raw.trailer_url || ''),
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

async function fetchOPhimItemBySlugSafe(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const json = await fetchOPhim(`/v1/api/phim/${encodeURIComponent(slug)}`);
    return ((json?.data as any)?.item as Record<string, unknown> | undefined) || null;
  } catch {
    return null;
  }
}

async function resolveOPhimMovieByOriginName(originName: string): Promise<Record<string, unknown> | null> {
  const q = originName.trim();
  if (!q) return null;

  try {
    const search = await fetchOPhim(`/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=24`);
    const items = ((search?.data as any)?.items || []) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const target = normalizeCompareText(originName);
    const exact = items.find((it) => {
      const n = normalizeCompareText(it.origin_name || it.name || '');
      return !!n && n === target;
    }) || items.find((it) => !!it.slug);

    const foundSlug = String(exact?.slug || '').trim();
    if (!foundSlug) {
      return null;
    }

    return fetchOPhimItemBySlugSafe(foundSlug);
  } catch {
    return null;
  }
}

function shouldMergeBySlugOrOrigin(
  baseSlug: unknown,
  baseOrigin: unknown,
  candidateSlug: unknown,
  candidateOrigin: unknown,
): boolean {
  const aSlug = normalizeCompareText(baseSlug);
  const bSlug = normalizeCompareText(candidateSlug);
  if (aSlug && bSlug && aSlug === bSlug) {
    return true;
  }

  const aOrigin = normalizeCompareText(baseOrigin);
  const bOrigin = normalizeCompareText(candidateOrigin);
  return !!aOrigin && !!bOrigin && aOrigin === bOrigin;
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

  const pending = detailPendingCache.get(slug);
  if (pending) {
    return pending;
  }

  const loadingPromise = (async () => {
    const item = await fetchOPhimItemBySlugSafe(slug);

    // Fast path: return OPhim data immediately, then enrich KK/NC in background.
    if (item) {
      const baseMovie = mapOPhimMovie(item);
      detailCache.set(slug, baseMovie);

      if (!detailEnrichPendingCache.has(slug)) {
        const enrichPromise = (async () => {
          const baseOrigin = String(item.origin_name || item.name || slug);
          const [kk, nc] = await withTimeout(
            Promise.all([
              resolveKKMovieForOphim(slug, baseOrigin),
              resolveNguoncMovieForOphim(slug, baseOrigin),
            ]),
            EXTERNAL_SOURCE_TIMEOUT_MS,
            [null, null] as [KKDetailResponse | null, NguoncDetailResponse | null],
          );

          if (!kk?.movie && !nc?.movie) {
            return;
          }

          const latest = detailCache.get(slug) ?? baseMovie;
          let enriched = latest;

          const hasKKBase = (enriched.servers || []).some((srv) => /\[KK\]/i.test(srv.name || ''));
          if (!hasKKBase && kk?.movie && shouldMergeBySlugOrOrigin(item.slug, item.origin_name || item.name, kk.movie.slug, kk.movie.origin_name)) {
            const kkServers = buildKKServers(kk.episodes);
            if (kkServers.length > 0) {
              const mergedServers = [...(enriched.servers || []), ...kkServers];
              const firstEpisodes = mergedServers[0]?.episodes || [];
              const kkTotal = toNumber(kk.movie.episode_total, 0);
              const kkCurrent = toNumber(kk.movie.episode_current, 0);
              const mergedCurrent = Math.max(kkCurrent, getCurrentEpisodeFromServers(mergedServers));

              enriched = {
                ...enriched,
                servers: mergedServers,
                episodes_data: firstEpisodes,
                stream_url: firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || enriched.stream_url,
                current_episode: Math.max(mergedCurrent, enriched.current_episode, 1),
                episodes: Math.max(kkTotal, mergedCurrent, enriched.episodes, enriched.current_episode),
              };
            }
          }

          if (nc?.movie && shouldMergeBySlugOrOrigin(item.slug, item.origin_name || item.name, nc.movie.slug, nc.movie.original_name || nc.movie.name)) {
            const ncServers = buildNguoncServers(nc.movie.episodes);
            if (ncServers.length > 0) {
              const mergedServers = [...(enriched.servers || []), ...ncServers];
              const firstEpisodes = mergedServers[0]?.episodes || [];
              const ncTotal = toNumber(nc.movie.total_episodes, 0);
              const ncCurrent = toNumber(nc.movie.current_episode, 0);
              const mergedCurrent = Math.max(ncCurrent, getCurrentEpisodeFromServers(mergedServers));

              enriched = {
                ...enriched,
                servers: mergedServers,
                episodes_data: firstEpisodes,
                stream_url: firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || enriched.stream_url,
                current_episode: Math.max(mergedCurrent, enriched.current_episode, 1),
                episodes: Math.max(ncTotal, mergedCurrent, enriched.episodes, enriched.current_episode),
              };
            }
          }

          detailCache.set(slug, enriched);
        })().finally(() => {
          detailEnrichPendingCache.delete(slug);
        });

        detailEnrichPendingCache.set(slug, enrichPromise);
      }

      return baseMovie;
    }

    let kk: KKDetailResponse | null = null;
    let nc: NguoncDetailResponse | null = null;

    const initialOrigin = slug;
    [kk, nc] = await withTimeout(
      Promise.all([
        resolveKKMovieForOphim(slug, initialOrigin),
        resolveNguoncMovieForOphim(slug, initialOrigin),
      ]),
      EXTERNAL_SOURCE_TIMEOUT_MS,
      [null, null] as [KKDetailResponse | null, NguoncDetailResponse | null],
    );

    // If entry slug is KK/NC-only, try to map back to OPhim by origin name.
    let itemFromOrigin: Record<string, unknown> | null = null;
    const originCandidates = [
      String(kk?.movie?.origin_name || ''),
      String(nc?.movie?.original_name || nc?.movie?.name || ''),
    ].filter(Boolean);

    for (const candidate of originCandidates) {
      itemFromOrigin = await resolveOPhimMovieByOriginName(candidate);
      if (itemFromOrigin) break;
    }

    if (itemFromOrigin) {
      const resolvedOrigin = String(itemFromOrigin.origin_name || itemFromOrigin.name || slug);
      const [kkResolved, ncResolved] = await withTimeout(
        Promise.all([
          kk ?? resolveKKMovieForOphim(slug, resolvedOrigin),
          nc ?? resolveNguoncMovieForOphim(slug, resolvedOrigin),
        ]),
        EXTERNAL_SOURCE_TIMEOUT_MS,
        [kk, nc] as [KKDetailResponse | null, NguoncDetailResponse | null],
      );
      kk = kkResolved;
      nc = ncResolved;
    }

    if (!itemFromOrigin && !kk?.movie && !nc?.movie) {
      return null;
    }

    let movie: Movie;
    let baseSlug: unknown;
    let baseOrigin: unknown;

    if (itemFromOrigin) {
      movie = mapOPhimMovie(itemFromOrigin);
      baseSlug = itemFromOrigin.slug;
      baseOrigin = itemFromOrigin.origin_name || itemFromOrigin.name;
    } else if (kk?.movie) {
      movie = mapKKDetailMovie(kk, slug);
      baseSlug = kk.movie.slug || slug;
      baseOrigin = kk.movie.origin_name || '';
    } else {
      movie = mapNguoncMovie(nc!.movie!, slug);
      baseSlug = nc!.movie!.slug || slug;
      baseOrigin = nc!.movie!.original_name || nc!.movie!.name || '';
    }

    const hasKKBase = (movie.servers || []).some((srv) => /\[KK\]/i.test(srv.name || ''));
    if (!hasKKBase && kk?.movie && shouldMergeBySlugOrOrigin(baseSlug, baseOrigin, kk.movie.slug, kk.movie.origin_name)) {
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

    if (nc?.movie) {
      if (shouldMergeBySlugOrOrigin(baseSlug, baseOrigin, nc.movie.slug, nc.movie.original_name || nc.movie.name)) {
        const ncServers = buildNguoncServers(nc.movie.episodes);
        if (ncServers.length > 0) {
          const mergedServers = [...(movie.servers || []), ...ncServers];
          const firstEpisodes = mergedServers[0]?.episodes || [];
          const ncTotal = toNumber(nc.movie.total_episodes, 0);
          const ncCurrent = toNumber(nc.movie.current_episode, 0);
          const mergedCurrent = Math.max(ncCurrent, getCurrentEpisodeFromServers(mergedServers));

          movie.servers = mergedServers;
          movie.episodes_data = firstEpisodes;
          movie.stream_url = firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || movie.stream_url;
          movie.current_episode = Math.max(mergedCurrent, movie.current_episode, 1);
          movie.episodes = Math.max(ncTotal, mergedCurrent, movie.episodes, movie.current_episode);
        }
      } else if (!item && !kk?.movie) {
        movie = mapNguoncMovie(nc.movie, slug);
      }
    }

    detailCache.set(slug, movie);
    return movie;
  })();

  detailPendingCache.set(slug, loadingPromise);
  try {
    return await loadingPromise;
  } finally {
    detailPendingCache.delete(slug);
  }
}

export function prefetchMovieBySlug(slug: string): void {
  const normalized = slug?.trim();
  if (!normalized) return;
  void getMovieBySlug(normalized);
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
    const ophimMovies = items.map(mapOPhimMovie).filter((m: Movie) => !!m.id && !!m.slug);

    if (!kw) {
      return ophimMovies;
    }

    const [ncCandidates, kkCandidates] = await Promise.all([
      fetchNguoncSearchCandidates(kw),
      fetchKKSearchCandidates(kw),
    ]);

    const slugSeen = new Set(ophimMovies.map((m) => normalizeCompareText(m.slug || m.id)));

    const ncMovies = ncCandidates
      .filter((item) => {
        const slugKey = normalizeCompareText(item.slug);
        return !!slugKey && !slugSeen.has(slugKey);
      })
      .map((item) => {
        const mapped = mapNguoncSearchMovie(item);
        slugSeen.add(normalizeCompareText(mapped.slug || mapped.id));
        return mapped;
      });

    const kkMovies = kkCandidates
      .filter((item) => {
        const slugKey = normalizeCompareText(item.slug);
        return !!slugKey && !slugSeen.has(slugKey);
      })
      .map((item) => {
        const mapped = mapKKSearchMovie(item);
        slugSeen.add(normalizeCompareText(mapped.slug || mapped.id));
        return mapped;
      });

    return [...ophimMovies, ...ncMovies, ...kkMovies];
  } catch {
    return [];
  }
}

function mapNguoncSearchMovie(item: NguoncSearchMovie): Movie {
  const total = Math.max(toNumber(item.total_episodes, 1), 1);
  const current = Math.max(toNumber(item.current_episode, 1), 1);
  return {
    id: String(item.slug || item.name || item.original_name || 'nc-movie'),
    slug: String(item.slug || ''),
    title: String(item.name || item.original_name || 'Đang cập nhật'),
    title_en: String(item.original_name || item.name || ''),
    description: 'Nguồn NC',
    thumb_url: normalizeImageUrl(item.thumb_url || item.poster_url),
    poster_url: normalizeImageUrl(item.poster_url || item.thumb_url),
    imdb_rating: 0,
    year: toNumber(item.year, new Date().getFullYear()),
    episodes: Math.max(total, current),
    current_episode: current,
    duration: 0,
    duration_text: '',
    quality: String(item.quality || 'HD'),
    age_rating: 'T13',
    is_series: Math.max(total, current) > 1,
    status: 'ongoing',
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    episodes_data: [],
    servers: [],
    lang: String(item.language || ''),
    lang_key: [],
    last_episodes: [],
  };
}

function mapKKSearchMovie(item: KKSearchMovie): Movie {
  const total = Math.max(toNumber(item.episode_total, 1), 1);
  const current = Math.max(toNumber(item.episode_current, 1), 1);
  const preferredPoster = normalizeKKImageUrl(item.poster_url || item.thumb_url);
  const preferredThumb = normalizeKKImageUrl(item.poster_url || item.thumb_url);
  return {
    id: String(item.slug || item.name || item.origin_name || 'kk-movie'),
    slug: String(item.slug || ''),
    title: String(item.name || item.origin_name || 'Đang cập nhật'),
    title_en: String(item.origin_name || item.name || ''),
    description: 'Nguồn KK',
    thumb_url: preferredThumb,
    poster_url: preferredPoster,
    imdb_rating: 0,
    year: toNumber(item.year, new Date().getFullYear()),
    episodes: Math.max(total, current),
    current_episode: current,
    duration: 0,
    duration_text: '',
    quality: String(item.quality || 'HD'),
    age_rating: 'T13',
    is_series: Math.max(total, current) > 1,
    status: 'ongoing',
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    episodes_data: [],
    servers: [],
    lang: String(item.lang || ''),
    lang_key: [],
    last_episodes: [],
  };
}

function mapKKDetailMovie(kk: KKDetailResponse, requestedSlug: string): Movie {
  const rawMovie = (kk.movie || {}) as Record<string, unknown>;
  const combined = {
    ...rawMovie,
    slug: String(rawMovie.slug || requestedSlug),
    episodes: kk.episodes || [],
  };

  const movie = mapOPhimMovie(combined as any);
  const kkServers = buildKKServers(kk.episodes);

  if (kkServers.length > 0) {
    const firstEpisodes = kkServers[0]?.episodes || [];
    const kkTotal = toNumber(rawMovie.episode_total, 0);
    const kkCurrent = toNumber(rawMovie.episode_current, 0);
    const mergedCurrent = Math.max(kkCurrent, getCurrentEpisodeFromServers(kkServers));

    movie.servers = kkServers;
    movie.episodes_data = firstEpisodes;
    movie.stream_url = firstEpisodes[0]?.link_m3u8 || firstEpisodes[0]?.link_embed || movie.stream_url;
    movie.current_episode = Math.max(mergedCurrent, movie.current_episode, 1);
    movie.episodes = Math.max(kkTotal, mergedCurrent, movie.episodes, movie.current_episode);
  }

  if (typeof rawMovie.poster_url === 'string' || typeof rawMovie.thumb_url === 'string') {
    movie.poster_url = normalizeKKImageUrl(String(rawMovie.poster_url || rawMovie.thumb_url || ''));
    movie.thumb_url = normalizeKKImageUrl(String(rawMovie.thumb_url || rawMovie.poster_url || ''));
  }

  return movie;
}