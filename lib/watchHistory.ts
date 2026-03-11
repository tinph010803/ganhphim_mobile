import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@watch_history_v1';
const MAX_ITEMS = 50;

export interface WatchHistoryEntry {
  movieId: string;       // gtavn _id (or ophim slug if gtavn id not available)
  movieSlug: string;     // ophim slug for navigation
  movieTitle: string;
  posterUrl: string;
  episodeName: string;   // "Tập 1" or "1"
  serverLabel: string;   // server name
  time: number;          // current position in seconds
  duration: number;      // total duration in seconds
  updatedAt: string;     // ISO timestamp
}

export async function getWatchHistory(): Promise<WatchHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchHistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveWatchProgress(
  entry: Omit<WatchHistoryEntry, 'updatedAt'>
): Promise<void> {
  try {
    const list = await getWatchHistory();
    const idx = list.findIndex(
      (e) => e.movieId === entry.movieId && e.episodeName === entry.episodeName
    );
    const updated: WatchHistoryEntry = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_ITEMS))
    );
  } catch {
    // Silently ignore storage errors
  }
}

export async function removeWatchEntry(
  movieId: string,
  episodeName?: string
): Promise<void> {
  try {
    const list = await getWatchHistory();
    const filtered = episodeName
      ? list.filter(
          (e) => !(e.movieId === movieId && e.episodeName === episodeName)
        )
      : list.filter((e) => e.movieId !== movieId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function clearWatchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Format seconds → "mm:ss" or "h:mm:ss" */
export function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
