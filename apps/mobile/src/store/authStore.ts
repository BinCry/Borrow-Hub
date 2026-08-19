import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const emptyTokens: StoredTokens = {
  accessToken: null,
  refreshToken: null,
};

async function setTokens(accessToken: string, refreshToken: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    return;
  }

  try {
    await Promise.all([
      SecureStore.setItemAsync('accessToken', accessToken),
      SecureStore.setItemAsync('refreshToken', refreshToken),
    ]);
  } catch (error) {
    await deleteTokens();
    throw error;
  }
}

async function deleteTokens() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync('accessToken'),
    SecureStore.deleteItemAsync('refreshToken'),
  ]);
}

async function getTokens(): Promise<StoredTokens> {
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync('accessToken'),
    SecureStore.getItemAsync('refreshToken'),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}

interface AuthState extends StoredTokens {
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  ...emptyTokens,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (accessToken, refreshToken) => {
    await setTokens(accessToken, refreshToken);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await deleteTokens();
    } finally {
      set({
        ...emptyTokens,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkSession: async () => {
    try {
      const tokens = await getTokens();

      if (tokens.accessToken && tokens.refreshToken) {
        set({
          ...tokens,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      await deleteTokens();
      set({
        ...emptyTokens,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch {
      set({
        ...emptyTokens,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
