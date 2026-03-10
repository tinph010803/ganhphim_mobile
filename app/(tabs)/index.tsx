import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { getHomeMovies } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { FeaturedCarousel } from '@/components/FeaturedCarousel';
import { MovieSection } from '@/components/MovieSection';
import { Bell, ChevronDown, Settings } from 'lucide-react-native';

const FILTER_OPTIONS = ['Đề xuất', 'Phim bộ', 'Phim lẻ', 'Thể loại'];

export default function HomeScreen() {
  const [selectedFilter, setSelectedFilter] = useState('Đề xuất');
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [chineseMovies, setChineseMovies] = useState<Movie[]>([]);
  const [westernMovies, setWesternMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, fadeAnim, translateAnim]);

  const loadMovies = async () => {
    try {
      const movies = await getHomeMovies();
      const featured = movies.slice(0, 8);
      const recent = movies.slice(0, 24);

      setFeaturedMovies(featured);
      setRecentMovies(recent);

      if (recent.length) {
        setChineseMovies(recent.filter((_, index) => index % 2 === 0).slice(0, 8));
        setWesternMovies(recent.filter((_, index) => index % 2 !== 0).slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 62, 30, 0.36)', 'rgba(255, 62, 30, 0.06)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroGlow}
      />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          <View>
            <Text style={styles.logoTitle}>RoPhim</Text>
            <Text style={styles.logoSubtitle}>Phim hay cả rồ</Text>
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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterButton,
                  selectedFilter === option && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(option)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedFilter === option && styles.filterButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
                {option === 'Thể loại' && (
                  <ChevronDown size={16} color={selectedFilter === option ? Colors.background : Colors.text} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: translateAnim }],
          }}
        >
          {!loading && featuredMovies.length > 0 && (
            <FeaturedCarousel movies={featuredMovies} />
          )}

          {!loading && recentMovies.length > 0 && (
            <MovieSection
              title="Xem tiếp của bạn"
              movies={recentMovies.slice(0, 8)}
              onSeeAll={() => {}}
            />
          )}

          {!loading && chineseMovies.length > 0 && (
            <MovieSection title="Phim Trung Quốc mới" movies={chineseMovies} onSeeAll={() => {}} />
          )}

          {!loading && westernMovies.length > 0 && (
            <MovieSection title="Phim US-UK mới" movies={westernMovies} onSeeAll={() => {}} />
          )}
        </Animated.View>
      </ScrollView>
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
    fontSize: 44 / 2,
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
  },
  filterContainer: {
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 18,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 9,
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
    fontSize: 17 / 1.2,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: Colors.background,
  },
});
