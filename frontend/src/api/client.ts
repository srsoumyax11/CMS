import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL, API_ROUTES, STORAGE_KEYS, AUTH_EVENTS } from '@/lib/constants';
import type {
  APIResponse,
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserResponse,
} from '@/types/api';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => {
    // If the backend returns HTTP 200 OK but success === false, throw it as a real error!
    if (response.data && response.data.success === false) {
      return Promise.reject(new Error(response.data.error || 'An error occurred'));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === API_ROUTES.LOGIN ||
      originalRequest.url === API_ROUTES.REGISTER
    ) {
      const serverError = error.response?.data?.error || error.message || 'An error occurred';
      const err = new Error(serverError) as Error & { status?: number };
      err.status = error.response?.status;
      return Promise.reject(err);
    }

    if (originalRequest.url === API_ROUTES.REFRESH) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.UNAUTHORIZED));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          };
          resolve(client(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<APIResponse<RefreshTokenResponse>>(
        `${API_BASE_URL}${API_ROUTES.REFRESH}`,
        { refresh_token: refreshToken } satisfies RefreshTokenRequest,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const newToken = response.data.data?.access_token;
      if (!newToken) throw new Error('No access token in refresh response');
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);

      processQueue(null, newToken);

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.UNAUTHORIZED));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export { client };
export default client;
