import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import '../global.css';
import { useColorScheme } from '../hooks/use-color-scheme';
import { apiClient } from '../services/api/client';
import { AssetsService } from '../services/assets/assets.service';
import { ChatService } from '../services/chat/chat.service';
import { RentalsService } from '../services/rentals/rentals.service';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { User } from '../types/domain';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 320, fade: true });

const HOME_FILTERS = { limit: 10 } as const;
const STARTUP_WARMUP_LIMIT_MS = 1_400;
const MINIMUM_NATIVE_SPLASH_MS = 420;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function warmPublicExperience() {
  const assetPage = await queryClient
    .fetchQuery({
      queryKey: ['assets', 'list', HOME_FILTERS],
      queryFn: () => AssetsService.search(HOME_FILTERS),
    })
    .catch(() => null);
  const coverUrls = (assetPage?.data ?? [])
    .map((asset) => asset.images.find((image) => image.isCover)?.url ?? asset.images[0]?.url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 8);

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: async () => (await apiClient.get('/categories')).data,
    }),
    coverUrls.length > 0
      ? Image.prefetch(coverUrls, 'memory-disk')
      : Promise.resolve(),
  ]);
}

async function warmAuthenticatedExperience() {
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['me'],
      queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
    }),
    queryClient.prefetchQuery({
      queryKey: ['rentals', 'list', 'renter'],
      queryFn: () => RentalsService.getMyRentals('renter'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['rentals', 'list', 'owner'],
      queryFn: () => RentalsService.getMyRentals('owner'),
    }),
    queryClient.prefetchQuery({
      queryKey: ['conversations'],
      queryFn: ChatService.listMine,
    }),
    queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: async () => (await apiClient.get('/notifications')).data,
    }),
  ]);
}

async function warmApplication(isAuthenticated: boolean) {
  const tasks: Promise<unknown>[] = [warmPublicExperience()];

  if (isAuthenticated) {
    tasks.push(warmAuthenticatedExperience());
  }

  await Promise.allSettled(tasks);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const checkSession = useAuthStore((state) => state.checkSession);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [showLaunchExperience, setShowLaunchExperience] = useState(true);
  const warmupStarted = useRef(false);
  const finishLaunchExperience = useCallback(() => {
    setShowLaunchExperience(false);
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isLoadingAuth || warmupStarted.current) {
      return;
    }

    warmupStarted.current = true;
    let isMounted = true;
    const startedAt = Date.now();
    const warmup = warmApplication(isAuthenticated);

    void (async () => {
      await Promise.race([warmup, delay(STARTUP_WARMUP_LIMIT_MS)]);
      const remainingMinimumTime = Math.max(
        0,
        MINIMUM_NATIVE_SPLASH_MS - (Date.now() - startedAt),
      );
      if (remainingMinimumTime > 0) {
        await delay(remainingMinimumTime);
      }

      if (isMounted) {
        setIsNavigationReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoadingAuth]);

  useEffect(() => {
    if (!isNavigationReady) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(frame);
  }, [isNavigationReady]);

  if (!isNavigationReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
        {showLaunchExperience ? (
          <LaunchExperience onFinished={finishLaunchExperience} />
        ) : null}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function LaunchExperience({ onFinished }: { onFinished: () => void }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const logoScale = useSharedValue(reduceMotion ? 1 : 0.88);
  const logoOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const progress = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: reduceMotion ? 0 : 260,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 150,
      mass: 0.7,
    });
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: reduceMotion ? 0 : 520,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: reduceMotion ? 0 : 520,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      reduceMotion ? 1 : -1,
    );
    opacity.value = withDelay(
      reduceMotion ? 0 : 620,
      withTiming(0, {
        duration: reduceMotion ? 0 : 300,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    const finishTimer = setTimeout(onFinished, reduceMotion ? 20 : 940);

    return () => {
      clearTimeout(finishTimer);
      cancelAnimation(opacity);
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(progress);
    };
  }, [logoOpacity, logoScale, onFinished, opacity, progress, reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const leftDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [0.72, 1, 0.72]) }],
  }));
  const rightDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.72, 1]) }],
  }));

  return (
    <Animated.View
      accessibilityLabel="Borrow Hub đang chuẩn bị dữ liệu"
      accessibilityRole="progressbar"
      pointerEvents="none"
      style={[styles.launchContainer, containerStyle]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.DEFAULT} />
      <Animated.View style={[styles.launchContent, logoStyle]}>
        <View style={styles.logoSurface}>
          <Image
            source={require('../../assets/images/borrow-hub-mark-v2.png')}
            style={styles.logo}
            contentFit="contain"
            priority="high"
          />
        </View>
        <Text style={styles.brandName}>BORROW HUB</Text>
        <Text style={styles.tagline}>Chia sẻ gần hơn. Dùng đồ thông minh hơn.</Text>
        <View style={styles.progressRow}>
          <Animated.View
            style={[styles.progressDot, leftDotStyle]}
          />
          <View style={[styles.progressDot, styles.progressDotCenter]} />
          <Animated.View
            style={[styles.progressDot, rightDotStyle]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  launchContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },
  launchContent: {
    alignItems: 'center',
  },
  logoSurface: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  logo: {
    width: 82,
    height: 82,
  },
  brandName: {
    marginTop: 24,
    color: '#F7F4EC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4.2,
  },
  tagline: {
    marginTop: 9,
    color: 'rgba(247,244,236,0.78)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  progressRow: {
    marginTop: 34,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D5A94E',
  },
  progressDotCenter: {
    marginHorizontal: 8,
    backgroundColor: 'rgba(247,244,236,0.72)',
  },
});
