import { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Movie } from '@/types/movie';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

interface MovieCardProps {
  movie: Movie;
  width?: number;
}

export const MovieCard = memo(function MovieCard({ movie, width = 150 }: MovieCardProps) {
  const router = useRouter();

  const handlePress = () => {
    const targetId = movie.slug || movie.id;
    if (!targetId) return;

    router.push({
      pathname: '/movie/[id]',
      params: { id: targetId },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: movie.poster_url }}
          style={styles.poster}
          resizeMode="cover"
        />
        <View style={styles.episodeBadge}>
          <Text style={styles.episodeText}>
            PĐ.{movie.current_episode}
          </Text>
        </View>
        {movie.is_series && movie.current_episode < movie.episodes && (
          <View style={[styles.statusBadge, styles.updatingBadge]}>
            <Text style={styles.statusText}>TM.{movie.current_episode}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {movie.title}
      </Text>
      <Text style={styles.titleEn} numberOfLines={1}>
        {movie.title_en}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.cardBackground,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  episodeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(77, 85, 118, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  episodeText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 56,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  updatingBadge: {
    backgroundColor: '#35D68D',
  },
  statusText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 7,
  },
  titleEn: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
});

