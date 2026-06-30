import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginDto, AuthResponse } from '../types';
import apiClient, { registerUnauthorizedHandler } from '../services/apiClient';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar: restaurar sesión desde AsyncStorage
  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedUser] = await AsyncStorage.multiGet(['token', 'user']);
        const t = savedToken[1];
        const u = savedUser[1];
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u) as User);
        }
      } catch {
        // Sesión corrupta — ignorar y solicitar login
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  }, []);

  // Registrar el callback de 401 para el interceptor de axios
  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const login = useCallback(async (credentials: LoginDto) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const { access_token, user: userData } = res.data;
    await AsyncStorage.multiSet([
      ['token', access_token],
      ['user', JSON.stringify(userData)],
    ]);
    setToken(access_token);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
