import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Flame, Search, Heart } from 'lucide-react-native';
import {
  getGanh18LatestMovies,
  getGanh18MoviesByCategory,
  XxvnMovie,
} from '../../lib/xxvnapi';
import { getFavorites, toggleFavorite } from '../../lib/favorites';

const TOP_TABS = [
  { key: 'latest', label: 'Trang chu', type: 'latest' as const },
  { key: 'viet-nam-clip', label: 'Viet Nam Clip', type: 'category' as const, slug: 'viet-nam-clip' },
  { key: 'trung-quoc', label: 'Trung Quoc', type: 'category' as const, slug: 'trung-quoc' },
  { key: 'khong-che', label: 'AV Khong che', type: 'category' as const, slug: 'khong-che' },
  { key: 'jav-hd', label: 'Jav HD', type: 'category' as const, slug: 'jav-hd' },
  { key: 'hentai', label: 'Hentai', type: 'category' as const, slug: 'hentai' },
  { key: 'vietsub', label: 'Vietsub', type: 'category' as const, slug: 'vietsub' },
  { key: 'hiep-dam', label: 'Hiep dam', type: 'category' as const, slug: 'hiep-dam' },
];

const HOME_SECTIONS = [
  { key: 'sec-vietsub', title: 'Vietsub moi cap nhat', slug: 'vietsub' },
  { key: 'sec-jav', title: 'Jav HD noi bat', slug: 'jav-hd' },
  { key: 'sec-khong-che', title: 'AV khong che', slug: 'khong-che' },
  { key: 'sec-hiep-dam', title: 'Hiep dam xem nhieu', slug: 'hiep-dam' },
];

type QuickFilter = 'all' | 'fhd' | 'vietsub';

