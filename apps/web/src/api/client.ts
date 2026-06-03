import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';
import type { AuthResponse } from '@clinicaplus/types';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error('VITE_API_URL is not defined in environment variables');
}

/**
 * Base Axios client configured for all API requests.
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<AuthResponse> | null = null;

export function refreshSession(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = axios.post<{ data: AuthResponse }>(
      `${API_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
    )
      .then((response) => {
        const session = response.data.data;
        useAuthStore.getState().setSession(session.accessToken, session.utilizador);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Add Authorization header to every request if token exists
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Global response interceptor to handle token expiration (401).
 * Implements transparent single-flight token refresh for rotated refresh tokens.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config as RetriableRequestConfig | undefined;

    // Prevent infinite loops and handle only non-auth endpoint 401s
    if (
      axiosError.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const { accessToken } = await refreshSession();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clear();
      // Redirect to login if refresh fails
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  }
);
