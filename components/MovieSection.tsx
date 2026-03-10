import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Movie } from '@/types/movie';
import { MovieCard } from './MovieCard';
import { Colors } from '@/constants/colors';
import { ChevronRight } from 'lucide-react-native';

interface MovieSectionProps {
  title: string;
  movies: Movie[];
  onSeeAll?: () => void;
}

export function MovieSection({ title, movies, onSeeAll }: MovieSectionProps) {
  if (movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll} activeOpacity={0.7}>
            <ChevronRight size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MovieCard movie={item} width={138} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 40 / 2,
    fontWeight: '800',
  },
  seeAllButton: {
    padding: 3,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
});
