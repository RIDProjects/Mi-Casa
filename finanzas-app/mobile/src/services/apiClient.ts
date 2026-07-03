import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// Callback registrado por AuthContext para manejar sesión expirada
// sin crear una dependencia circular.
let _onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(cb: () => void): void {
  _onUnauthorized = cb;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Interceptor de request: adjunta el JWT desde AsyncStorage
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de response: maneja 401 y limpia sesión
// Solo dispara logout si HAY un token guardado (no durante el intento de login)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await AsyncStorage.multiRemove(['token', 'user']);
        _onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
