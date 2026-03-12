import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import {
  FeaturedOverride,
  loadFeaturedOverrides,
  saveFeaturedOverrides,
  resetFeaturedOverrides,
} from '@/lib/featuredOverrides';
import { searchMovies } from '@/lib/ophim';
import { loadTop10Slugs, saveTop10Slugs } from '@/lib/top10Films';
import { Movie } from '@/types/movie';

/* ─── Movie search modal ─────────────────────────────────── */
function MovieSearchModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (movie: Movie) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return setResults([]);
    setLoading(true);
    try {
      const res = await searchMovies(q);
      setResults(res.slice(0, 20));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  // Reset khi modal đóng để lần mở sau sạch keyword
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={modal.container}>
        <View style={modal.header}>
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={modal.title}>Tìm phim</Text>
        </View>

        <View style={modal.searchRow}>
          <Search size={16} color={Colors.textSecondary} />
          <TextInput
            style={modal.input}
            placeholder="Nhập tên phim..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />}

        <FlatList
          data={results}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modal.movieRow}
              onPress={() => { onSelect(item); onClose(); }}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.thumb_url }} style={modal.movieThumb} />
              <View style={{ flex: 1 }}>
                <Text style={modal.movieTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={modal.movieSlug} numberOfLines={1}>slug: {item.slug || item.id}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading && query.length > 0 ? (
              <Text style={modal.empty}>Không tìm thấy phim nào.</Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Single override card ───────────────────────────────── */
function OverrideCard({
  item,
  index,
  onChange,
  onDelete,
}: {
  item: FeaturedOverride;
  index: number;
  onChange: (index: number, updated: FeaturedOverride) => void;
  onDelete: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // Raw string state cho 4 field số để giữ dấu chấm/dấu trừ khi đang gõ
  const [rawW, setRawW] = useState(item.charW !== undefined ? String(item.charW) : '');
  const [rawH, setRawH] = useState(item.charH !== undefined ? String(item.charH) : '');
  const [rawRight, setRawRight] = useState(item.charRight !== undefined ? String(item.charRight) : '');
  const [rawBottom, setRawBottom] = useState(item.charBottom !== undefined ? String(item.charBottom) : '');

  function set(field: keyof FeaturedOverride, value: string | number) {
    onChange(index, { ...item, [field]: value });
  }

  function setNum(field: keyof FeaturedOverride, raw: string, setRaw: (s: string) => void) {
    setRaw(raw);
    // Chỉ parse khi không phải partial decimal/minus
    if (raw === '' || raw === '-' || raw.endsWith('.')) return;
    const n = parseFloat(raw);
    onChange(index, { ...item, [field]: isNaN(n) ? undefined : n });
  }

  return (
    <View style={card.container}>
      {/* Header row */}
      <TouchableOpacity
        style={card.headerRow}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={card.slug} numberOfLines={1}>{item.slug || '(chưa chọn phim)'}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(index)} style={card.deleteBtn}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
        {expanded ? (
          <ChevronUp size={18} color={Colors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={Colors.textSecondary} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={card.body}>
          {/* Slug / chọn phim */}
          <Text style={card.label}>Slug phim</Text>
          <View style={card.slugRow}>
            <TextInput
              style={[card.input, { flex: 1 }]}
              value={item.slug}
              onChangeText={(v) => set('slug', v)}
              placeholder="vi-du-ten-phim"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={card.searchBtn}
              onPress={() => setSearchVisible(true)}
            >
              <Search size={16} color="#fff" />
              <Text style={card.searchBtnText}>Tìm</Text>
            </TouchableOpacity>
          </View>

          {/* BG */}
          <Text style={card.label}>Ảnh nền (bg)</Text>
          <TextInput
            style={card.input}
            value={item.bg ?? ''}
            onChangeText={(v) => set('bg', v)}
            placeholder="https://..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
          {!!item.bg && (
            <Image source={{ uri: item.bg }} style={card.preview} resizeMode="cover" />
          )}

          {/* Character */}
          <Text style={card.label}>Ảnh nhân vật (character)</Text>
          <TextInput
            style={card.input}
            value={item.character ?? ''}
            onChangeText={(v) => set('character', v)}
            placeholder="https://..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
          {!!item.character && (
            <Image source={{ uri: item.character }} style={card.preview} resizeMode="contain" />
          )}

          {/* Title image */}
          <Text style={card.label}>Ảnh tên phim (titleImg)</Text>
          <TextInput
            style={card.input}
            value={item.titleImg ?? ''}
            onChangeText={(v) => set('titleImg', v)}
            placeholder="https://..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
          {!!item.titleImg && (
            <Image source={{ uri: item.titleImg }} style={[card.preview, { height: 60 }]} resizeMode="contain" />
          )}

          {/* Numeric sliders */}
          <Text style={card.sectionLabel}>Tùy chỉnh ảnh nhân vật</Text>

          <View style={card.numRow}>
            <View style={card.numField}>
              <Text style={card.label}>charW (0–1)</Text>
              <TextInput
                style={card.input}
                value={rawW}
                onChangeText={(v) => setNum('charW', v, setRawW)}
                placeholder="0.60"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={card.numField}>
              <Text style={card.label}>charH (0–1.5)</Text>
              <TextInput
                style={card.input}
                value={rawH}
                onChangeText={(v) => setNum('charH', v, setRawH)}
                placeholder="1.10"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={card.numRow}>
            <View style={card.numField}>
              <Text style={card.label}>charRight (px)</Text>
              <TextInput
                style={card.input}
                value={rawRight}
                onChangeText={(v) => setNum('charRight', v, setRawRight)}
                placeholder="-10"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={card.numField}>
              <Text style={card.label}>charBottom (px)</Text>
              <TextInput
                style={card.input}
                value={rawBottom}
                onChangeText={(v) => setNum('charBottom', v, setRawBottom)}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>
      )}

      <MovieSearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={(movie) => {
          onChange(index, { ...item, slug: movie.slug || movie.id });
        }}
      />
    </View>
  );
}

/* ─── Admin Featured screen ──────────────────────────────── */
export default function AdminFeaturedScreen() {
  const router = useRouter();
  const [list, setList] = useState<FeaturedOverride[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Top 10 Phim Lẻ state
  const [top10Slugs, setTop10Slugs] = useState<string[]>(Array(10).fill(''));
  const [savingTop10, setSavingTop10] = useState(false);
  const [searchVisibleTop10, setSearchVisibleTop10] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      loadFeaturedOverrides(),
      loadTop10Slugs(),
    ]).then(([featured, slugs]) => {
      setList(featured);
      if (slugs && slugs.length > 0) {
        const padded = [...slugs, ...Array(Math.max(0, 10 - slugs.length)).fill('')];
        setTop10Slugs(padded.slice(0, 10));
      }
      setLoading(false);
    });
  }, []);

  async function handleSaveTop10() {
    const valid = top10Slugs.filter((s) => s.trim() !== '');
    setSavingTop10(true);
    try {
      await saveTop10Slugs(valid);
      Alert.alert('Đã lưu', 'Top 10 Phim Lẻ đã được cập nhật.\nKhởi động lại app để thấy thay đổi.');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu. Thử lại sau.');
    } finally {
      setSavingTop10(false);
    }
  }

  function handleChange(index: number, updated: FeaturedOverride) {
    setList((prev) => prev.map((item, i) => (i === index ? updated : item)));
  }

  function handleDelete(index: number) {
    Alert.alert('Xoá phim', 'Bạn chắc muốn xoá phim này khỏi danh sách Top?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => setList((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  }

  function handleAdd() {
    setList((prev) => [...prev, { slug: '' }]);
  }

  async function handleSave() {
    const valid = list.filter((o) => o.slug.trim() !== '');
    if (valid.length === 0) {
      Alert.alert('Lỗi', 'Cần ít nhất 1 phim có slug hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      await saveFeaturedOverrides(valid);
      Alert.alert('Đã lưu', 'Danh sách Top Phim đã được cập nhật.\nKhởi động lại app để thấy thay đổi.');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    Alert.alert('Khôi phục mặc định', 'Xoá toàn bộ chỉnh sửa và quay về dữ liệu gốc?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Khôi phục',
        style: 'destructive',
        onPress: async () => {
          await resetFeaturedOverrides();
          const def = await loadFeaturedOverrides();
          setList(def);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Top Phim (Admin)</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Nhấn vào từng phim để chỉnh sửa. Kéo xuống để thêm phim mới.
            Thứ tự trong danh sách sẽ là thứ tự hiển thị banner.
          </Text>

          {list.map((item, i) => (
            <OverrideCard
              key={i}
              item={item}
              index={i}
              onChange={handleChange}
              onDelete={handleDelete}
            />
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.addBtnText}>Thêm phim</Text>
          </TouchableOpacity>

          {/* ─── Top 10 Phim Lẻ section ─── */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeader}>Top 10 Phim Lẻ Hay Nhức Nách</Text>
          <Text style={styles.hint}>Chọn đúng 10 slug phim lẻ. Để trống = lấy 10 phim lẻ mới nhất tự động.</Text>

          {top10Slugs.map((slug, i) => (
            <View key={i} style={card.container}>
              <View style={[card.headerRow, { paddingVertical: 10 }]}>
                <Text style={[card.slug, { color: Colors.textSecondary, minWidth: 24 }]}>{i + 1}.</Text>
                <TextInput
                  style={[card.input, { flex: 1, marginLeft: 6 }]}
                  value={slug}
                  onChangeText={(v) => {
                    setTop10Slugs((prev) => prev.map((s, idx) => idx === i ? v : s));
                  }}
                  placeholder="slug-phim-le"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[card.searchBtn, { marginLeft: 6 }]}
                  onPress={() => setSearchVisibleTop10(i)}
                >
                  <Search size={14} color="#fff" />
                </TouchableOpacity>
                {slug.trim() !== '' && (
                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => setTop10Slugs((prev) => prev.map((s, idx) => idx === i ? '' : s))}
                  >
                    <X size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { marginTop: 8, opacity: savingTop10 ? 0.6 : 1 }]}
            onPress={handleSaveTop10}
            activeOpacity={0.85}
            disabled={savingTop10}
          >
            {savingTop10
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Lưu Top 10 Phim Lẻ</Text>}
          </TouchableOpacity>

          {/* Search modal for top10 */}
          <MovieSearchModal
            visible={searchVisibleTop10 !== null}
            onClose={() => setSearchVisibleTop10(null)}
            onSelect={(movie) => {
              if (searchVisibleTop10 !== null) {
                const s = movie.slug || movie.id;
                setTop10Slugs((prev) => prev.map((v, idx) => idx === searchVisibleTop10 ? s : v));
                setSearchVisibleTop10(null);
              }
            }}
          />
        </ScrollView>

        {/* Save button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 4, marginRight: 12 },
  title: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '700' },
  resetText: { color: '#ef4444', fontSize: 13 },

  scrollContent: { padding: 16, paddingBottom: 20 },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: 'center',
    marginTop: 8,
  },
  addBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  sectionHeader: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

const card = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  slug: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  deleteBtn: { padding: 4 },
  body: { paddingHorizontal: 14, paddingBottom: 16 },

  label: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4, marginTop: 10 },
  sectionLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 2,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  preview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#111',
  },
  slugRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  numRow: { flexDirection: 'row', gap: 10 },
  numField: { flex: 1 },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeBtn: { padding: 4 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, color: Colors.text, fontSize: 14 },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  movieThumb: { width: 52, height: 70, borderRadius: 6, backgroundColor: '#111' },
  movieTitle: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  movieSlug: { color: Colors.textSecondary, fontSize: 11, marginTop: 3 },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
