import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronDown, ChevronUp, Heart, Play, Server } from 'lucide-react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { getGanh18MovieBySlug, XxvnMovie } from '../../lib/xxvnapi';
import { getFavorites, toggleFavorite } from '../../lib/favorites';

const screenWidth = Dimensions.get('window').width;
const POSTER_WIDTH = screenWidth * 0.44;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const TABS = ['Tập phim', 'Thông tin'];

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [movie, setMovie] = useState<XxvnMovie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeServer, setActiveServer] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState(0);
  const [activeTab, setActiveTab] = useState('Tập phim');
  const [infoExpanded, setInfoExpanded] = useState(false);
  const didAutoResume = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(favs => setFavorites(favs));
    }, [])
  );

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError('');

    getGanh18MovieBySlug(id)
      .then((data) => {
        if (data) {
          setMovie(data);
          setActiveServer(0);
          setActiveEpisode(0);
        } else {
          setError('Khong tim thay phim.');
        }
      })
      .catch(() => setError('Loi khi tai phim. Thu lai sau.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFD27A" size="large" />
        </View>
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>{error || 'Không tìm thấy phim.'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* ── Hero section ── */}
        <View style={styles.hero}>
          {/* Blurred BG poster */}
          <Image source={{ uri: movie.thumb_url }} style={styles.heroBg} blurRadius={25} />
          <View style={styles.heroDimmer} />

          {/* Back button */}
          <SafeAreaView edges={['top']} style={styles.backWrap}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Centered poster */}
          <View style={styles.posterWrap}>
            <Image source={{ uri: movie.thumb_url }} style={styles.poster} resizeMode="cover" />
          </View>

          {/* Title block */}
          <Text style={styles.title}>{movie.name}</Text>
          <Text style={styles.titleEn} numberOfLines={1}>{movie.type || 'Phim 18+'}</Text>

          {/* Info toggle */}
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setInfoExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoToggleText}>Thông tin phim</Text>
            {infoExpanded
              ? <ChevronUp size={14} color="#FFD27A" />
              : <ChevronDown size={14} color="#FFD27A" />}
          </TouchableOpacity>

          {/* Expandable info */}
          {infoExpanded && (
            <View style={styles.infoBox}>
              <View style={styles.infoBadges}>
                {movie.quality && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>{movie.quality}</Text>
                  </View>
                )}
                {movie.status && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>{movie.status}</Text>
                  </View>
                )}
                {movie.lang && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>{movie.lang}</Text>
                  </View>
                )}
              </View>

              {movie.categories && movie.categories.length > 0 && (
                <View style={styles.genreRow}>
                  {movie.categories.map((cat) => (
                    <View key={cat.slug} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{cat.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.infoHeading}>Giới thiệu:</Text>
              <Text style={styles.infoBody}>{movie.content}</Text>

              {movie.time && (
                <Text style={styles.infoBodyMeta}>
                  <Text style={styles.infoHeading}>Thời lượng: </Text>{movie.time}
                </Text>
              )}

              {movie.actors && movie.actors.length > 0 && (
                <Text style={styles.infoBodyMeta}>
                  <Text style={styles.infoHeading}>Diễn viên: </Text>{movie.actors.join(', ')}
                </Text>
              )}
            </View>
          )}

          {/* Big watch button */}
          <TouchableOpacity
            style={styles.watchBtnLarge}
            activeOpacity={0.85}
            onPress={() => {
              if (!movie.episodes?.[activeServer]?.server_data?.[activeEpisode]?.link) return;
              router.push({
                pathname: '/ganh18/player',
                params: {
                  url: movie.episodes[activeServer].server_data[activeEpisode].link,
                  title: movie.name,
                  episode: movie.episodes[activeServer].server_data[activeEpisode].name || `Tập ${activeEpisode + 1}`,
                  movieId: movie.id,
                  movieSlug: movie.slug,
                  serverLabel: movie.episodes[activeServer].server_name || 'Server #1',
                  poster: movie.thumb_url,
                },
              } as any);
            }}
          >
            <LinearGradient
              colors={['#FFD27A', '#FFF09A']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.watchBtnGradient}
            >
              <Play size={18} color="#0A0815" fill="#0A0815" strokeWidth={0} />
              <Text style={styles.watchBtnText}>Xem Ngay</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Action icons */}
          <View style={styles.actionRow}>
            {/* Yêu thích */}
            <TouchableOpacity
              style={styles.actionItem}
              onPress={async () => {
                const newState = await toggleFavorite(movie.slug);
                setFavorites(prev =>
                  newState
                    ? [...prev, movie.slug]
                    : prev.filter(s => s !== movie.slug)
                );
              }}
              activeOpacity={0.7}
            >
              <Svg width={22} height={22} viewBox="0 0 20 20">
                <SvgPath
                  d="M10 18.1432L1.55692 9.82794C0.689275 8.97929 0.147406 7.85276 0.0259811 6.64517C-0.0954433 5.43759 0.211298 4.22573 0.892612 3.22133C4.99987 -2.24739 10 4.10278 10 4.10278C10 4.10278 15.0001 -2.24739 19.1074 3.22133C19.7887 4.22573 19.974 5.43759 19.8526 7.85276 19.3107 8.97929 18.4431 9.82794 10 18.1432L10 18.1432Z"
                  fill={favorites.includes(movie.slug) ? '#FF6B7A' : '#fff'}
                />
              </Svg>
              <Text style={styles.actionLabel}>Yêu thích</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tab bar (sticky) ── */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Tab content ── */}
        <View style={styles.tabContent}>
          {activeTab === 'Tập phim' && movie.episodes && movie.episodes.length > 0 && (
            <View>
              {/* Server selection */}
              {movie.episodes.length > 1 && (
                <View style={styles.serverSection}>
                  <Text style={styles.serverLabel}>CHỌN SERVER:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serverRow}>
                    {movie.episodes.map((server, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.serverChip,
                          activeServer === idx && styles.serverChipActive,
                        ]}
                        onPress={() => {
                          setActiveServer(idx);
                          setActiveEpisode(0);
                        }}
                        activeOpacity={0.75}
                      >
                        <Server size={12} color={activeServer === idx ? '#0A0815' : 'rgba(255,255,255,0.7)'} />
                        <Text style={[styles.serverChipText, activeServer === idx && styles.serverChipTextActive]}>
                          {server.server_name || `Server ${idx + 1}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Episode grid */}
              {movie.episodes[activeServer]?.server_data && movie.episodes[activeServer].server_data.length > 0 ? (
                <View style={styles.episodeGrid}>
                  {movie.episodes[activeServer].server_data.map((ep, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.episodeBtn,
                        activeEpisode === idx && styles.episodeBtnActive,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setActiveEpisode(idx)}
                    >
                      <Play size={10} color={activeEpisode === idx ? '#0A0815' : '#fff'} fill={activeEpisode === idx ? '#0A0815' : '#fff'} />
                      <Text style={[styles.episodeBtnText, activeEpisode === idx && styles.episodeBtnTextActive]}>
                        {ep.name || `Tập ${idx + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {activeTab === 'Thông tin' && (
            <View style={styles.infoTabContent}>
              {movie.content && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Nội dung</Text>
                  <Text style={styles.infoSectionText}>{movie.content}</Text>
                </View>
              )}

              {movie.categories && movie.categories.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Thể loại</Text>
                  <View style={styles.categoryList}>
                    {movie.categories.map((cat) => (
                      <View key={cat.slug} style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{cat.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {movie.quality && (
                <Text style={styles.infoMetaRow}>
                  <Text style={styles.infoMetaLabel}>Chất lượng: </Text>
                  <Text style={styles.infoMetaValue}>{movie.quality}</Text>
                </Text>
              )}

              {movie.status && (
                <Text style={styles.infoMetaRow}>
                  <Text style={styles.infoMetaLabel}>Trạng thái: </Text>
                  <Text style={styles.infoMetaValue}>{movie.status}</Text>
                </Text>
              )}

              {movie.time && (
                <Text style={styles.infoMetaRow}>
                  <Text style={styles.infoMetaLabel}>Thời lượng: </Text>
                  <Text style={styles.infoMetaValue}>{movie.time}</Text>
                </Text>
              )}

              {movie.actors && movie.actors.length > 0 && (
                <Text style={styles.infoMetaRow}>
                  <Text style={styles.infoMetaLabel}>Diễn viên: </Text>
                  <Text style={styles.infoMetaValue}>{movie.actors.join(', ')}</Text>
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0815' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#FF6B7A', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Hero section
  hero: { minHeight: 480 },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.45 },
  heroDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,21,0.75)' },
  backWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    margin: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterWrap: {
    alignSelf: 'center',
    marginTop: 80,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  poster: { width: POSTER_WIDTH, height: POSTER_HEIGHT },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  titleEn: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 20,
  },

  // Info toggle
  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  infoToggleText: { color: '#FFD27A', fontSize: 13, fontWeight: '600' },

  // Info box
  infoBox: { paddingHorizontal: 18, paddingBottom: 4, gap: 8 },
  infoBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  infoBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  infoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genreTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreTagText: { color: '#fff', fontSize: 12 },
  infoHeading: { color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 4, marginBottom: 4 },
  infoBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 },
  infoBodyMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 },

  // Watch button
  watchBtnLarge: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 32,
    overflow: 'hidden',
  },
  watchBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 32,
  },
  watchBtnText: { color: '#0A0815', fontSize: 16, fontWeight: '800' },

  // Action row
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingBottom: 20,
  },
  actionItem: { alignItems: 'center', gap: 6 },
  actionLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  // Tab bar
  tabBar: { backgroundColor: '#0A0815', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabBarContent: { paddingHorizontal: 14 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#FFD27A' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFD27A' },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  // Server section
  serverSection: { marginBottom: 14 },
  serverLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  serverRow: { gap: 8 },
  serverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,209,122,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,209,122,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serverChipActive: {
    backgroundColor: '#FFD27A',
    borderColor: '#FFD27A',
  },
  serverChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  serverChipTextActive: { color: '#0A0815' },

  // Episode grid
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  episodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(75,49,104,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(75,49,104,0.5)',
    width: (screenWidth - 32 - 16) / 3,
    justifyContent: 'center',
  },
  episodeBtnActive: {
    backgroundColor: '#FFD27A',
    borderColor: '#FFD27A',
  },
  episodeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  episodeBtnTextActive: { color: '#0A0815' },

  // Info tab content
  infoTabContent: { paddingBottom: 16 },
  infoSection: { marginBottom: 16 },
  infoSectionTitle: { color: '#FFD27A', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoSectionText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryBadge: {
    backgroundColor: 'rgba(75,49,104,0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(75,49,104,0.6)',
  },
  categoryBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  infoMetaRow: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 },
  infoMetaLabel: { color: '#FFD27A', fontWeight: '700' },
  infoMetaValue: { color: 'rgba(255,255,255,0.8)' },
});
