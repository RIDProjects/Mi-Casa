import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import { useThemeStore } from '../store/theme.store';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore(s => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply theme class to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-900" />;
  }

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
