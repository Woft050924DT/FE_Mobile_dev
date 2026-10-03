import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * Tự động phân giải IP Backend phù hợp cho mọi môi trường:
 * - Web: http://localhost:3000/api
 * - Expo Go (Điện thoại thật qua Wi-Fi): tự động lấy IP máy tính đang chạy Expo (VD: 192.168.110.229)
 * - Máy ảo Android (Emulator): kết nối qua LAN IP hoặc 10.0.2.2
 */
export const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }

  // Lấy IP từ Expo Dev Server Host URI (tự động đúng với mọi mạng Wi-Fi)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // IP mạng LAN hiện tại của máy tính
  const CURRENT_LAN_IP = '192.168.110.229';
  return `http://${CURRENT_LAN_IP}:3000/api`;
};

export const API_BASE_URL = getBaseUrl();

// Helper lưu trữ an toàn token đa nền tảng
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Gắn Bearer Token tự động từ Storage
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý khi Token hết hạn (401) -> Tự động gọi Refresh Token
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await storage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          const { accessToken, newRefreshToken } = res.data?.data || {};
          if (accessToken) {
            await storage.setItem('access_token', accessToken);
            if (newRefreshToken) {
              await storage.setItem('refresh_token', newRefreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        await storage.removeItem('access_token');
        await storage.removeItem('refresh_token');
        await storage.removeItem('user_profile');
      }
    }
    return Promise.reject(err);
  }
);
