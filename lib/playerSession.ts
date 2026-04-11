type PlayerEpisode = { name: string; link_embed: string; link_m3u8: string };
type PlayerServer = { name: string; episodes: PlayerEpisode[] };

type SessionEntry = {
  servers: PlayerServer[];
  createdAt: number;
};

const STORE_LIMIT = 30;
const store = new Map<string, SessionEntry>();

function makeKey(): string {
  return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pruneStore(): void {
  if (store.size <= STORE_LIMIT) return;
  const entries = Array.from(store.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
  const removeCount = store.size - STORE_LIMIT;
  for (let i = 0; i < removeCount; i += 1) {
    const key = entries[i]?.[0];
    if (key) store.delete(key);
  }
}

export function stashPlayerServers(servers: PlayerServer[]): string {
  const key = makeKey();
  store.set(key, { servers, createdAt: Date.now() });
  pruneStore();
  return key;
}

export function takePlayerServers(key?: string): PlayerServer[] | null {
  if (!key) return null;
  const found = store.get(key);
  return found?.servers ?? null;
}
