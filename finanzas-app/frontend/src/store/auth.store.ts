import { create } from 'zustand';

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
  hasPermission: (module: string, action: string) => boolean;
  isAdminGlobal: () => boolean;
  isHouseAdmin: () => boolean;
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
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    set({ user: null, token: null, isAuthenticated: false });
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
  isHouseAdmin: () => {
    const { user } = get();
    if (!user) return false;
    return user.roles?.some(r => r.name === 'house_admin') ?? false;
  },
}));
