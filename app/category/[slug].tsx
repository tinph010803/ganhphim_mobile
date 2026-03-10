import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { getMoviesByCountryPaged, getMoviesByTypePaged } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieCard } from '@/components/MovieCard';

// MovieCard has marginRight: 10 internally — account for it in card width calculation
const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 16;
const CARD_INTERNAL_MARGIN = 10;
// 3 columns: total = H_PADDING*2 + 3*(CARD_WIDTH + CARD_INTERNAL_MARGIN)
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - H_PADDING * 2 - CARD_INTERNAL_MARGIN * 3) / 3);

export default function CategoryScreen() {
  const router = useRouter();
  const { slug, title, type } = useLocalSearchParams<{
    slug: string;
    title: string;
    type: string;
  }>();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const result =
          type === 'list'
            ? await getMoviesByTypePaged(slug, pageNum)
            : await getMoviesByCountryPaged(slug, pageNum);
        setMovies(result.movies);
        setTotalPages(result.totalPages);
      } catch {
        setMovies([]);
      } finally {
        setLoading(false);
      }
    },
    [slug, type],
  );

  useEffect(() => {
    fetchMovies(1);
  }, [fetchMovies]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;
      setPage(newPage);
      fetchMovies(newPage);
    },
    [page, totalPages, fetchMovies],
  );

  const renderItem = useCallback(
    ({ item }: { item: Movie }) => <MovieCard movie={item} width={CARD_WIDTH} />,
    [],
  );

  const keyExtractor = useCallback((item: Movie) => item.id, []);

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
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <SlidersHorizontal size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

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
  row: {
    // Cards have built-in marginRight: 10; this aligns them to the left edge
  },
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
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageBtnText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  pageInfo: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  pageNum: {
    color: Colors.text,
    fontWeight: '700',
  },
});
