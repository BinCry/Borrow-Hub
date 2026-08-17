import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '../hooks/use-color-scheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const checkSession = useAuthStore((state) => state.checkSession);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isLoadingAuth) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingAuth]);

  if (isLoadingAuth) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
