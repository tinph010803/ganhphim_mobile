import { memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Movie } from '@/types/movie';
import { MovieCard } from './MovieCard';
import { Colors } from '@/constants/colors';
import { ChevronRight } from 'lucide-react-native';

const CARD_WIDTH = 120;
const CARD_MARGIN = 10;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;
const LIST_PADDING = 16;

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  onSeeAll?: () => void;
}

export const MovieSection = memo(function MovieSection({ title, movies, onSeeAll }: MovieSectionProps) {
  if (movies.length === 0) return null;

  const renderItem = useCallback(
    ({ item }: { item: Movie }) => <MovieCard movie={item} width={CARD_WIDTH} />,
    [],
  );

  const keyExtractor = useCallback((item: Movie) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_SIZE,
      offset: LIST_PADDING + index * ITEM_SIZE,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.7}>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={movies}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        removeClippedSubviews        nestedScrollEnabled        scrollEventThrottle={16}
      />
    </View>
  );
});

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
    paddingHorizontal: 16,
  },
});
