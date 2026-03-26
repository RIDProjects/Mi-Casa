import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; name: string; email: string; roles: any[]; }

interface AuthStore {
  user: User | null; token: string | null; isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
}

// Initialize from localStorage to avoid hydration issues
const getInitialState = () => {
  if (typeof window === 'undefined') return { user: null, token: null, isAuthenticated: false };
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return { user, token, isAuthenticated: !!token };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),
      setAuth: (user, token) => { 
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true }); 
      },
      logout: () => { 
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false }); 
      },
      hasPermission: (module, action) => {
        const { user } = get();
        if (!user) return false;
        const isAdmin = user.roles?.some(r => r.name === 'admin');
        if (isAdmin) return true;
        return user.roles?.some(role => role.permissions?.some(p => p.module === module && p.action === action)) ?? false;
      },
    }),
    { name: 'auth-store' }
  )
);
