import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Movie } from '@/types/movie';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 320);
const CARD_GAP = 14;
const SNAP_SIZE = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

interface FeaturedCarouselProps {
  movies: Movie[];
}

export function FeaturedCarousel({ movies }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  const openMovieDetail = (movie: Movie) => {
    const targetId = movie.slug || movie.id;
    if (!targetId) return;

    router.push({
      pathname: '/movie/[id]',
      params: { id: targetId },
    });
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(movies.length - 1, Math.round(contentOffsetX / SNAP_SIZE)));
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {movies.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
    );
  };

  if (movies.length === 0) return null;

  const featuredMovie = movies[activeIndex];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={SNAP_SIZE}
        decelerationRate="fast"
        removeClippedSubviews
        contentContainerStyle={styles.scrollContent}
      >
        {movies.map((movie, index) => (
          <View key={movie.id} style={[styles.slide, index === movies.length - 1 && styles.lastSlide]}>
            <LinearGradient
              colors={['rgba(255,35,25,0.45)', 'rgba(255,35,25,0.06)', 'transparent']}
              style={styles.posterGlow}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <Image
              source={{ uri: movie.poster_url }}
              style={styles.poster}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

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
            <Play size={20} color={Colors.background} fill={Colors.background} />
            <Text style={styles.primaryButtonText}>Xem phim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => openMovieDetail(featuredMovie)}
            activeOpacity={0.8}
          >
            <Info size={20} color={Colors.text} />
            <Text style={styles.secondaryButtonText}>Thông tin</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badges}>
          {featuredMovie.imdb_rating > 0 && (
            <View style={[styles.badge, styles.imdbBadge]}>
              <Text style={styles.badgeText}>
                IMDb {featuredMovie.imdb_rating}
              </Text>
            </View>
          )}
          {featuredMovie.quality && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{featuredMovie.quality}</Text>
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
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {featuredMovie.description}
        </Text>
      </View>

      {renderDots()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 28,
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
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  infoContainer: {
    paddingHorizontal: 18,
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 47 / 2,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#A1F8DE',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0A1238',
    fontSize: 16,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(12,18,56,0.2)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
  },
  imdbBadge: {
    backgroundColor: 'rgba(25, 255, 170, 0.14)',
    borderColor: '#49E4A6',
  },
  badgeText: {
    color: '#0C1644',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#D0D8F2',
    fontSize: 17 / 1.1,
    lineHeight: 26,
    marginTop: 12,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(201, 208, 235, 0.35)',
  },
  activeDot: {
    width: 34,
    backgroundColor: Colors.white,
  },
});
