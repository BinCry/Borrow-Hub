import { AxiosError, InternalAxiosRequestConfig, create } from 'axios';
import { useAuthStore } from '../../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;

type AuthTokensResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueuedRequest = {
  resolve: (accessToken: string) => void;
  reject: (error: unknown) => void;
};

export const apiClient = create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

const refreshClient = create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

function processQueue(error: unknown, accessToken?: string) {
  failedQueue.forEach((request) => {
    if (error || !accessToken) {
      request.reject(error ?? new Error('Token refresh failed'));
      return;
    }

    request.resolve(accessToken);
  });

  failedQueue = [];
}

function isAuthenticationRequest(url?: string) {
  return url === '/auth/login' || url === '/auth/refresh';
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest !== undefined &&
      !originalRequest._retry &&
      !isAuthenticationRequest(originalRequest.url);

    if (!shouldRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((accessToken) => {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await refreshClient.post<AuthTokensResponse>(
        '/auth/refresh',
        { refreshToken },
      );
      const { accessToken, refreshToken: nextRefreshToken } =
        response.data.tokens;

      await useAuthStore.getState().setAuth(accessToken, nextRefreshToken);
      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError: unknown) {
      processQueue(refreshError);
      await useAuthStore
        .getState()
        .logout()
        .catch(() => undefined);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
