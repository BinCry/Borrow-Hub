import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const setTokens = async (accessToken: string, refreshToken: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  }
};

const deleteTokens = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } else {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }
};

const getTokens = async () => {
  if (Platform.OS === 'web') {
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken')
    };
  } else {
    return {
      accessToken: await SecureStore.getItemAsync('accessToken'),
      refreshToken: await SecureStore.getItemAsync('refreshToken')
    };
  }
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (accessToken: string | null, refreshToken?: string | null) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: async (accessToken, refreshToken) => {
    if (accessToken && refreshToken) {
      await setTokens(accessToken, refreshToken);
      set({ accessToken, refreshToken, isAuthenticated: true, isLoading: false });
    } else {
      await deleteTokens();
      set({ accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  },
  logout: async () => {
    await deleteTokens();
    set({ accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },
  checkSession: async () => {
    try {
      const { accessToken, refreshToken } = await getTokens();
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken, isAuthenticated: true, isLoading: false });
      } else {
        set({ accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch (e) {
      set({ accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
