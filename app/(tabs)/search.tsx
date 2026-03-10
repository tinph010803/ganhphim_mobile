import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { getHomeMovies } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieSection } from '@/components/MovieSection';
import { Bell, Settings } from 'lucide-react-native';

export default function SearchScreen() {
  const [chineseMovies, setChineseMovies] = useState<Movie[]>([]);
  const [westernMovies, setWesternMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const movies = await getHomeMovies();
      const chinese = movies.filter((_, index) => index % 2 === 0).slice(0, 10);
      const western = movies.filter((_, index) => index % 2 === 1).slice(0, 10);
      setChineseMovies(chinese);
      setWesternMovies(western);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!loading && chineseMovies.length > 0 && (
          <MovieSection title="Phim Trung Quốc mới" movies={chineseMovies} onSeeAll={() => {}} />
        )}

        {!loading && westernMovies.length > 0 && (
          <MovieSection title="Phim US-UK mới" movies={westernMovies} onSeeAll={() => {}} />
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
    paddingTop: 8,
  },
});