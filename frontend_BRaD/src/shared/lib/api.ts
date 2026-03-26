import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://diploma-backend-0l08.onrender.com/api/v1';

type StoredAuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  accessToken?: string;
  refreshToken?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const AUTH_STORAGE_KEY = 'authUser';

const isBrowser = (): boolean => typeof window !== 'undefined';

const readStoredAuthUser = (): StoredAuthUser | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
};

const writeStoredAuthUser = (user: StoredAuthUser): void => {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

const clearStoredAuthUser = (): void => {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const redirectToLogin = (): void => {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== '/app/login') {
    window.location.href = '/app/login';
  }
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as {
      response?: { data?: { message?: string | string[]; errors?: string[] } };
    }).response;

    if (Array.isArray(response?.data?.message) && response?.data?.message.length) {
      return response.data.message.join(', ');
    }

    if (typeof response?.data?.message === 'string' && response.data.message.trim()) {
      return response.data.message;
    }

    if (Array.isArray(response?.data?.errors) && response.data.errors.length) {
      return response.data.errors.join(', ');
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  return ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/refresh'].some((path) =>
    url.includes(path),
  );
};

const refreshAccessToken = async (): Promise<string | null> => {
  const authUser = readStoredAuthUser();
  if (!authUser?.refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: authUser.refreshToken,
      })
      .then((response) => {
        const nextAccessToken = response.data?.accessToken as string | undefined;
        const nextRefreshToken =
          (response.data?.refreshToken as string | undefined) || authUser.refreshToken;

        if (!nextAccessToken) {
          return null;
        }

        writeStoredAuthUser({
          ...authUser,
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        });

        return nextAccessToken;
      })
      .catch(() => {
        clearStoredAuthUser();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use(
  (config) => {
    const authUser = readStoredAuthUser();
    if (authUser?.accessToken) {
      config.headers.Authorization = `Bearer ${authUser.accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const nextAccessToken = await refreshAccessToken();
      if (nextAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      }
    }

    if (status === 401) {
      clearStoredAuthUser();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);

export default api;
