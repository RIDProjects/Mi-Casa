import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

// Get initial theme from localStorage or default to light
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('theme-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state?.theme) return parsed.state.theme;
    }
  } catch (e) {
    // ignore
  }
  return 'light';
};

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        if (typeof window !== 'undefined') {
          // Cross-fade colours instead of flipping instantly (CSS lives in globals.css)
          const root = document.documentElement;
          root.classList.add('theme-transition');
          window.setTimeout(() => root.classList.remove('theme-transition'), 450);
        }
        set({ theme: newTheme });
        // Apply to document
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(newTheme);
        }
      },
    }),
    { name: 'theme-store' }
  )
);
