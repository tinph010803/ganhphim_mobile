import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, PackageOpen } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

const ROPHIM_API = 'https://rophimm.me/baseapi/api/v1';
const WINDOW_SIZE = 15;
const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildInitialDays(from: Date, count: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    result.push(d);
  }
  return result;
}

function isSameday(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type ShowtimeItem = {
  id: number;
  episode: string;
  show_date: string;
  show_time: string | null;
  movie: {
    id: number;
    name: string;
    slug: string;
    thumbnail: string;
    poster: string;
  };
};

export default function ScheduleScreen() {
  const router = useRouter();
  const today = useRef(new Date()).current;
  const [days, setDays] = useState<Date[]>(() => buildInitialDays(today, WINDOW_SIZE));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [items, setItems] = useState<ShowtimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dateBarRef = useRef<ScrollView>(null);

  const fetchSchedule = useCallback(async (date: Date) => {
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch(`${ROPHIM_API}/showtimes/by-date/${toDateStr(date)}`);
      if (!res.ok) throw new Error('API error');
      const data: ShowtimeItem[] = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(selectedDay);
  }, [selectedDay, fetchSchedule]);

  useEffect(() => {
    const idx = days.findIndex((d) => isSameday(d, selectedDay));
    if (idx >= 0 && dateBarRef.current) {
      dateBarRef.current.scrollTo({ x: Math.max(0, idx * 68 - 16), animated: true });
    }
  }, [selectedDay, days]);

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day);
    const lastDay = days[days.length - 1];
    if (isSameday(day, lastDay)) {
      const next = new Date(lastDay);
      next.setDate(lastDay.getDate() + 1);
      setDays((prev) => [...prev, ...buildInitialDays(next, WINDOW_SIZE)]);
    }
  };

  const renderDateItem = (day: Date, idx: number) => {
    const isSelected = isSameday(day, selectedDay);
    const isToday = isSameday(day, today);
    const dayName = isToday ? 'Hôm nay' : DAY_NAMES[day.getDay()];
    const dd = String(day.getDate()).padStart(2, '0');
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    return (
      <TouchableOpacity
        key={idx}
        style={[styles.dateItem, isSelected && styles.dateItemActive]}
        onPress={() => handleSelectDay(day)}
        activeOpacity={0.75}
      >
        <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{dd}/{mm}</Text>
        <Text style={[styles.dateName, isSelected && styles.dateNameActive]}>{dayName}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = useCallback(({ item }: { item: ShowtimeItem }) => (
    <TouchableOpacity
      style={styles.movieCard}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: '/movie/[id]', params: { id: item.movie.slug } } as any)}
    >
      <Image
        source={{ uri: item.movie.poster || item.movie.thumbnail }}
        style={styles.movieThumb}
        resizeMode="cover"
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieName} numberOfLines={2}>{item.movie.name}</Text>
        <Text style={styles.movieEpisode}>{item.episode}</Text>
      </View>
    </TouchableOpacity>
  ), [router]);

  const keyExtractor = useCallback((item: ShowtimeItem) => String(item.id), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Calendar size={20} color={Colors.text} />
        <Text style={styles.headerTitle}>Lịch chiếu</Text>
      </View>

      <View style={styles.dateBarWrapper}>
        <ScrollView
          ref={dateBarRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateBarContent}
        >
          {days.map((day, idx) => renderDateItem(day, idx))}
        </ScrollView>
        <View style={styles.dateBarBorder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <PackageOpen size={48} color={Colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Hôm nay không có lịch chiếu nào!</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    marginRight: 2,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dateBarWrapper: {
    height: 56,
  },
  dateBarContent: {
    paddingHorizontal: 8,
  },
  dateBarBorder: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dateItem: {
    width: 68,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dateItemActive: {
    borderBottomColor: Colors.primary,
  },
  dateNum: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  dateNumActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dateName: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  dateNameActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  movieThumb: {
    width: 130,
    height: 85,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
  },
  movieInfo: {
    flex: 1,
    gap: 8,
  },
  movieName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  movieEpisode: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
