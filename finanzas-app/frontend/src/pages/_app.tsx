import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import { useThemeStore } from '../store/theme.store';
import { useEffect } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // Initialize theme from store on mount
    const stored = localStorage.getItem('theme-store');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.theme) {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(parsed.state.theme);
        }
      } catch (e) {
        // ignore
      }
    } else {
      // Default to light
      document.documentElement.classList.add('light');
    }
  }, []);

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer>
        <Component {...pageProps} />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </ThemeInitializer>
    </QueryClientProvider>
  );
}
