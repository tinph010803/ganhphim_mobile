import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { GENRES } from '@/constants/filters';
import { getHomeMovies, getMoviesByCountry, getMoviesByType } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { MovieSection } from '@/components/MovieSection';
import { Bell, ChevronDown, ChevronRight, Settings, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const FILTER_OPTIONS = ['Đề xuất', 'Phim bộ', 'Phim lẻ', 'Thể loại'];

const INTEREST_CATEGORIES = [
  { id: '1', title: 'Marvel Studios', color: '#CC1A1A', secondColor: '#8B0000' },
  { id: '2', title: 'Thuyết Minh Tuổi Thơ', color: '#1A56DB', secondColor: '#0D3B9E' },
  { id: '3', title: 'Hoạt Hình', color: '#7E3AF2', secondColor: '#5521B5' },
  { id: '4', title: 'Phim Hành Động', color: '#E3780B', secondColor: '#A85200' },
  { id: '5', title: 'Tâm Lý Tình Cảm', color: '#0D7C6A', secondColor: '#075449' },
];

type SectionConfig = {
  key: string;
  title: string;
  fetchFn: () => Promise<Movie[]>;
  navSlug: string;
  navType: 'country' | 'list';
};

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'korean', title: 'Phim Hàn Quốc mới', fetchFn: () => getMoviesByCountry('han-quoc'), navSlug: 'han-quoc', navType: 'country' },
  { key: 'chinese', title: 'Phim Trung Quốc mới', fetchFn: () => getMoviesByCountry('trung-quoc'), navSlug: 'trung-quoc', navType: 'country' },
  { key: 'western', title: 'Phim US-UK mới', fetchFn: () => getMoviesByCountry('au-my'), navSlug: 'au-my', navType: 'country' },
  { key: 'theater', title: 'Phim Điện Ảnh Mới Coóng', fetchFn: () => getMoviesByType('phim-le'), navSlug: 'phim-le', navType: 'list' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState('Đề xuất');
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [top10Movies, setTop10Movies] = useState<Movie[]>([]);
  const [sectionMovies, setSectionMovies] = useState<Record<string, Movie[]>>({});
  const [genreModalVisible, setGenreModalVisible] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreSort, setGenreSort] = useState<'moi-nhat' | 'xem-nhieu'>('moi-nhat');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const [home, ...sections] = await Promise.all([
          getHomeMovies(),
          ...SECTION_CONFIGS.map((s) => s.fetchFn()),
        ]);
        setFeaturedMovies(home.slice(0, 8));
        setTop10Movies(home.slice(0, 10));
        const movies: Record<string, Movie[]> = {};
        SECTION_CONFIGS.forEach((s, i) => { movies[s.key] = sections[i].slice(0, 12); });
        setSectionMovies(movies);
      } catch (e) {
        console.error(e);
      } finally {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    })();
  }, []);

  const renderSection = useCallback(
    ({ item }: { item: SectionConfig }) => {
      const movies = sectionMovies[item.key];
      if (!movies?.length) return null;
      return (
        <MovieSection
          title={item.title}
          movies={movies}
          onSeeAll={() =>
            router.push({
              pathname: '/category/[slug]',
              params: { slug: item.navSlug, title: item.title, type: item.navType },
            })
          }
        />
      );
    },
    [sectionMovies, router],
  );

  const sectionKeyExtractor = useCallback((item: SectionConfig) => item.key, []);

  const handleFilterPress = useCallback((option: string) => {
    if (option === 'Phim bộ') {
      router.push({ pathname: '/category/[slug]', params: { slug: 'phim-bo', title: 'Phim bộ', type: 'list' } } as any);
    } else if (option === 'Phim lẻ') {
      router.push({ pathname: '/category/[slug]', params: { slug: 'phim-le', title: 'Phim lẻ', type: 'list' } } as any);
    } else if (option === 'Thể loại') {
      setSelectedGenres([]);
      setGenreSort('moi-nhat');
      setGenreModalVisible(true);
    } else {
      setSelectedFilter(option);
    }
  }, [router]);

  const handleGenreApply = useCallback(() => {
    setGenreModalVisible(false);
    const primary = selectedGenres[0];
    if (!primary) return;
    const genreObj = GENRES.find((g) => g.slug === primary);
    const genreNames = selectedGenres
      .map((s) => GENRES.find((g) => g.slug === s)?.name ?? s)
      .join(',');
    router.push({
      pathname: '/category/[slug]',
      params: {
        slug: primary,
        title: 'Thể loại',
        type: 'genre',
        genres: genreNames,
        sort: genreSort,
      },
    } as any);
  }, [selectedGenres, genreSort, router]);

  const renderTop10Card = useCallback(({ item, index }: { item: Movie; index: number }) => (
    <TouchableOpacity
      style={styles.top10Card}
      activeOpacity={0.75}
      onPress={() => {
        const id = item.slug || item.id;
        if (id) router.push({ pathname: '/movie/[id]', params: { id } });
      }}
    >
      <View style={styles.top10ImageWrap}>
        <Image source={{ uri: item.thumb_url }} style={styles.top10Poster} resizeMode="cover" />
        <View style={styles.top10RankWrap}>
          <Text style={styles.top10Rank}>{index + 1}</Text>
        </View>
        <View style={styles.episodeBadgeSmall}>
          <Text style={styles.episodeBadgeSmallText}>PĐ.{item.current_episode}</Text>
        </View>
      </View>
      <Text style={styles.top10Title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.top10TitleEn} numberOfLines={1}>{item.title_en}</Text>
    </TouchableOpacity>
  ), [router]);

  const listHeader = useMemo(() => (
      <Animated.View style={{ opacity: fadeAnim }}>
        {featuredMovies.length > 0 && <FeaturedCarousel movies={featuredMovies} />}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bạn đang quan tâm gì?</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollContent} nestedScrollEnabled>
            {INTEREST_CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.id} activeOpacity={0.8} style={styles.categoryCard}>
                <LinearGradient colors={[cat.color, cat.secondColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.categoryGradient}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
  ), [featuredMovies, fadeAnim]);

  const listFooter = useMemo(() => {
    if (!top10Movies.length) return null;
    return (
      <View style={[styles.sectionContainer, styles.footerPadding]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top 10 phim bộ hôm nay</Text>
        </View>
        <FlatList
          horizontal
          data={top10Movies}
          keyExtractor={(item) => item.id}
          renderItem={renderTop10Card}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.top10ScrollContent}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={3}
          removeClippedSubviews
          nestedScrollEnabled
          scrollEventThrottle={16}
        />
      </View>
    );
  }, [top10Movies, renderTop10Card]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['rgba(255, 62, 30, 0.36)', 'rgba(255, 62, 30, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGlow}
      />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: 'https://i.ibb.co/dJ7CJ8Pf/logo-ganh-removebg-preview.png' }} style={styles.logo} />
          <View>
            <Text style={styles.logoTitle}>Gánh Phim</Text>
            <Text style={styles.logoSubtitle}>Phim hay cả gánh</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Bell size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Settings size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, selectedFilter === option && styles.filterButtonActive]}
              onPress={() => handleFilterPress(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterButtonText, selectedFilter === option && styles.filterButtonTextActive]}>
                {option}
              </Text>
              {option === 'Thể loại' && (
                <ChevronDown size={14} color={selectedFilter === option ? Colors.background : Colors.text} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={SECTION_CONFIGS}
        keyExtractor={sectionKeyExtractor}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={5}
        style={styles.scrollView}
      />

      {/* Genre picker modal */}
      <Modal
        visible={genreModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGenreModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setGenreModalVisible(false)} />
        <View style={styles.genreModal}>
          <View style={styles.genreModalHeader}>
            <Text style={styles.genreModalTitle}>Thể loại</Text>
            <TouchableOpacity onPress={() => setGenreModalVisible(false)}>
              <X size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.genreChipWrap} showsVerticalScrollIndicator={false}>
            {GENRES.map((g) => {
              const active = selectedGenres.includes(g.slug);
              return (
                <TouchableOpacity
                  key={g.slug}
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() =>
                    setSelectedGenres((prev) =>
                      active ? prev.filter((s) => s !== g.slug) : [...prev, g.slug]
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.genreSortRow}>
            {(['moi-nhat', 'xem-nhieu'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortChip, genreSort === s && styles.sortChipActive]}
                onPress={() => setGenreSort(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortChipText, genreSort === s && styles.sortChipTextActive]}>
                  {s === 'moi-nhat' ? 'Mới nhất' : 'Xem nhiều'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, selectedGenres.length === 0 && styles.applyBtnDisabled]}
            onPress={handleGenreApply}
            activeOpacity={0.85}
            disabled={selectedGenres.length === 0}
          >
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
  heroGlow: {
    position: 'absolute',
    top: -90,
    left: -80,
    right: -80,
    height: 360,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  logoTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  logoSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 23, 69, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  filterButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: Colors.background,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  // Interest categories
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryCard: {
    width: 150,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  categoryTitle: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  // Top 10
  top10ScrollContent: {
    paddingHorizontal: 16,
    gap: 0,
  },
  top10Card: {
    width: 110,
    marginRight: 10,
  },
  top10ImageWrap: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground,
  },
  top10Poster: {
    width: '100%',
    height: '100%',
  },
  top10RankWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 4,
    paddingLeft: 6,
  },
  top10Rank: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 56,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  episodeBadgeSmall: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  episodeBadgeSmallText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  top10Title: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 16,
  },
  top10TitleEn: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  footerPadding: {
    paddingBottom: 24,
  },

  // Genre modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  genreModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  genreModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  genreModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  genreChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
  },
  genreChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genreChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  genreChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  genreSortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
});
