import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const setToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('accessToken', token);
  } else {
    await SecureStore.setItemAsync('accessToken', token);
  }
};

const deleteToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('accessToken');
  } else {
    await SecureStore.deleteItemAsync('accessToken');
  }
};

const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('accessToken');
  } else {
    return await SecureStore.getItemAsync('accessToken');
  }
};

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string | null) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: async (token) => {
    if (token) {
      await setToken(token);
      set({ accessToken: token, isAuthenticated: true, isLoading: false });
    } else {
      await deleteToken();
      set({ accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
  logout: async () => {
    await deleteToken();
    set({ accessToken: null, isAuthenticated: false, isLoading: false });
  },
  checkSession: async () => {
    try {
      const token = await getToken();
      if (token) {
        set({ accessToken: token, isAuthenticated: true, isLoading: false });
      } else {
        set({ accessToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch (e) {
      set({ accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
