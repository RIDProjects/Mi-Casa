import { useState } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="font-module-title text-[28px] text-primary">Mi Casa Pro</h1>
          <p className="font-caption text-caption text-on-surface-variant mt-1">Gestión Financiera del Hogar</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-success" />
                </div>
              </div>
              <h2 className="font-section-title text-[22px] text-on-surface mb-3">Revisá tu email</h2>
              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                Si el email <strong>{email}</strong> está registrado, vas a recibir un enlace para
                restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="font-body-small text-outline mb-6">El enlace expira en 1 hora.</p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Volver al login
              </button>

              <h2 className="font-section-title text-[22px] text-on-surface mb-2">Recuperar contraseña</h2>
              <p className="font-body-default text-on-surface-variant mb-6">
                Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      className="input pl-9"
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    <p className="text-danger text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
