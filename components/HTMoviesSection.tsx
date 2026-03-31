// components/HTMoviesSection.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getMovieBySlug } from '@/lib/ophim';
import { Movie } from '@/types/movie';
import { MovieCard } from '@/components/MovieCard';
import { Colors } from '@/constants/colors';
import { ChevronRight } from 'lucide-react-native';

const CARD_WIDTH = 120;
const CARD_MARGIN = 10;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;
const LIST_PADDING = 16;

interface HTMoviesSectionProps {
  homeReady: boolean; // chỉ bắt đầu fetch khi home đã load xong
}

export function HTMoviesSection({ homeReady }: HTMoviesSectionProps) {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    if (!homeReady) return; // chờ home load xong mới fetch
    (async () => {
      try {
        const { data } = await supabase
          .from('ht_servers')
          .select('movie_slug')
          .order('created_at', { ascending: false });

        if (!data?.length) return;

        const slugs = [...new Set(data.map((r) => r.movie_slug))].slice(0, 10);

        const results = await Promise.allSettled(slugs.map((slug) => getMovieBySlug(slug)));

        const fetched = results
          .filter((r): r is PromiseFulfilledResult<Movie | null> => r.status === 'fulfilled')
          .map((r) => r.value)
          .filter((m): m is Movie => m !== null);

        setMovies(fetched);
      } catch (e) {
        console.error('HTMoviesSection error:', e);
      }
    })();
  }, [homeReady]);

  if (movies.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⭐ Phim chất lượng cao [HT]</Text>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={() => router.push('/ht-movies' as any)}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Danh sách */}
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => item.slug || item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews
        nestedScrollEnabled
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: ITEM_SIZE,
          offset: LIST_PADDING + index * ITEM_SIZE,
          index,
        })}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            {/* Badge VIP góc trên phải */}
            <View style={styles.vipBadge}>
              <Text style={styles.vipText}>VIP</Text>
            </View>
            <MovieCard movie={item} width={CARD_WIDTH} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  seeAllButton: {
    padding: 3,
  },
  scrollContent: {
    paddingHorizontal: LIST_PADDING,
  },

  // Wrap để đặt badge VIP lên poster
  cardWrap: {
    position: 'relative',
  },
  vipBadge: {
    position: 'absolute',
    top: 6,
    // MovieCard có marginRight:10, badge nằm cách phải 10+6=16
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  vipText: {
    color: '#F5C518',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});