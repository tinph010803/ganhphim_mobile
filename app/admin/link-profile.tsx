import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import {
  RO1_DEFAULT_URL,
  RO2_DEFAULT_URL,
  SPORTS_DEFAULT_URL,
  ONFLIX_DEFAULT_URL,
  ROPHIM_API_DEFAULT_URL,
  loadRo1Url,
  loadRo2Url,
  loadOnflixUrl,
  loadSportsUrl,
  normalizeHttpUrl,
  saveAppSettings,
} from '@/lib/appConfig';

type LinkField = {
  key: string;
  label: string;
  description: string;
  fallback: string;
  value: string;
};

export default function AdminLinkProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<LinkField[]>([
    { key: 'ro1_url', label: 'Rổ 1 URL', description: 'Link WebView cho màn Rổ 1.', fallback: RO1_DEFAULT_URL, value: RO1_DEFAULT_URL },
    { key: 'ro2_url', label: 'Rổ 2 URL', description: 'Link WebView cho màn Rổ 2.', fallback: RO2_DEFAULT_URL, value: RO2_DEFAULT_URL },
    { key: 'sports_url', label: 'Thể thao URL', description: 'Link cho màn Ganh Thể Thao.', fallback: SPORTS_DEFAULT_URL, value: SPORTS_DEFAULT_URL },
    { key: 'onflix_url', label: 'Onflix URL', description: 'Link WebView cho màn Onflix.', fallback: ONFLIX_DEFAULT_URL, value: ONFLIX_DEFAULT_URL },
  ]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [ro1, ro2, sports, api] = await Promise.all([
        loadRo1Url(RO1_DEFAULT_URL),
        loadRo2Url(RO2_DEFAULT_URL),
        loadSportsUrl(SPORTS_DEFAULT_URL),
        loadOnflixUrl(ONFLIX_DEFAULT_URL),
      ]);

      if (!cancelled) {
        setFields([
          { key: 'ro1_url', label: 'Rổ 1 URL', description: 'Link WebView cho màn Rổ 1.', fallback: RO1_DEFAULT_URL, value: ro1 },
          { key: 'ro2_url', label: 'Rổ 2 URL', description: 'Link WebView cho màn Rổ 2.', fallback: RO2_DEFAULT_URL, value: ro2 },
          { key: 'sports_url', label: 'Thể thao URL', description: 'Link cho màn Ganh Thể Thao.', fallback: SPORTS_DEFAULT_URL, value: sports },
          { key: 'onflix_url', label: 'Onflix URL', description: 'Link WebView cho màn Onflix.', fallback: ONFLIX_DEFAULT_URL, value: api },
        ]);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(index: number, value: string) {
    setFields((prev) => prev.map((field, i) => (i === index ? { ...field, value } : field)));
  }

  function handleReset() {
    Alert.alert('Khôi phục mặc định', 'Xoá các link đã lưu và dùng lại giá trị mặc định?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Khôi phục',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await saveAppSettings(fields.map((field) => ({ settingKey: field.key, settingValue: '' })));
            setFields((prev) => prev.map((field) => ({ ...field, value: field.fallback })));
            Alert.alert('Đã khôi phục', 'Đã xoá cấu hình link cũ. App sẽ dùng giá trị mặc định.');
          } catch {
            Alert.alert('Lỗi', 'Không thể khôi phục dữ liệu. Thử lại sau.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  async function handleSave() {
    const invalidField = fields.find((field) => field.value.trim() && !normalizeHttpUrl(field.value));
    if (invalidField) {
      Alert.alert('URL không hợp lệ', `Kiểm tra lại ${invalidField.label}.`);
      return;
    }

    setSaving(true);
    try {
      await saveAppSettings(
        fields.map((field) => ({
          settingKey: field.key,
          settingValue: field.value,
          description: field.description,
        }))
      );
      Alert.alert('Đã lưu', 'Link Profile đã được cập nhật.');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu link. Thử lại sau.');
    } finally {
      setSaving(false);
    }
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
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Link Profile</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
          <RotateCcw size={16} color={Colors.textSecondary} />
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
            Để trống một ô nếu muốn dùng lại link mặc định. Các link này được lưu trong Supabase để không phải sửa code khi domain đổi.
          </Text>

          {fields.map((field, index) => (
            <View key={field.key} style={styles.card}>
              <Text style={styles.label}>{field.label}</Text>
              <Text style={styles.description}>{field.description}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={(value) => updateField(index, value)}
                placeholder={field.fallback}
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <>
                <Save size={18} color={Colors.black} />
                <Text style={styles.saveBtnText}>Lưu Link Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  resetBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  hint: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  label: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  description: { color: Colors.textSecondary, fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: '#F3D061',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveBtnText: { color: Colors.black, fontSize: 15, fontWeight: '800' },
});