import { useRouter } from 'next/router';
import MiCasaProLogo from '../components/ui/MiCasaProLogo';
import { Home, AlertTriangle } from 'lucide-react';

export default function ServerErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <MiCasaProLogo className="justify-center mb-8" />
        <div className="flex items-center justify-center gap-2 text-6xl font-black text-danger tracking-tight">
          <AlertTriangle size={44} className="text-danger" /> 500
        </div>
        <h1 className="font-section-title text-[22px] text-on-surface mt-3">Error del servidor</h1>
        <p className="font-body-default text-body-default text-on-surface-variant mt-2">
          Algo salió mal de nuestro lado. Intentá de nuevo en unos minutos.
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
