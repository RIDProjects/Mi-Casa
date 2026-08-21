import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { BookOpen, LayoutDashboard, X } from 'lucide-react';

export default function GuiaPage() {
  const router = useRouter();
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  useEffect(() => {
    if (router.query.welcome === '1') {
      setShowWelcomeBanner(true);
    }
  }, [router.query.welcome]);

  const handleDismissBanner = () => {
    setShowWelcomeBanner(false);
    router.replace('/guia', undefined, { shallow: true });
  };

  return (
    <Layout>
      <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 0px)' }}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={22} className="text-primary" />
            <div>
              <h1 className="font-semibold text-on-surface text-base leading-tight">Guía de Módulos</h1>
              <p className="text-xs text-on-surface-variant">Mi Casa Pro — Referencia completa de todas las funcionalidades</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <LayoutDashboard size={16} />
            Ir al Dashboard
          </Link>
        </div>

        {/* Welcome banner — only after first registration */}
        {showWelcomeBanner && (
          <div className="flex items-start gap-4 px-6 py-4 bg-primary-container border-b border-primary/20 flex-shrink-0">
            <span className="text-2xl flex-shrink-0">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-primary-container text-sm">¡Bienvenido/a a Mi Casa Pro!</p>
              <p className="text-sm text-on-primary-container/80 mt-0.5">
                Acá está la guía completa de todos los módulos del sistema. Cuando estés listo/a,
                hacé clic en "Ir al Dashboard" para empezar a usarlo.
              </p>
            </div>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-on-primary-container/60 hover:text-on-primary-container transition-colors flex-shrink-0"
              aria-label="Cerrar bienvenida"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Guide iframe — takes all remaining space */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src="/guia.html"
            title="Guía de Módulos — Mi Casa Pro"
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 72px)' }}
          />
        </div>
      </div>
    </Layout>
  );
}
