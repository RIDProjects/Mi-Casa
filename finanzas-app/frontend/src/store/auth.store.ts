import { create } from 'zustand';
import { resetSessionState } from '../lib/session';
import { authAPI } from '../services/api';

interface House { id: string; name: string; }

interface User {
  id: string;
  name: string;
  email: string;
  roles: any[];
  house?: House;
}

interface AuthStore {
  user: User | null; token: string | null; isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  /** Revokes every session server-side, then logs out locally. Resolves false if the server call failed. */
  logoutAll: () => Promise<boolean>;
  hasPermission: (module: string, action: string) => boolean;
  isAdminGlobal: () => boolean;
}

const getInitialState = () => {
  if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false };
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { user, token, isAuthenticated: !!token };
  } catch {
    return { user: null, token: null, isAuthenticated: false };
  }
};

export const useAuthStore = create<AuthStore>()((set, get) => ({
  ...getInitialState(),
  setAuth: (user, token) => {
    const previousUserId = get().user?.id;
    if (previousUserId !== user.id) resetSessionState();
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    resetSessionState();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
  logoutAll: async () => {
    let revoked = true;
    try {
      await authAPI.logoutAll();
    } catch {
      revoked = false;
    }
    get().logout();
    return revoked;
  },
  hasPermission: (module, action) => {
    const { user } = get();
    if (!user) return false;
    const isAdmin = user.roles?.some(r => r.name === 'admin' || r.name === 'house_admin');
    if (isAdmin) return true;
    return user.roles?.some(role => role.permissions?.some(p => p.module === module && p.action === action)) ?? false;
  },
  isAdminGlobal: () => {
    const { user } = get();
    if (!user) return false;
    return user.roles?.some(r => r.name === 'admin') ?? false;
  },
}));
