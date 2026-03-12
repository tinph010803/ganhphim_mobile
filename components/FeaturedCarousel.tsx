import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Movie } from '@/types/movie';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getMovieBySlug } from '@/lib/ophim';
import {
  FeaturedOverride,
  loadFeaturedOverrides,
  overridesToRecord,
} from '@/lib/featuredOverrides';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const BANNER_H = Math.round(Math.min(W * 0.60, SCREEN_H * 0.42));
const EMPTY_OV: Omit<FeaturedOverride, 'slug'> = {};

const BannerSlide = memo(function BannerSlide({
  movie,
  active,
  ov,
}: {
  movie: Movie;
  active: boolean;
  ov: Omit<FeaturedOverride, 'slug'>;
}) {
  const router = useRouter();
  const slug = movie.slug || movie.id;

  const bgScale = useRef(new Animated.Value(1)).current;
  const charX = useRef(new Animated.Value(50)).current;
  const charO = useRef(new Animated.Value(0)).current;
  const titleO = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!active) {
      // Reset animations when not active
      bgScale.setValue(1);
      charX.setValue(50);
      charO.setValue(0);
      titleO.setValue(0);
      titleY.setValue(10);
      return;
    }

    Animated.timing(bgScale, {
      toValue: 1.05,
      duration: 3500,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(charX, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(charO, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(titleO, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  const bgUri = ov.bg || movie.thumb_url || movie.poster_url;
  const charUri = ov.character;
  const titleUri = ov.titleImg;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={styles.slide}
      onPress={() =>
        router.push({ pathname: '/movie/[id]', params: { id: slug } })
      }
    >
      <Animated.View style={[styles.bg, { transform: [{ scale: bgScale }] }]}>
        <Animated.Image
          source={{ uri: bgUri }}
          style={{ width: W, height: BANNER_H }}
          resizeMode="cover"
          fadeDuration={0}
        />
      </Animated.View>

      {/* Bottom Gradient — subtle fade only */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.35)',
          'rgba(0,0,0,0.65)',
        ]}
        locations={[0, 0.65, 1]}
        style={styles.gradBottom}
      />

      {/* Top Gradient — subtle dark vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={styles.gradTop}
      />

      {/* Left Gradient — pushes darkness left so text is readable */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.85)',
          'rgba(0,0,0,0.55)',
          'rgba(0,0,0,0.15)',
          'transparent',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={styles.gradLeft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      {charUri && (
        <Animated.View
          style={[
            styles.character,
            {
              width: W * (ov.charW ?? 0.60),
              height: BANNER_H * (ov.charH ?? 1.1),
              right: ov.charRight ?? -10,
              bottom: ov.charBottom ?? 0,
              opacity: charO,
              transform: [{ translateX: charX }],
            },
          ]}
        >
          <Animated.Image
            source={{ uri: charUri }}
            style={StyleSheet.absoluteFill as any}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Animated.View>
      )}

      {/* Content — left side overlay */}
      <View style={styles.content}>
        {/* Title image or fallback text */}
        {titleUri ? (
          <Animated.Image
            source={{ uri: titleUri }}
            style={[
              styles.titleImg,
              { opacity: titleO, transform: [{ translateY: titleY }] },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Animated.Text
            style={[
              styles.titleText,
              { opacity: titleO, transform: [{ translateY: titleY }] },
            ]}
          >
            {movie.title}
          </Animated.Text>
        )}

        {/* TOP 10 badge + meta info */}
        <View style={styles.badgeRow}>
          <View style={styles.top10Badge}>
            <Text style={styles.top10Text}>TOP 10</Text>
          </View>

          <Text style={styles.badgeMeta}>
            {[movie.year, movie.country, `Tập ${movie.current_episode}`]
              .filter(Boolean)
              .join('  |  ')}
          </Text>
        </View>

        {/* Genre tags */}
        <View style={styles.genreRow}>
          {movie.genres?.slice(0, 3).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreText}>{g}</Text>
            </View>
          ))}
        </View>


      </View>
    </TouchableOpacity>
  );
}, (prev, next) => prev.active === next.active && prev.movie === next.movie && prev.ov === next.ov);

export const FeaturedCarousel = memo(function FeaturedCarousel() {
  const [featured, setFeatured] = useState<Movie[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [overridesMap, setOverridesMap] = useState<
    Record<string, Omit<FeaturedOverride, 'slug'>>
  >({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadFeaturedOverrides().then((list) => {
      const map = overridesToRecord(list);
      setOverridesMap(map);
      const slugs = list.map((o) => o.slug);
      Promise.all(slugs.map((slug) => getMovieBySlug(slug))).then((res) => {
        setFeatured(res.filter(Boolean) as Movie[]);
      });
    });
  }, []);

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(idx);
  }, []);

  if (featured.length === 0) return null;

  return (
    <View style={[styles.container, { height: BANNER_H }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
      >
        {featured.map((item, index) => (
          <BannerSlide
            key={item.id}
            movie={item}
            active={index === activeIndex}
            ov={overridesMap[item.slug || item.id] ?? EMPTY_OV}
          />
        ))}
      </ScrollView>

      {/* Dot indicators — bottom right, inside banner */}
      <View style={styles.dots} pointerEvents="none">
        {featured.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    overflow: 'hidden',
  },

  slide: {
    width: W,
    height: BANNER_H,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },

  bg: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Bottom gradient — only covers bottom 50% to avoid dark band */
  gradBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BANNER_H * 0.55,
  },

  /* Top vignette ~18% height */
  gradTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_H * 0.18,
  },

  /* Left gradient ~55% width */
  gradLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: W * 0.58,
  },

  /* Character: right side, fits within banner */
  character: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: W * 0.58,
    height: BANNER_H,
  },


  /* Left-anchored content block */
  content: {
    position: 'absolute',
    left: 20,
    bottom: 14,
    right: W * 0.40,
  },

  titleImg: {
    width: '100%',
    height: 72,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },

  titleText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  top10Badge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  top10Text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  badgeMeta: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
  },

  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },

  genreTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  genreText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },



  /* Dot indicators — bottom-right corner */
  dots: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  dot: {
    width: 6,
    height: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  dotActive: {
    width: 22,
    height: 5,
    backgroundColor: '#22C55E',
    borderRadius: 10,
  },
});