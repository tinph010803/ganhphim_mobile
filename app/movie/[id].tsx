import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { getMovieBySlug } from '@/lib/ophim';
import { supabase } from '@/lib/supabase';
import { Movie } from '@/types/movie';
import {
  ChevronLeft,
  Play,
  Heart,
  Plus,
  Share2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = SCREEN_WIDTH * 0.44;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const MOCK_USER_ID = 'user-1';
const TABS = ['Tập phim', 'Gallery', 'OST', 'Diễn viên', 'Đề xuất'];

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
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('Tập phim');
  const [selectedServerIdx, setSelectedServerIdx] = useState(0);
  const [comment, setComment] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [commentTab, setCommentTab] = useState<'Bình luận' | 'Đánh giá'>('Bình luận');

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
    } catch {}
  };

  const openPlayer = (url: string, episodeName?: string) => {
    if (!url) return;
    setPlayerParams({ url, title: movie?.title ?? '', episode: episodeName ?? '' });
  };

  const toggleFavorite = async () => {
    try {
      if (!isUuid(id)) return;
      if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', MOCK_USER_ID).eq('movie_id', id);
        setIsFavorite(false);
      } else {
        await supabase.from('favorites').insert({ user_id: MOCK_USER_ID, movie_id: id });
        setIsFavorite(true);
      }
    } catch {}
  };

  if (playerParams) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (loading || !movie) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstEpisodeUrl = movie.episodes_data?.[0]?.link_m3u8 || movie.stream_url || '';
  const firstEpisodeName = movie.episodes_data?.[0]?.name || '';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ── Hero section ── */}
        <View style={styles.hero}>
          {/* Blurred BG poster */}
          <Image source={{ uri: movie.poster_url }} style={styles.heroBg} blurRadius={25} />
          <View style={styles.heroDimmer} />

          {/* Back button */}
          <SafeAreaView edges={['top']} style={styles.backWrap}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Centered poster */}
          <View style={styles.posterWrap}>
            <Image source={{ uri: movie.poster_url }} style={styles.poster} resizeMode="cover" />
          </View>

          {/* Title block */}
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.titleEn}>{movie.title_en}</Text>

          {/* Thông tin phim toggle */}
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setInfoExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoToggleText}>Thông tin phim</Text>
            {infoExpanded
              ? <ChevronUp size={14} color="#F5C518" />
              : <ChevronDown size={14} color="#F5C518" />}
          </TouchableOpacity>

          {/* Expandable info */}
          {infoExpanded && (
            <View style={styles.infoBox}>
              <View style={styles.infoBadges}>
                {movie.imdb_rating > 0 && (
                  <View style={[styles.infoBadge, styles.imdbBadge]}>
                    <Text style={styles.imdbText}>IMDb</Text>
                    <Text style={styles.imdbRating}>{movie.imdb_rating}</Text>
                  </View>
                )}
                <View style={styles.infoBadge}><Text style={styles.infoBadgeText}>{movie.year}</Text></View>
                {movie.is_series && (
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>Tập {movie.current_episode}</Text>
                  </View>
                )}
              </View>

              {(movie.genres?.length ?? 0) > 0 && (
                <View style={styles.genreRow}>
                  {movie.genres!.map((g) => (
                    <View key={g} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}

              {movie.is_series && (
                <View style={styles.statusRow}>
                  <RefreshCw size={13} color="#F5C518" />
                  <Text style={styles.statusText}>
                    Đang chiếu: {movie.current_episode} / {movie.episodes} tập
                  </Text>
                </View>
              )}

              <Text style={styles.infoHeading}>Giới thiệu:</Text>
              <Text style={styles.infoBody}>{movie.description}</Text>

              {!!movie.duration_text && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Thời lượng: </Text>{movie.duration_text}
                </Text>
              )}
              {!!movie.country && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Quốc gia: </Text>{movie.country}
                </Text>
              )}
              {!!movie.director && (
                <Text style={styles.infoMeta}>
                  <Text style={styles.infoMetaLabel}>Đạo diễn: </Text>{movie.director}
                </Text>
              )}
            </View>
          )}

          {/* Big watch button */}
          <TouchableOpacity
            style={styles.watchBtnLarge}
            activeOpacity={0.85}
            onPress={() => openPlayer(firstEpisodeUrl, firstEpisodeName)}
          >
            <LinearGradient
              colors={['#FECF59', '#FFF09A']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.watchBtnGradient}
            >
              <Play size={18} color="#1a1a1a" fill="#1a1a1a" strokeWidth={0} />
              <Text style={styles.watchBtnText}>Xem Ngay</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Action icons */}
          <View style={styles.actionRow}>
            {/* Yêu thích */}
            <TouchableOpacity style={styles.actionItem} onPress={toggleFavorite} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 20 20">
                <SvgPath
                  d="M10 18.1432L1.55692 9.82794C0.689275 8.97929 0.147406 7.85276 0.0259811 6.64517C-0.0954433 5.43759 0.211298 4.22573 0.892612 3.22133C4.99987 -2.24739 10 4.10278 10 4.10278C10 4.10278 15.0001 -2.24739 19.1074 3.22133C19.7887 4.22573 19.974 5.43759 19.8526 7.85276 19.3107 8.97929 18.4431 9.82794 10 18.1432L10 18.1432Z"
                  fill={isFavorite ? '#e53e3e' : '#fff'}
                />
              </Svg>
              <Text style={styles.actionLabel}>Yêu thích</Text>
            </TouchableOpacity>

            {/* Thêm vào */}
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 100 100">
                <SvgPath
                  d="M89.7273 41.6365H58.3635V10.2727C58.3635 6.81018 55.5534 4 52.0908 4H47.9092C44.4466 4 41.6365 6.81018 41.6365 10.2727V41.6365H10.2727C6.81018 41.6365 4 44.4466 4 47.9092V52.0908C4 55.5534 6.81018 58.3635 10.2727 58.3635H41.6365V89.7273C41.6365 93.1898 44.4466 96 47.9092 96H52.0908C55.5534 96 58.3635 93.1898 58.3635 89.7273V58.3635H89.7273C93.1898 58.3635 96 55.5534 96 52.0908V47.9092C96 44.4466 93.1898 41.6365 89.7273 41.6365Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.actionLabel}>Thêm vào</Text>
            </TouchableOpacity>

            {/* Chia sẻ */}
            <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
              <Svg width={22} height={22} viewBox="0 0 17 17">
                <SvgPath
                  d="M16.3628 0.651489C15.946 0.223669 15.3291 0.0642849 14.7538 0.232058L1.34002 4.13277C0.733102 4.30139 0.302926 4.78541 0.187045 5.4003C0.0686637 6.02609 0.482166 6.82049 1.02239 7.15268L5.2166 9.73051C5.6678 9.99475 6.20201 9.92848 6.55799 9.56945L11.3608 4.73676C11.6083 4.4851 12.0027 4.4851 12.2445 4.73676C12.4862 4.98003 12.4862 5.37429 12.2445 5.62595L7.43334 10.4595C7.07653 10.8177 7.00984 11.3755 7.27245 11.8084L9.83516 16.0446C10.1353 16.548 10.6522 16.8332 11.2191 16.8332C11.2858 16.8332 11.3608 16.8332 11.4275 16.8248C12.0777 16.7409 12.5946 16.2963 12.7864 15.6671L16.763 2.2705C16.9381 1.70007 16.7797 1.07931 16.3628 0.651489Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.actionLabel}>Chia sẻ</Text>
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

          {activeTab === 'Tập phim' && (() => {
            const servers = (movie.servers?.length ?? 0) > 0 ? movie.servers! : [{ name: 'Vietsub #1', episodes: movie.episodes_data ?? [] }];
            const currentEps = servers[selectedServerIdx]?.episodes ?? [];
            return (
              <View>
                {/* Server selector pills + toggle */}
                <View style={styles.serverRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
                    {servers.map((srv, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.serverPill, idx === selectedServerIdx && styles.serverPillActive]}
                        onPress={() => setSelectedServerIdx(idx)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.serverPillText, idx === selectedServerIdx && styles.serverPillTextActive]}>
                          {srv.name} | {srv.episodes.length}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.thumbnailToggle}>
                    <Text style={styles.thumbnailLabel}>Hiện ảnh</Text>
                    <Switch value={false} trackColor={{ true: Colors.primary, false: '#333' }} thumbColor="#fff" />
                  </View>
                </View>

                {/* Episode grid */}
                {currentEps.length > 0 ? (
                  <View style={styles.episodeGrid}>
                    {currentEps.map((ep) => (
                      <TouchableOpacity
                        key={ep.name}
                        style={styles.episodeBtn}
                        activeOpacity={0.75}
                        onPress={() => openPlayer(ep.link_m3u8 || ep.link_embed, ep.name)}
                      >
                        <Play size={10} color="#fff" fill="#fff" />
                        <Text style={styles.episodeBtnText}>{ep.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.episodeGrid}>
                    <TouchableOpacity
                      style={styles.episodeBtn}
                      activeOpacity={0.75}
                      onPress={() => openPlayer(firstEpisodeUrl, 'Tập 1')}
                    >
                      <Play size={10} color="#fff" fill="#fff" />
                      <Text style={styles.episodeBtnText}>Tập 1</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}

          {activeTab === 'Diễn viên' && (
            <View style={styles.actorWrap}>
              {(movie.actors?.length ?? 0) > 0
                ? movie.actors!.map((a) => (
                    <View key={a} style={styles.actorChip}>
                      <Text style={styles.actorChipText}>{a}</Text>
                    </View>
                  ))
                : <Text style={styles.emptyText}>Chưa có thông tin diễn viên</Text>
              }
            </View>
          )}

          {(activeTab === 'Gallery' || activeTab === 'OST' || activeTab === 'Đề xuất') && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Đang cập nhật...</Text>
            </View>
          )}

          {/* ── Comment section ── */}
          <View style={styles.commentSection}>
            <View style={styles.commentHeader}>
              <Svg width={21} height={21} viewBox="0 0 21 21">
                <SvgPath
                  d="M14.499 0.5H6.50109C3.19363 0.5 0.502686 3.19095 0.502686 6.4984V11.1638C0.502686 14.3596 3.01468 16.9796 6.16784 17.1532V19.9338C6.16784 20.2461 6.42244 20.5 7.13358 20.337L7.75875 19.7085C9.40031 18.0666 11.5834 17.1622 13.9054 17.1622H14.499C17.8064 17.1622 20.4974 14.4713 20.4974 11.1638V6.4984C20.4974 3.19095 17.8064 0.5 14.499 0.5ZM6.16784 10.1641C5.4327 10.1641 4.83486 9.56625 4.83486 8.83111C4.83486 8.09597 5.43211 7.49813 6.16784 7.49813C6.90358 7.49813 7.50082 8.09597 7.50082 8.83111C7.50082 9.56625 6.90265 10.1641 6.16784 10.1641ZM10.5 10.1641C9.76488 10.1641 9.16704 9.56625 9.16704 8.83111C9.16704 8.09597 9.76488 7.49813 10.5 7.49813C11.2348 7.49813 11.833 8.09597 11.833 8.83111C11.833 9.56625 11.2352 10.1641 10.5 10.1641ZM14.8322 10.1641C14.0971 10.1641 13.4992 9.56625 13.4992 8.83111C13.4992 8.09597 14.0971 7.49813 14.8322 7.49813C15.5673 7.49813 16.1652 8.09597 16.1652 8.83111C16.1652 9.56625 15.567 10.1641 14.8322 10.1641Z"
                  fill="#fff"
                />
              </Svg>
              <Text style={styles.commentTitle}>Bình luận</Text>
              <View style={styles.commentTabs}>
                {(['Bình luận', 'Đánh giá'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.commentTabBtn, commentTab === t && styles.commentTabBtnActive]}
                    onPress={() => setCommentTab(t)}
                  >
                    <Text style={[styles.commentTabText, commentTab === t && styles.commentTabTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.loginPrompt}>
              Vui lòng <Text style={styles.loginLink}>đăng nhập</Text> để tham gia bình luận.
            </Text>

            <View style={styles.inputWrap}>
              <Text style={styles.charCount}>{comment.length} / 1000</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Viết bình luận"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                maxLength={1000}
                value={comment}
                onChangeText={setComment}
              />
              <View style={styles.inputFooter}>
                <View style={styles.spoilerRow}>
                  <Switch
                    value={spoiler}
                    onValueChange={setSpoiler}
                    trackColor={{ true: Colors.primary, false: '#333' }}
                    thumbColor="#fff"
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                  <Text style={styles.spoilerLabel}>Tiết lộ?</Text>
                </View>
                <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8}>
                  <Text style={styles.sendBtnText}>Gửi</Text>
                  <Share2 size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Empty comments */}
            <View style={styles.noComments}>
              <MessageCircle size={44} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noCommentsText}>Chưa có bình luận nào</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  // Hero
  hero: { minHeight: 420 },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.45 },
  heroDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,17,58,0.72)' },
  backWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    margin: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  infoToggleText: { color: '#F5C518', fontSize: 13, fontWeight: '600' },

  // Info box
  infoBox: { paddingHorizontal: 18, paddingBottom: 4 },
  infoBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  infoBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  infoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  imdbBadge: { backgroundColor: '#F5C518', borderColor: '#F5C518', flexDirection: 'row', gap: 4, alignItems: 'center' },
  imdbText: { color: '#1a1a1a', fontSize: 11, fontWeight: '800' },
  imdbRating: { color: '#1a1a1a', fontSize: 11, fontWeight: '700' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  genreTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genreTagText: { color: '#fff', fontSize: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statusText: { color: '#F5C518', fontSize: 13 },
  infoHeading: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  infoMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  infoMetaLabel: { color: '#fff', fontWeight: '700' },

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
  watchBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },

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
  tabBar: { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabBarContent: { paddingHorizontal: 14 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#F5C518' },
  tabText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#F5C518' },

  // Tab content
  tabContent: { paddingHorizontal: 16, paddingTop: 14 },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  serverPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serverPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  serverPillText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  serverPillTextActive: { color: Colors.background, fontWeight: '700' },
  thumbnailToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  thumbnailLabel: { color: Colors.textSecondary, fontSize: 12 },

  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  episodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    width: (SCREEN_WIDTH - 32 - 16) / 3,
    justifyContent: 'center',
  },
  episodeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  actorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  actorChip: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actorChipText: { color: '#fff', fontSize: 13 },
  emptyWrap: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },

  // Comments
  commentSection: { marginTop: 28, paddingBottom: 32 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  commentTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  commentTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  commentTabBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  commentTabBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  commentTabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  commentTabTextActive: { color: '#fff' },
  loginPrompt: { color: Colors.textSecondary, fontSize: 13, marginBottom: 12 },
  loginLink: { color: '#F5C518', fontWeight: '600' },
  inputWrap: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  charCount: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', paddingTop: 8, paddingRight: 12 },
  commentInput: {
    color: '#fff',
    fontSize: 14,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  spoilerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spoilerLabel: { color: Colors.textSecondary, fontSize: 13 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sendBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  noComments: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  noCommentsText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
});
