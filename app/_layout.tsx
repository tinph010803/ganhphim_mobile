import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Colors } from '@/constants/colors';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
    <ToastProvider>
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="movie/[id]" />
        <Stack.Screen name="movie/player" options={{ animation: 'none' }} />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="watch-history" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
    </ToastProvider>
    </AuthProvider>
  );
}
