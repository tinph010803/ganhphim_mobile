import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.logoTitle}>RoPhim</Text>
            <Text style={styles.logoSubtitle}>Phim hay cả rổ</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Bell size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Settings size={24} color={Colors.text} />
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  logoTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  logoSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: -2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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