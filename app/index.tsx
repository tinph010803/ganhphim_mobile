import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getHomeMovies } from '@/lib/ophim';

const BG_URL = 'https://i.ibb.co/sJtrJL4R/footer-bg.jpg';
const LOGO_URL = 'https://i.ibb.co/dJ7CJ8Pf/logo-ganh-removebg-preview.png';

export default function SplashScreen() {
  const router = useRouter();
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo in
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Warm the home cache + enforce minimum 1.5s splash
    Promise.all([
      getHomeMovies().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).finally(() => {
      router.replace('/(tabs)');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Image source={{ uri: BG_URL }} style={styles.bg} resizeMode="cover" />
      <View style={styles.dimmer} />

      <Animated.View style={[styles.center, { opacity: logoAnim, transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Gánh Phim</Text>
        <Text style={styles.tagline}>Xem phim miễn phí trực tuyến</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
        <Text style={styles.loadingText}>Đang tải</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 4,
  },
  appName: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '400',
  },
  bottom: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});
