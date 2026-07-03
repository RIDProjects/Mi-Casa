import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
import { useThemeStore } from '../store/theme.store';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { useCurrencyStore } from '../store/currency.store';
import { houseCurrenciesAPI } from '../services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function CurrencyLoader() {
  const user = useAuthStore(s => s.user);
  const { setCurrencies, setRates } = useCurrencyStore();
  const houseId = user?.house?.id;

  useEffect(() => {
    if (!houseId) return;

    houseCurrenciesAPI
      .getAll(houseId)
      .then(r => setCurrencies(r.data))
      .catch(() => {});

    houseCurrenciesAPI
      .getRates(houseId)
      .then(r => setRates(r.data))
      .catch(() => {});
  }, [houseId]);

  return null;
}

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore(s => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-900" />;
  }

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const handleLogout = () => queryClient.clear();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.warn);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name="application-name" content="Mi Casa" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mi Casa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <ThemeInitializer>
        <CurrencyLoader />
        <Component {...pageProps} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#16a34a', secondary: '#dcfce7' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fee2e2' } },
          }}
        />
      </ThemeInitializer>
    </QueryClientProvider>
  );
}
