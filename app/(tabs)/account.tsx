import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { ChevronLeft, ChevronRight, CreditCard as Edit, Lock, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const MENU_ITEMS = [
  {
    id: 'avatar',
    label: 'Đổi ảnh đại diện',
    icon: User,
  },
  {
    id: 'info',
    label: 'Thay đổi thông tin',
    icon: Edit,
  },
  {
    id: 'password',
    label: 'Đổi mật khẩu',
    icon: Lock,
  },
];

export default function AccountScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý tài khoản</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.profileSection}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg',
              }}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          <View style={styles.menuSection}>
            {MENU_ITEMS.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index !== MENU_ITEMS.length - 1 && styles.menuItemGap,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Icon size={18} color={Colors.text} />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  profileSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.cardBackground,
  },
  menuSection: {
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  menuItemGap: {
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
