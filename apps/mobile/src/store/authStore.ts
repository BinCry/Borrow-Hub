import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
  setAuth: (token) => {
    if (token) {
      SecureStore.setItemAsync('accessToken', token);
      set({ accessToken: token, isAuthenticated: true, isLoading: false });
    } else {
      SecureStore.deleteItemAsync('accessToken');
      set({ accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    set({ accessToken: null, isAuthenticated: false, isLoading: false });
  },
  checkSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
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
