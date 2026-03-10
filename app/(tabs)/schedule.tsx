import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { Movie, Favorite } from '@/types/movie';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const MOCK_USER_ID = 'user-1';

type TabType = 'movies' | 'actors';

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('movies');
  const [favorites, setFavorites] = useState<(Favorite & { movie: Movie })[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('*, movie:movies(*)')
        .eq('user_id', MOCK_USER_ID)
        .order('created_at', { ascending: false });

      setFavorites((data as any) || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      await supabase.from('favorites').delete().eq('id', favoriteId);
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu thích</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.tabActive]}
          onPress={() => setActiveTab('movies')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'movies' && styles.tabTextActive,
            ]}
          >
            Phim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'actors' && styles.tabActive]}
          onPress={() => setActiveTab('actors')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'actors' && styles.tabTextActive,
            ]}
          >
            Diễn viên
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator style={styles.loading} size="small" color={Colors.textSecondary} />}

        {activeTab === 'movies' && (
          <View style={styles.content}>
            {favorites.length === 0 && !loading && (
              <Text style={styles.emptyText}>Chưa có phim yêu thích</Text>
            )}
            {favorites.map((favorite) => (
              <View key={favorite.id} style={styles.favoriteItem}>
                <TouchableOpacity
                  style={styles.favoriteContent}
                  onPress={() => router.push(`/movie/${favorite.movie.id}`)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: favorite.movie.poster_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.posterBadgeRow}>
                    <View style={styles.posterBadgeMuted}>
                      <Text style={styles.posterBadgeText}>PĐ.{favorite.movie.current_episode}</Text>
                    </View>
                    {favorite.movie.is_series && favorite.movie.current_episode < favorite.movie.episodes && (
                      <View style={styles.posterBadgeFresh}>
                        <Text style={styles.posterBadgeText}>TM.{favorite.movie.current_episode}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.favoriteInfo}>
                    <Text style={styles.favoriteTitle} numberOfLines={2}>
                      {favorite.movie.title}
                    </Text>
                    <Text style={styles.favoriteTitleEn} numberOfLines={1}>
                      {favorite.movie.title_en}
                    </Text>
                    <View style={styles.favoriteMetadata}>
                      <Text style={styles.metadataText}>
                        {favorite.movie.age_rating}
                      </Text>
                      <Text style={styles.metadataDot}>·</Text>
                      <Text style={styles.metadataText}>
                        {favorite.movie.year}
                      </Text>
                      {favorite.movie.is_series && (
                        <>
                          <Text style={styles.metadataDot}>·</Text>
                          <Text style={styles.metadataText}>
                            Tập {favorite.movie.current_episode}
                          </Text>
                        </>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFavorite(favorite.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color={Colors.error} />
                      <Text style={styles.removeButtonText}>Bỏ thích</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'actors' && (
          <View style={styles.content}>
            <Text style={styles.emptyText}>Chưa có diễn viên yêu thích</Text>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tabText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 6,
  },
  loading: {
    marginTop: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  favoriteItem: {
    marginBottom: 16,
  },
  favoriteContent: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 90,
    height: 126,
    borderRadius: 10,
    backgroundColor: Colors.cardBackground,
  },
  posterBadgeRow: {
    position: 'absolute',
    left: 7,
    bottom: 8,
    flexDirection: 'row',
    gap: 5,
  },
  posterBadgeMuted: {
    backgroundColor: 'rgba(79, 90, 125, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  posterBadgeFresh: {
    backgroundColor: '#35D68D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  posterBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  favoriteTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  favoriteTitleEn: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 6,
  },
  favoriteMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  metadataText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  metadataDot: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 107, 112, 0.18)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
});
