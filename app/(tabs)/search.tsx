import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { getHomeMovies, searchMoviesWithFilters } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GENRES, COUNTRIES, MOVIE_TYPES, SORT_OPTIONS, YEARS } from '@/constants/filters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 8;
const COLS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_GAP * (COLS - 1)) / COLS;

type FilterState = {
  genre: string;
  country: string;
  type: string;
  year: number | null;
  sort: string;
};

const DEFAULT_FILTERS: FilterState = { genre: '', country: '', type: '', year: null, sort: '' };

function countActive(f: FilterState) {
  return [f.genre, f.country, f.type, f.year != null ? '1' : '', f.sort].filter(Boolean).length;
}

// ─── Movie Card ───────────────────────────────────────────────────────────────
function SearchMovieCard({ movie }: { movie: Movie }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/movie/[id]', params: { id: movie.slug || movie.id } } as any)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: movie.thumb_url }} style={styles.poster} resizeMode="cover" />
        {!!movie.current_episode && (
          <View style={styles.episodeBadge}>
            <Text style={styles.episodeText}>
              {!isNaN(Number(movie.current_episode))
                ? `Tập ${movie.current_episode}`
                : String(movie.current_episode)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{movie.title}</Text>
      {!!movie.title_en && (
        <Text style={styles.cardSub} numberOfLines={1}>{movie.title_en}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────
function FilterModal({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible]);

  const toggleStr = (key: 'genre' | 'country' | 'type' | 'sort', slug: string) =>
    setDraft((d) => ({ ...d, [key]: d[key] === slug ? '' : slug }));

  const toggleYear = (y: number) =>
    setDraft((d) => ({ ...d, year: d.year === y ? null : y }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={fm.overlay}>
        <Pressable style={fm.backdrop} onPress={onClose} />
        <View style={[fm.sheet, { maxHeight: SCREEN_HEIGHT * 0.78, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle */}
          <View style={fm.handle} />

          {/* Title row */}
          <View style={fm.titleRow}>
            <Text style={fm.title}>Lọc phim</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Loại phim */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Loại phim</Text>
              <View style={fm.pillWrap}>
                {MOVIE_TYPES.map((t) => {
                  const active = draft.type === t.slug;
                  return (
                    <TouchableOpacity
                      key={t.slug}
                      style={[fm.pill, active && fm.pillActive]}
                      onPress={() => toggleStr('type', t.slug)}
                    >
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Thể loại */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Thể loại</Text>
              <View style={fm.pillWrap}>
                {GENRES.map((g) => {
                  const active = draft.genre === g.slug;
                  return (
                    <TouchableOpacity
                      key={g.slug}
                      style={[fm.pill, active && fm.pillActive]}
                      onPress={() => toggleStr('genre', g.slug)}
                    >
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quốc gia */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Quốc gia</Text>
              <View style={fm.pillWrap}>
                {COUNTRIES.map((c) => {
                  const active = draft.country === c.slug;
                  return (
                    <TouchableOpacity
                      key={c.slug}
                      style={[fm.pill, active && fm.pillActive]}
                      onPress={() => toggleStr('country', c.slug)}
                    >
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Năm */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Năm</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fm.pillRow}>
                {YEARS.map((y) => {
                  const active = draft.year === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[fm.pill, active && fm.pillActive]}
                      onPress={() => toggleYear(y)}
                    >
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sắp xếp */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Sắp xếp theo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fm.pillRow}>
                {SORT_OPTIONS.map((s) => {
                  const active = draft.sort === s.value;
                  return (
                    <TouchableOpacity
                      key={s.value}
                      style={[fm.pill, active && fm.pillActive]}
                      onPress={() => toggleStr('sort', s.value)}
                    >
                      <Text style={[fm.pillText, active && fm.pillTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={fm.btnRow}>
            <TouchableOpacity style={fm.resetBtn} onPress={() => setDraft(DEFAULT_FILTERS)} activeOpacity={0.7}>
              <Text style={fm.resetText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fm.applyBtn} onPress={() => onApply(draft)} activeOpacity={0.85}>
              <Text style={fm.applyText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Search Screen ────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCount = countActive(filters);

  useEffect(() => {
    getHomeMovies()
      .then((movies) => setTrending(movies.slice(0, 9)))
      .catch(() => {})
      .finally(() => setLoadingTrend(false));
  }, []);

  const doSearch = useCallback((kw: string, f: FilterState) => {
    const hasFilters = !!(f.genre || f.country || f.type || f.year || f.sort);
    if (!kw.trim() && !hasFilters) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchMoviesWithFilters({
      keyword: kw.trim() || undefined,
      genre: f.genre || undefined,
      country: f.country || undefined,
      type: f.type || undefined,
      year: f.year,
      sort: f.sort || undefined,
    })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text, filters), 400);
  };

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setShowFilter(false);
    doSearch(query, newFilters);
  };

  const isActive = query.trim().length > 0 || activeCount > 0;
  const displayList = isActive ? results : trending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="rgba(255,255,255,0.45)" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm phim, diễn viên"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              doSearch(query, filters);
            }}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => { setQuery(''); doSearch('', filters); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilter(true)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={18} color={activeCount > 0 ? Colors.primary : Colors.text} />
          <Text style={[styles.filterLabel, activeCount > 0 && { color: Colors.primary }]}>Lọc</Text>
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Section label */}
      <Text style={styles.sectionLabel}>
        {isActive
          ? query.trim()
            ? `Kết quả cho "${query}"`
            : 'Kết quả lọc'
          : 'Được tìm kiếm nhiều'}
      </Text>

      {/* Grid */}
      {searching || (loadingTrend && !isActive) ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : isActive && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Không tìm thấy phim nào</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.slug ?? item.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <SearchMovieCard movie={item} />}
        />
      )}

      <FilterModal
        visible={showFilter}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: { color: 'rgba(255,255,255,0.45)', fontSize: 13, paddingLeft: 6 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(117,243,200,0.1)',
  },
  filterLabel: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  filterBadge: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 1,
  },
  filterBadgeText: { color: '#07113A', fontSize: 10, fontWeight: '800' },

  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: { width: CARD_WIDTH },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground,
  },
  poster: { width: '100%', height: '100%' },
  episodeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  episodeText: { color: Colors.text, fontSize: 11, fontWeight: '600' },
  cardTitle: { color: Colors.text, fontSize: 12, fontWeight: '600', marginTop: 6, lineHeight: 16 },
  cardSub: { color: Colors.textSecondary, fontSize: 10, marginTop: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});

// ─── Filter Modal Styles ──────────────────────────────────────────────────────
const fm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#0e1535',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#07113A', fontWeight: '700' },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resetText: { color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '600' },
  applyBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  applyText: { color: '#07113A', fontSize: 15, fontWeight: '700' },
});