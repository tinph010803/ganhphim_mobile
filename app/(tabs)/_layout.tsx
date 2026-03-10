import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import { House as Home, Search, Calendar, User } from 'lucide-react-native';

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Ensure tab bar is always tall enough to show icon + label on all devices
  const TAB_HEIGHT = Math.max(60, 48 + bottom);
  // Small screens (< 360dp width) hide labels to avoid crowding
  const showLabel = width >= 360;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: showLabel,
        tabBarStyle: {
          backgroundColor: '#101E53',
          borderTopColor: '#1D2A61',
          borderTopWidth: 0.5,
          paddingBottom: Math.max(6, bottom),
          paddingTop: 6,
          height: TAB_HEIGHT,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Tìm kiếm',
          tabBarIcon: ({ size, color }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch chiếu',
          tabBarIcon: ({ size, color }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
