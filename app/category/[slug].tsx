import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { GENRES, COUNTRIES, YEARS } from '@/constants/filters';
import { getMoviesByCountryPaged, getMoviesByTypePaged, getMoviesByGenrePaged } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieCard } from '@/components/MovieCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 16;
const CARD_INTERNAL_MARGIN = 10;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - CARD_INTERNAL_MARGIN * 3) / 3);

type FilterState = {
  slug: string;
  type: string;
  sort: 'moi-nhat' | 'xem-nhieu';
  genres: string[];   // display names
};

function CollapsibleSection({
  label, badge, children,
}: { label: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={sectionStyles.wrap}>
      <TouchableOpacity style={sectionStyles.header} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Text style={sectionStyles.label}>{label}</Text>
        <View style={sectionStyles.right}>
          {!!badge && <Text style={sectionStyles.badge}>{badge}</Text>}
          {open ? <ChevronUp size={16} color={Colors.textSecondary} /> : <ChevronDown size={16} color={Colors.textSecondary} />}
        </View>
      </TouchableOpacity>
      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  body: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

export default function CategoryScreen() {
  const router = useRouter();
  const { slug, title, type, genres: genresParam, sort: sortParam } = useLocalSearchParams<{
    slug: string;
    title: string;
    type: string;
    genres?: string;
    sort?: string;
  }>();

  const initialFilter: FilterState = {
    slug: slug ?? '',
    type: type ?? 'country',
    sort: (sortParam === 'xem-nhieu' ? 'xem-nhieu' : 'moi-nhat') as 'moi-nhat' | 'xem-nhieu',
    genres: genresParam ? genresParam.split(',').filter(Boolean) : [],
  };

  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // draft state inside modal
  const [draftType, setDraftType] = useState<'list-phim-bo' | 'list-phim-le' | 'country' | 'genre'>('genre');
  const [draftCountry, setDraftCountry] = useState<string>('');
  const [draftGenres, setDraftGenres] = useState<string[]>([]);  // slugs
  const [draftYears, setDraftYears] = useState<number[]>([]);
  const [draftSort, setDraftSort] = useState<'moi-nhat' | 'xem-nhieu'>('moi-nhat');

  const fetchMovies = useCallback(
    async (f: FilterState, pageNum: number) => {
      setLoading(true);
      try {
        let result: { movies: Movie[]; totalPages: number };
        if (f.type === 'list') {
          result = await getMoviesByTypePaged(f.slug, pageNum);
        } else if (f.type === 'genre') {
          result = await getMoviesByGenrePaged(f.slug, pageNum, f.sort);
        } else {
          result = await getMoviesByCountryPaged(f.slug, pageNum);
        }
        setMovies(result.movies);
        setTotalPages(result.totalPages);
      } catch {
        setMovies([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setPage(1);
    fetchMovies(filter, 1);
  }, [filter, fetchMovies]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;
      setPage(newPage);
      fetchMovies(filter, newPage);
    },
    [page, totalPages, filter, fetchMovies],
  );

  const openFilterModal = useCallback(() => {
    // pre-fill draft from current filter
    if (filter.type === 'genre') {
      setDraftType('genre');
      const currentSlugObj = GENRES.find((g) => g.slug === filter.slug);
      setDraftGenres(currentSlugObj ? [filter.slug] : []);
    } else if (filter.type === 'list') {
      setDraftType(filter.slug === 'phim-bo' ? 'list-phim-bo' : 'list-phim-le');
      setDraftGenres([]);
    } else {
      setDraftType('country');
      setDraftCountry(filter.slug);
      setDraftGenres([]);
    }
    setDraftYears([]);
    setDraftSort(filter.sort);
    setFilterModalVisible(true);
  }, [filter]);

  const applyFilter = useCallback(() => {
    setFilterModalVisible(false);
    let newSlug = filter.slug;
    let newType = filter.type;
    let newGenreNames: string[] = [];

    if (draftType === 'list-phim-bo') {
      newSlug = 'phim-bo'; newType = 'list';
    } else if (draftType === 'list-phim-le') {
      newSlug = 'phim-le'; newType = 'list';
    } else if (draftType === 'country' && draftCountry) {
      newSlug = draftCountry; newType = 'country';
    } else if (draftGenres.length > 0) {
      newSlug = draftGenres[0]; newType = 'genre';
      newGenreNames = draftGenres.map((s) => GENRES.find((g) => g.slug === s)?.name ?? s);
    }

    setFilter({ slug: newSlug, type: newType, sort: draftSort, genres: newGenreNames });
  }, [draftType, draftCountry, draftGenres, draftSort, filter]);

  const removeGenre = useCallback((name: string) => {
    setFilter((prev) => {
      const newGenres = prev.genres.filter((g) => g !== name);
      if (prev.type !== 'genre' || newGenres.length > 0) {
        return { ...prev, genres: newGenres };
      }
      // all genres removed — clear filter
      return { ...prev, genres: [] };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilter({ slug: slug ?? '', type: type ?? 'country', sort: 'moi-nhat', genres: [] });
  }, [slug, type]);

  const renderItem = useCallback(
    ({ item }: { item: Movie }) => <MovieCard movie={item} width={CARD_WIDTH} />,
    [],
  );

  const keyExtractor = useCallback((item: Movie) => item.id, []);

  // Active filter chips (genres + sort + clear)
  const activeChips: string[] = [
    ...filter.genres,
    filter.sort === 'xem-nhieu' ? 'Xem nhiều' : 'Mới nhất',
  ];

  const showActiveChips = filter.genres.length > 0 || filter.sort === 'xem-nhieu';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={openFilterModal}
        >
          <SlidersHorizontal size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {showActiveChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeChipsRow}
        >
          {filter.genres.map((name) => (
            <TouchableOpacity
              key={name}
              style={styles.activeChip}
              onPress={() => removeGenre(name)}
              activeOpacity={0.75}
            >
              <Text style={styles.activeChipText}>{name}</Text>
              <X size={12} color={Colors.background} />
            </TouchableOpacity>
          ))}
          {filter.sort === 'xem-nhieu' && (
            <View style={styles.activeChipSort}>
              <Text style={styles.activeChipText}>Xem nhiều</Text>
            </View>
          )}
          <TouchableOpacity style={styles.clearChip} onPress={clearAllFilters} activeOpacity={0.75}>
            <Text style={styles.clearChipText}>Xóa</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Movie Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.text} />
        </View>
      ) : (
        <FlatList
          data={movies}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Pagination */}
      {!loading && movies.length > 0 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
          >
            <Text style={styles.pageBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Trang <Text style={styles.pageNum}>{page}</Text> / {totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
          >
            <Text style={styles.pageBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Advanced Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)} />
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <SlidersHorizontal size={18} color={Colors.text} />
            <Text style={styles.filterModalTitle}>Bộ lọc</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterModalBody}>

            {/* Quốc gia */}
            <CollapsibleSection label="Quốc gia:" badge="Tất cả">
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.slug}
                  style={[styles.filterChip, draftType === 'country' && draftCountry === c.slug && styles.filterChipActive]}
                  onPress={() => { setDraftType('country'); setDraftCountry(c.slug); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, draftType === 'country' && draftCountry === c.slug && styles.filterChipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </CollapsibleSection>

            {/* Loại phim */}
            <CollapsibleSection label="Loại phim:" badge="Tất cả">
              {(['list-phim-le', 'list-phim-bo'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, draftType === t && styles.filterChipActive]}
                  onPress={() => { setDraftType(t); setDraftCountry(''); setDraftGenres([]); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, draftType === t && styles.filterChipTextActive]}>
                    {t === 'list-phim-le' ? 'Phim lẻ' : 'Phim bộ'}
                  </Text>
                </TouchableOpacity>
              ))}
            </CollapsibleSection>

            {/* Thể loại */}
            <CollapsibleSection
              label="Thể loại:"
              badge={draftGenres.length > 0 ? `Đã chọn ${draftGenres.length}` : 'Tất cả'}
            >
              {GENRES.map((g) => {
                const active = draftGenres.includes(g.slug);
                return (
                  <TouchableOpacity
                    key={g.slug}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => {
                      setDraftType('genre');
                      setDraftGenres((prev) =>
                        active ? prev.filter((s) => s !== g.slug) : [...prev, g.slug]
                      );
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </CollapsibleSection>

            {/* Năm sản xuất */}
            <CollapsibleSection label="Năm sản xuất:" badge="Tất cả">
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.filterChip, draftYears.includes(y) && styles.filterChipActive]}
                  onPress={() =>
                    setDraftYears((prev) =>
                      prev.includes(y) ? prev.filter((v) => v !== y) : [...prev, y]
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, draftYears.includes(y) && styles.filterChipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </CollapsibleSection>

            {/* Sắp xếp */}
            <CollapsibleSection label="Sắp xếp:" badge={draftSort === 'moi-nhat' ? 'Mới nhất' : 'Xem nhiều'}>
              {(['moi-nhat', 'xem-nhieu'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, draftSort === s && styles.filterChipActive]}
                  onPress={() => setDraftSort(s)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, draftSort === s && styles.filterChipTextActive]}>
                    {s === 'moi-nhat' ? 'Mới nhất' : 'Xem nhiều'}
                  </Text>
                </TouchableOpacity>
              ))}
            </CollapsibleSection>

          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilter} activeOpacity={0.85}>
            <Text style={styles.applyBtnText}>Lọc kết quả</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  // Active chips
  activeChipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  activeChipSort: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  activeChipText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  clearChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  clearChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
    rowGap: 12,
  },
  row: {},
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBackground,
  },
  pageBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
  },
  pageBtnDisabled: { opacity: 0.35 },
  pageBtnText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  pageInfo: { color: Colors.textSecondary, fontSize: 15 },
  pageNum: { color: Colors.text, fontWeight: '700' },
  // Filter modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  filterModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 28,
    height: '85%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  filterModalBody: {
    paddingBottom: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  applyBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});

