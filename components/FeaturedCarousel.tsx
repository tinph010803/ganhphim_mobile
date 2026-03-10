import { memo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { Movie } from '@/types/movie';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.58, 260);
const CARD_GAP = 12;
const SNAP_SIZE = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

interface FeaturedCarouselProps {
  movies: Movie[];
}

export const FeaturedCarousel = memo(function FeaturedCarousel({ movies }: FeaturedCarouselProps) {
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const openMovieDetail = useCallback((movie: Movie) => {
    const targetId = movie.slug || movie.id;
    if (!targetId) return;
    router.push({ pathname: '/movie/[id]', params: { id: targetId } });
  }, [router]);

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(movies.length - 1, Math.round(contentOffsetX / SNAP_SIZE)));
    if (index !== activeIndexRef.current) {
      activeIndexRef.current = index;
      setActiveIndex(index);
    }
  }, [movies.length]);

  const keyExtractor = useCallback((item: Movie) => item.id, []);

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Movie>) => (
    <View style={[styles.slide, index === movies.length - 1 && styles.lastSlide]}>
      <LinearGradient
        colors={['rgba(255,35,25,0.45)', 'rgba(255,35,25,0.06)', 'transparent']}
        style={styles.posterGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Image
        source={{ uri: item.poster_url }}
        style={styles.poster}
        resizeMode="cover"
      />
    </View>
  ), [movies.length]);

  const renderDots = useCallback(() => (
    <View style={styles.dotsContainer}>
      {movies.map((_, index) => (
        <View
          key={index}
          style={[styles.dot, index === activeIndex && styles.activeDot]}
        />
      ))}
    </View>
  ), [movies, activeIndex]);

  if (movies.length === 0) return null;

  const featuredMovie = movies[activeIndex];

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={movies}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={SNAP_SIZE}
        decelerationRate="fast"
        removeClippedSubviews
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
      />

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {featuredMovie.title}
        </Text>
        <Text style={styles.subtitle}>{featuredMovie.title_en}</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => openMovieDetail(featuredMovie)}
            activeOpacity={0.8}
          >
            <Play size={16} color="#07113A" fill="#07113A" />
            <Text style={styles.primaryButtonText}>Xem Phim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => openMovieDetail(featuredMovie)}
            activeOpacity={0.8}
          >
            <Info size={16} color="#07113A" />
            <Text style={styles.secondaryButtonText}>Thông tin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badges}>
          {featuredMovie.imdb_rating > 0 && (
            <View style={[styles.badge, styles.imdbBadge]}>
              <Text style={[styles.badgeText, styles.imdbBadgeText]}>
                IMDb {featuredMovie.imdb_rating.toFixed(1)}
              </Text>
            </View>
          )}
          {featuredMovie.age_rating && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{featuredMovie.age_rating}</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{featuredMovie.year}</Text>
          </View>
          {featuredMovie.is_series && featuredMovie.current_episode > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Tập {featuredMovie.current_episode}</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {featuredMovie.description}
        </Text>
      </View>

      {renderDots()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: SIDE_PADDING,
  },
  slide: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CARD_WIDTH * 1.42,
  },
  lastSlide: {
    marginRight: 0,
  },
  posterGlow: {
    position: 'absolute',
    width: CARD_WIDTH * 0.96,
    height: CARD_WIDTH * 1.32,
    borderRadius: 30,
    top: 0,
    zIndex: 1,
  },
  poster: {
    zIndex: 2,
    width: CARD_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  infoContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 7,
  },
  primaryButton: {
    backgroundColor: '#A1F8DE',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#07113A',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#07113A',
    fontSize: 14,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(15, 22, 70, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  imdbBadge: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  badgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  imdbBadgeText: {
    color: '#1A1A1A',
  },
  description: {
    color: '#D0D8F2',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(201, 208, 235, 0.35)',
  },
  activeDot: {
    width: 26,
    backgroundColor: Colors.white,
  },
});
