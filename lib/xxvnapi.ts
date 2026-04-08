export type XxvnEpisode = {
  name: string;
  slug: string;
  link: string;
};

export type XxvnServer = {
  server_name: string;
  server_data: XxvnEpisode[];
};

export type XxvnCategory = {
  id: string;
  name: string;
  slug: string;
};

export type XxvnMovie = {
  id: string;
  name: string;
  slug: string;
  content: string;
  type: string;
  status: string;
  thumb_url: string;
  time: string;
  quality: string;
  lang: string | null;
  actors: string[];
  categories: XxvnCategory[];
  episodes: XxvnServer[];
};

type ListResponse = {
  status: boolean;
  msg: string;
  page?: number;
  movies: XxvnMovie[];
};

type DetailResponse = {
  status: boolean;
  msg: string;
  movie: XxvnMovie;
};

const XXVN_BASE_URL = 'https://www.xxvnapi.com/api';

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getGanh18Movies(page = 1): Promise<XxvnMovie[]> {
  const data = await getJson<ListResponse>(`${XXVN_BASE_URL}/chuyen-muc/hiep-dam?page=${page}`);
  return Array.isArray(data.movies) ? data.movies : [];
}

export async function getGanh18LatestMovies(page = 1): Promise<XxvnMovie[]> {
  const data = await getJson<ListResponse>(`${XXVN_BASE_URL}/phim-moi-cap-nhat?page=${page}`);
  return Array.isArray(data.movies) ? data.movies : [];
}

export async function getGanh18MoviesByCategory(slug: string, page = 1): Promise<XxvnMovie[]> {
  if (!slug) return [];
  const data = await getJson<ListResponse>(`${XXVN_BASE_URL}/chuyen-muc/${slug}?page=${page}`);
  return Array.isArray(data.movies) ? data.movies : [];
}

export async function getGanh18MovieBySlug(slug: string): Promise<XxvnMovie | null> {
  if (!slug) return null;
  const data = await getJson<DetailResponse>(`${XXVN_BASE_URL}/phim/${slug}`);
  return data.movie ?? null;
}
