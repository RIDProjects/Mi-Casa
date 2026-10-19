import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import guiaHtml from '../content/guia.html';
import { BookOpen, LayoutDashboard, X, PartyPopper } from 'lucide-react';

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
      <div className="flex flex-col h-full min-h-screen">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-panel flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen size={22} className="text-info-ink" />
            <div>
              <h1 className="font-semibold text-on-surface text-base leading-tight">Guía de Módulos</h1>
              <p className="text-xs text-on-surface-variant">Mi Casa Pro — Referencia completa de todas las funcionalidades</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="btn-primary"
          >
            <LayoutDashboard size={16} />
            Ir al Dashboard
          </Link>
        </div>

        {/* Welcome banner — only after first registration */}
        {showWelcomeBanner && (
          <div className="flex items-start gap-4 px-6 py-4 bg-primary-container border-b border-primary/20 flex-shrink-0">
            <PartyPopper size={24} className="text-info-ink flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-primary-container text-sm">¡Bienvenido/a a Mi Casa Pro!</p>
              <p className="text-sm text-on-primary-container/80 mt-0.5">
                Acá está la guía completa de todos los módulos del sistema. Cuando estés listo/a,
                haz clic en &quot;Ir al Dashboard&quot; para empezar a usarlo.
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
            srcDoc={guiaHtml}
            title="Guía de Módulos — Mi Casa Pro"
            className="w-full h-full border-0 min-h-[calc(100vh-72px)]"
          />
        </div>
      </div>
    </Layout>
  );
}