export default function Ganh18Screen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(TOP_TABS[0].key);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const [mainMovies, setMainMovies] = useState<XxvnMovie[]>([]);
  const [sectionMovies, setSectionMovies] = useState<Record<string, XxvnMovie[]>>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [errorMain, setErrorMain] = useState('');

  useFocusEffect(
    useCallback(() => {
      getFavorites().then(favs => setFavorites(favs));
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    const tab = TOP_TABS.find((t) => t.key === activeTab) ?? TOP_TABS[0];

    setLoadingMain(true);
    setErrorMain('');

    const loadPromise =
      tab.type === 'latest'
        ? getGanh18LatestMovies(1)
        : getGanh18MoviesByCategory(tab.slug, 1);

    loadPromise
      .then((items) => {
        if (cancelled) return;
        setMainMovies(items ?? []);
      })
      .catch(() => {
        if (!cancelled) setErrorMain('Khong tai duoc du lieu. Thu lai sau.');
      })
      .finally(() => {
        if (!cancelled) setLoadingMain(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSections(true);

    Promise.all(
      HOME_SECTIONS.map(async (sec) => {
        const items = await getGanh18MoviesByCategory(sec.slug, 1);
        return { key: sec.key, items: items.slice(0, 12) };
      })
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, XxvnMovie[]> = {};
        results.forEach((r) => {
          next[r.key] = r.items;
        });
        setSectionMovies(next);
      })
      .catch(() => {
        if (cancelled) return;
        setSectionMovies({});
      })
      .finally(() => {
        if (!cancelled) setLoadingSections(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMain = useMemo(() => {
    const q = search.trim().toLowerCase();

    return mainMovies.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (quickFilter === 'fhd') {
        return (item.quality ?? '').toUpperCase().includes('FHD');
      }

      if (quickFilter === 'vietsub') {
        return (item.lang ?? '').toLowerCase().includes('vietsub');
      }

      return true;
    });
  }, [mainMovies, quickFilter, search]);

  const featuredMovie = filteredMain[0];

  const openMovie = (item: XxvnMovie) => {
    router.push({
      pathname: '/ganh18/[id]',
      params: {
        id: item.slug,
        movieId: item.id,
        title: item.name,
      },
    } as any);
  };

  const renderPosterCard = (item: XxvnMovie, wide = false) => {
    const isFav = favorites.includes(item.slug);
    return (
      <TouchableOpacity
        key={`${item.id}-${wide ? 'w' : 'n'}`}
        activeOpacity={0.82}
        style={[styles.posterCard, wide && styles.posterCardWide]}
        onPress={() => openMovie(item)}
      >
        <Image source={{ uri: item.thumb_url }} style={[styles.posterImage, wide && styles.posterImageWide]} contentFit="cover" />
        <Pressable
          style={({ pressed }) => [styles.favoriteBtn, pressed && styles.pressed]}
          onPress={async (e) => {
            e.stopPropagation?.();
            const newState = await toggleFavorite(item.slug);
            setFavorites(prev => 
              newState 
                ? [...prev, item.slug]
                : prev.filter(s => s !== item.slug)
            );
          }}
        >
          <Heart
            size={16}
            color={isFav ? '#FF6B7A' : '#F2DEFF'}
            fill={isFav ? '#FF6B7A' : 'none'}
            strokeWidth={2.5}
          />
        </Pressable>
        <LinearGradient colors={['transparent', 'rgba(8,4,18,0.94)']} style={styles.posterShade}>
          <View style={styles.metaRowSmall}>
            <Flame size={11} color="#FFD27A" />
            <Text style={styles.badgeText}>{item.quality || 'N/A'}</Text>
          </View>
          <Text style={styles.posterTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.posterMeta} numberOfLines={1}>{item.time || 'N/A'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#2A0E3D', '#180A27', '#10071B']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <ChevronLeft size={18} color="#F5DBFF" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Ganh 18</Text>
              <Text style={styles.headerSubtitle}>Noi dung 18+ | Chon loc</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {TOP_TABS.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={({ pressed }) => [styles.tabChip, active && styles.tabChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={16} color="#BFA4D7" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tim ten phim..."
                placeholderTextColor="#BFA4D7"
                style={styles.searchInput}
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.quickBtn, quickFilter === 'all' && styles.quickBtnActive, pressed && styles.pressed]}
              onPress={() => setQuickFilter('all')}
            >
              <Text style={[styles.quickBtnText, quickFilter === 'all' && styles.quickBtnTextActive]}>All</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickBtn, quickFilter === 'vietsub' && styles.quickBtnActive, pressed && styles.pressed]}
              onPress={() => setQuickFilter('vietsub')}
            >
              <Text style={[styles.quickBtnText, quickFilter === 'vietsub' && styles.quickBtnTextActive]}>VS</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickBtn, quickFilter === 'fhd' && styles.quickBtnActive, pressed && styles.pressed]}
              onPress={() => setQuickFilter('fhd')}
            >
              <Text style={[styles.quickBtnText, quickFilter === 'fhd' && styles.quickBtnTextActive]}>FHD</Text>
            </Pressable>
          </View>

          {featuredMovie && (
            <TouchableOpacity style={styles.featuredCard} activeOpacity={0.86} onPress={() => openMovie(featuredMovie)}>
              <Image source={{ uri: featuredMovie.thumb_url }} style={styles.featuredImage} contentFit="cover" />
              <LinearGradient colors={['rgba(8,4,18,0.08)', 'rgba(8,4,18,0.9)']} style={styles.featuredShade}>
                <Text style={styles.featuredTag}>Noi bat hom nay</Text>
                <Text style={styles.featuredTitle} numberOfLines={2}>{featuredMovie.name}</Text>
                <Text style={styles.featuredMeta} numberOfLines={1}>{featuredMovie.time || 'N/A'} - {featuredMovie.quality || 'N/A'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.mainSection}>
            <Text style={styles.sectionTitle}>Danh sach dang xem</Text>

            {loadingMain ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#FFD27A" />
                <Text style={styles.helperText}>Dang tai phim...</Text>
              </View>
            ) : errorMain ? (
              <View style={styles.centerBox}>
                <Text style={styles.helperText}>{errorMain}</Text>
              </View>
            ) : filteredMain.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.helperText}>Khong tim thay phim phu hop.</Text>
              </View>
            ) : (
              <View style={styles.mainGrid}>
                {filteredMain.slice(0, 10).map((item) => renderPosterCard(item))}
              </View>
            )}
          </View>

          {HOME_SECTIONS.map((sec) => {
            const items = sectionMovies[sec.key] ?? [];
            if (!items.length && !loadingSections) return null;

            return (
              <View key={sec.key} style={styles.sectionBlock}>
                <View style={styles.sectionHeadRow}>
                  <Text style={styles.sectionTitle}>{sec.title}</Text>
                </View>
                {loadingSections && !items.length ? (
                  <View style={styles.centerBoxSmall}>
                    <ActivityIndicator color="#FFD27A" />
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                    {items.map((item) => renderPosterCard(item, true))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10071B',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B1A40',
  },
  headerTitle: {
    color: '#F6E7FF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#C8AFDA',
    fontSize: 12,
    marginTop: -1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  tabsRow: {
    gap: 8,
    paddingRight: 14,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4E3567',
    backgroundColor: '#241536',
  },
  tabChipActive: {
    borderColor: '#FFD27A',
    backgroundColor: '#3A214F',
  },
  tabText: {
    color: '#E7D6F4',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFD27A',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4E3567',
    backgroundColor: '#241536',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#F2DEFF',
    fontSize: 13,
  },
  quickBtn: {
    minWidth: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4E3567',
    backgroundColor: '#241536',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  quickBtnActive: {
    backgroundColor: '#FFD27A',
    borderColor: '#FFD27A',
  },
  quickBtnText: {
    color: '#F2DEFF',
    fontSize: 12,
    fontWeight: '800',
  },
  quickBtnTextActive: {
    color: '#1A0E00',
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4E3567',
    minHeight: 210,
    backgroundColor: '#2A173D',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredShade: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 14,
    gap: 4,
  },
  featuredTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,210,122,0.2)',
    color: '#FFD27A',
    borderWidth: 1,
    borderColor: 'rgba(255,210,122,0.5)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  featuredTitle: {
    color: '#F7EAFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  featuredMeta: {
    color: '#D2BCE4',
    fontSize: 12,
    fontWeight: '600',
  },
  mainSection: {
    gap: 10,
  },
  sectionTitle: {
    color: '#F2DCFF',
    fontSize: 17,
    fontWeight: '800',
  },
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  posterCard: {
    width: '48.4%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4B3168',
    backgroundColor: '#241336',
    minHeight: 250,
  },
  posterCardWide: {
    width: 128,
    minHeight: 220,
  },
  posterImage: {
    width: '100%',
    height: 250,
  },
  posterImageWide: {
    height: 220,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 9, 29, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  posterShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 22,
    paddingBottom: 8,
    gap: 3,
  },
  metaRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(20, 9, 29, 0.72)',
    borderWidth: 1,
    borderColor: '#86613E',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFD27A',
    fontSize: 10,
    fontWeight: '800',
  },
  posterTitle: {
    color: '#F2DEFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  posterMeta: {
    color: '#CCB6E1',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalRow: {
    gap: 10,
    paddingRight: 14,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  centerBoxSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  helperText: {
    color: '#BDA5D5',
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
});
