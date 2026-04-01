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
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Movie } from '@/types/movie';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getMovieBySlug } from '@/lib/ophim';
import {
  FeaturedOverride,
  loadFeaturedOverrides,
  overridesToRecord,
} from '@/lib/featuredOverrides';
import { Volume1, VolumeX } from 'lucide-react-native';
const { width: W, height: SCREEN_H } = Dimensions.get('window');
const BANNER_H = Math.round(Math.min(W * 0.60, SCREEN_H * 0.42));

interface SlideItem {
  slug: string;
  movie: Movie | null;
  ov: Omit<FeaturedOverride, 'slug'>;
}

/**
 * Convert Cloudinary player embed URL → direct mp4 URL
 * https://player.cloudinary.com/embed/?cloud_name=abc&public_id=xyz
 * → https://res.cloudinary.com/abc/video/upload/xyz.mp4
 */
function toDirectVideoUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'player.cloudinary.com') {
      const cloudName = parsed.searchParams.get('cloud_name');
      const publicId = parsed.searchParams.get('public_id');
      if (cloudName && publicId) {
        return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}.mp4`;
      }
    }
    if (parsed.hostname === 'res.cloudinary.com') return url;
  } catch { }
  return url;
}

/** Video trailer dùng expo-av — autoplay, muted, loop */
const TrailerVideo = memo(function TrailerVideo({
  videoUrl,
  active,
  muted,
}: {
  videoUrl: string;
  active: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (active) {
      videoRef.current.playAsync().catch(() => { });
    } else {
      videoRef.current.pauseAsync().catch(() => { });
      videoRef.current.setPositionAsync(0).catch(() => { });
    }
  }, [active]);

  return (
    <Video
      ref={videoRef}
      source={{ uri: videoUrl }}
      style={StyleSheet.absoluteFill}
      resizeMode={ResizeMode.COVER}
      isLooping
      isMuted={muted}
      shouldPlay={active}
      useNativeControls={false}
    />
  );
});

const BannerSlide = memo(function BannerSlide({
  item,
  active,
}: {
  item: SlideItem;
  active: boolean;
}) {
  const router = useRouter();
  const { slug, movie, ov } = item;

  const bgScale = useRef(new Animated.Value(1)).current;
  const charX = useRef(new Animated.Value(50)).current;
  const charO = useRef(new Animated.Value(0)).current;
  const titleO = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(10)).current;
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    if (!active) {
      bgScale.setValue(1); charX.setValue(50); charO.setValue(0);
      titleO.setValue(0); titleY.setValue(10);
      return;
    }
    Animated.timing(bgScale, { toValue: 1.05, duration: 3500, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(charX, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(charO, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.parallel([
      Animated.timing(titleO, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [active]);

  const clean = (v?: string) => (v && v !== 'EMPTY' ? v : undefined);

  const bgUri = clean(ov.bg) ?? movie?.thumb_url ?? movie?.poster_url;
  const charUri = clean(ov.character);
  const titleUri = clean(ov.titleImg);

  const directVideoUrl = ov.trailerUrl ? toDirectVideoUrl(ov.trailerUrl) : '';
  const hasTrailer = !!directVideoUrl;

  const handlePress = useCallback(() => {
    router.push({ pathname: '/movie/[id]', params: { id: slug } });
  }, [router, slug]);

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.slide} onPress={handlePress}>

      {/* ── Nền: video hoặc ảnh ── */}
      {hasTrailer ? (
        <View style={StyleSheet.absoluteFill}>
          {/* Poster hiện ngay, video đè lên khi load xong */}
          {bgUri && (
            <Animated.Image
              source={{ uri: bgUri }}
              style={{ width: W, height: BANNER_H }}
              resizeMode="cover"
              fadeDuration={0}
            />
          )}
          <TrailerVideo videoUrl={directVideoUrl} active={active} muted={muted} />
        </View>
      ) : (
        <Animated.View style={[styles.bg, { transform: [{ scale: bgScale }] }]}>
          <Animated.Image
            source={{ uri: bgUri }}
            style={{ width: W, height: BANNER_H }}
            resizeMode="cover"
            fadeDuration={0}
          />
        </Animated.View>
      )}

      {/* Gradients */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.65)']}
        locations={[0, 0.65, 1]}
        style={styles.gradBottom}
      />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={styles.gradTop} />
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.15)', 'transparent']}
        locations={[0, 0.35, 0.65, 1]}
        style={styles.gradLeft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      {/* Character — chỉ khi không có trailer */}
      {charUri && !hasTrailer && (
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

      {/* Content overlay */}
      <View style={styles.content}>
        {titleUri ? (
          <Animated.Image
            source={{ uri: titleUri }}
            style={[styles.titleImg, { opacity: titleO, transform: [{ translateY: titleY }] }]}
            resizeMode="contain"
          />
        ) : (
          <Animated.Text
            style={[styles.titleText, { opacity: titleO, transform: [{ translateY: titleY }] }]}
          >
            {movie?.title ?? slug}
          </Animated.Text>
        )}

        <View style={styles.badgeRow}>
          <View style={styles.top10Badge}>
            <Text style={styles.top10Text}>TOP 10</Text>
          </View>
          {movie && (
            <Text style={styles.badgeMeta}>
              {[movie.year, movie.country, movie.current_episode ? `Tập ${movie.current_episode}` : null]
                .filter(Boolean).join('  |  ')}
            </Text>
          )}
        </View>

        {movie?.genres && movie.genres.length > 0 && (
          <View style={styles.genreRow}>
            {movie.genres.slice(0, 3).map((g) => (
              <View key={g} style={styles.genreTag}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {hasTrailer && (
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={() => setMuted((prev) => !prev)}
        >
          {muted ? (
            <VolumeX size={18} color="#fff" />
          ) : (
            <Volume1 size={18} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}, (prev, next) => prev.active === next.active && prev.item === next.item);

export const FeaturedCarousel = memo(function FeaturedCarousel() {
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadFeaturedOverrides().then(async (list) => {
      const movies = await Promise.all(
        list.map(({ slug }) => getMovieBySlug(slug).catch(() => null))
      );
      const result: SlideItem[] = list
        .map(({ slug, ...ov }, i) => ({ slug, movie: movies[i] ?? null, ov }))
        .filter(({ movie, ov }) => movie !== null || !!ov.trailerUrl);
      setSlides(result);
    });
  }, []);

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(idx);
  }, []);

  if (slides.length === 0) return null;

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
        {slides.map((item, index) => (
          <BannerSlide
            key={item.slug}
            item={item}
            active={index === activeIndex}
          />
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="none">
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 0, overflow: 'hidden' },
  slide: { width: W, height: BANNER_H, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  bg: { ...StyleSheet.absoluteFillObject },
  gradBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BANNER_H * 0.55 },
  gradTop: { position: 'absolute', top: 0, left: 0, right: 0, height: BANNER_H * 0.18 },
  gradLeft: { position: 'absolute', top: 0, left: 0, bottom: 0, width: W * 0.58 },
  character: { position: 'absolute', right: 0, bottom: 0 },
  content: { position: 'absolute', left: 20, bottom: 14, right: W * 0.40 },
  titleImg: { width: '100%', height: 72, marginBottom: 10, alignSelf: 'flex-start' },
  titleText: {
    color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10, lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  top10Badge: { backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  top10Text: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  badgeMeta: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  genreTag: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  genreText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  dots: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 22, height: 5, backgroundColor: '#22C55E', borderRadius: 10 },
  muteBtn: {
    position: 'absolute',
    bottom: 180,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 999,
  },
});