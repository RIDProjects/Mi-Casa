import { useRouter } from 'next/router';
import MiCasaProLogo from '../components/ui/MiCasaProLogo';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <MiCasaProLogo className="justify-center mb-8" />
        <p className="text-6xl font-black text-primary tracking-tight">404</p>
        <h1 className="font-section-title text-[22px] text-on-surface mt-3">Página no encontrada</h1>
        <p className="font-body-default text-body-default text-on-surface-variant mt-2">
          La página que buscás no existe o fue movida.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn-primary flex items-center gap-2 mx-auto mt-8"
        >
          <Home size={18} /> Volver al Dashboard
        </button>
      </div>
    </div>
  );
}
