import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { getMovieBySlug } from '@/lib/ophim';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/types/movie';
import { ChevronLeft, Play, Heart, Share2 } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MOCK_USER_ID = 'user-1';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerParams, setPlayerParams] = useState<{ url: string; title: string; episode: string } | null>(null);

  // Khi quay về từ player, reset
  useFocusEffect(useCallback(() => { setPlayerParams(null); }, []));

  // Lock orientation WHILE showing black screen, THEN navigate → no rotation flash
  useEffect(() => {
    if (!playerParams) return;
    let cancelled = false;
    const go = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SO = require('expo-screen-orientation');
        await SO.lockAsync(SO.OrientationLock.LANDSCAPE);
      } catch (_) {}
      if (!cancelled) {
        router.push({
          pathname: '/movie/player',
          params: playerParams,
        } as any);
      }
    };
    go();
    return () => { cancelled = true; };
  }, [playerParams]);

  useEffect(() => {
    if (id) {
      loadMovie();
      checkFavorite();
    }
  }, [id]);

  const loadMovie = async () => {
    try {
      const ophimMovie = await getMovieBySlug(id);

      if (ophimMovie) {
        setMovie(ophimMovie);
        return;
      }

      if (isUuid(id)) {
        const { data } = await supabase
          .from('movies')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        setMovie(data);
      }
    } catch (error) {
      console.error('Error loading movie:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      if (!isUuid(id)) {
        setIsFavorite(false);
        return;
      }

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', MOCK_USER_ID)
        .eq('movie_id', id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const openPlayer = (url: string, episodeName?: string) => {
    if (!url) return;
    setPlayerParams({ url, title: movie?.title ?? '', episode: episodeName ?? '' });
  };

  const toggleFavorite = async () => {
    try {
      if (!isUuid(id)) {
        return;
      }

      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', MOCK_USER_ID)
          .eq('movie_id', id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: MOCK_USER_ID, movie_id: id });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (playerParams) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (loading || !movie) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.posterContainer}>
          <Image
            source={{ uri: movie.poster_url }}
            style={styles.poster}
            resizeMode="cover"
          />
          <View style={styles.gradientOverlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.subtitle}>{movie.title_en}</Text>

          <View style={styles.badges}>
            {movie.imdb_rating > 0 && (
              <View style={[styles.badge, styles.imdbBadge]}>
                <Text style={styles.badgeText}>IMDb {movie.imdb_rating}</Text>
              </View>
            )}
            {movie.quality && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{movie.quality}</Text>
              </View>
            )}
            {movie.age_rating && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{movie.age_rating}</Text>
              </View>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{movie.year}</Text>
            </View>
          </View>

          {movie.is_series && (
            <Text style={styles.episodeInfo}>
              Tập {movie.current_episode}/{movie.episodes}
            </Text>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryActionButton]}
              activeOpacity={0.8}
              onPress={() => {
                const url = movie.episodes_data?.[0]?.link_m3u8 || movie.stream_url || '';
                openPlayer(url, movie.episodes_data?.[0]?.name);
              }}
            >
              <Play size={20} color={Colors.background} fill={Colors.background} />
              <Text style={styles.primaryActionButtonText}>Xem phim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFavorite}
              activeOpacity={0.7}
            >
              <Heart
                size={24}
                color={isFavorite ? Colors.error : Colors.text}
                fill={isFavorite ? Colors.error : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Share2 size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Danh sách tập */}
          {(movie.episodes_data?.length ?? 0) > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Danh sách tập</Text>
              <FlatList
                data={movie.episodes_data}
                keyExtractor={(ep) => ep.name}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.episodeList}
                renderItem={({ item: ep }) => (
                  <TouchableOpacity
                    style={styles.episodeButton}
                    activeOpacity={0.75}
                    onPress={() => openPlayer(ep.link_m3u8 || ep.link_embed, ep.name)}
                  >
                    <Play size={10} color={Colors.background} style={{ marginRight: 4 }} />
                    <Text style={styles.episodeButtonText}>{ep.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.description}>{movie.description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  posterContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardBackground,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 18,
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  imdbBadge: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  badgeText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  episodeInfo: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
  },
  primaryActionButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  episodeList: {
    gap: 8,
    paddingVertical: 4,
  },
  episodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 48,
    justifyContent: 'center',
  },
  episodeButtonText: {
    color: Colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
