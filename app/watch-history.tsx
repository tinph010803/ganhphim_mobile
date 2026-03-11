import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Play, Trash2, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import {
  WatchHistoryEntry,
  getWatchHistory,
  removeWatchEntry,
  clearWatchHistory,
  formatTime,
} from '@/lib/watchHistory';

export default function WatchHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [userId])
  );

  async function loadHistory() {
    setLoading(true);
    const list = await getWatchHistory(userId);
    setHistory(list);
    setLoading(false);
  }

  function handleRemove(item: WatchHistoryEntry) {
    removeWatchEntry(item.movieId, item.episodeName, userId);
    setHistory((prev) =>
      prev.filter(
        (e) => !(e.movieId === item.movieId && e.episodeName === item.episodeName)
      )
    );
  }

  function handleClearAll() {
    Alert.alert('Xoá lịch sử', 'Xoá toàn bộ lịch sử xem?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá tất cả',
        style: 'destructive',
        onPress: async () => {
          await clearWatchHistory(userId);
          setHistory([]);
        },
      },
    ]);
  }

  function handleResume(item: WatchHistoryEntry) {
    // Navigate to movie detail first, player is opened from there
    // We pass initialTime via query so [id].tsx can open player directly
    router.push({
      pathname: '/movie/[id]',
      params: {
        id: item.movieSlug,
        resumeTime: String(Math.floor(item.time)),
        resumeEpisode: item.episodeName,
        resumeServer: item.serverLabel,
      },
    } as any);
  }

  const progressPct = (item: WatchHistoryEntry) =>
    item.duration > 0 ? Math.min(1, item.time / item.duration) : 0;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${Math.floor(hrs / 24)} ngày trước`;
  };

  function renderItem({ item }: { item: WatchHistoryEntry }) {
    const pct = progressPct(item);
    const isFinished = pct >= 0.95;

    return (
      <View style={styles.item}>
        <TouchableOpacity
          style={styles.posterWrap}
          onPress={() => handleResume(item)}
          activeOpacity={0.85}
        >
          {item.posterUrl ? (
            <Image
              source={{ uri: item.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.poster, styles.posterPlaceholder]}>
              <Clock size={24} color={Colors.textSecondary} />
            </View>
          )}
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(pct * 100).toFixed(0)}%` as any,
                  backgroundColor: isFinished ? Colors.primary : '#e53e3e',
                },
              ]}
            />
          </View>
          {/* Play overlay */}
          <View style={styles.playOverlay} pointerEvents="none">
            <Play size={18} fill="#fff" color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.info}>
          <TouchableOpacity onPress={() => handleResume(item)} activeOpacity={0.8}>
            <Text style={styles.title} numberOfLines={2}>
              {item.movieTitle}
            </Text>
          </TouchableOpacity>
          <Text style={styles.episode}>
            {item.episodeName
              ? `Tập ${item.episodeName}`
              : 'Tập 1'}
            {item.serverLabel ? ` • ${item.serverLabel}` : ''}
          </Text>
          <Text style={styles.timeInfo}>
            {formatTime(item.time)} / {formatTime(item.duration)}
          </Text>
          <Text style={styles.timeAgo}>{timeAgo(item.updatedAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử xem</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearBtn}>Xoá tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Đang tải...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Clock size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>Chưa có lịch sử xem</Text>
          <Text style={styles.emptyText}>
            Phim bạn xem sẽ tự động lưu ở đây
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.movieId}-${item.episodeName}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const POSTER_W = 90;
const POSTER_H = POSTER_W * 1.45;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  clearBtn: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '600',
  },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },

  posterWrap: {
    width: POSTER_W,
    height: POSTER_H,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    flexShrink: 0,
  },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 3,
  },
  playOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  info: { flex: 1, paddingTop: 2, gap: 4 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  episode: { fontSize: 12, color: Colors.textSecondary },
  timeInfo: { fontSize: 12, color: Colors.textSecondary },
  timeAgo: { fontSize: 11, color: Colors.border },

  removeBtn: {
    paddingTop: 4,
    paddingLeft: 4,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
