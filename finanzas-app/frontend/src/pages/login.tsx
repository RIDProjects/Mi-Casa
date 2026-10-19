import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import AuthShell from '../components/layout/AuthShell';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      setAuth(data.user, data.access_token);
      toast.success('¡Bienvenido!');

      const isAdminGlobal = data.user.roles?.some((r: any) => r.name === 'admin');
      router.push(isAdminGlobal ? '/admin' : '/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else {
        setError(err.response?.data?.message || 'Error al iniciar sesión. Intenta de nuevo.');
      }
      setForm(f => ({ ...f, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Acceso">
          <h2 className="text-[22px] font-bold tracking-tight text-on-surface mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setError(null); setForm({ ...form, email: e.target.value }); }}
                className="input"
                placeholder="admin@finanzas.com"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setError(null); setForm({ ...form, password: e.target.value }); }}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div
                aria-live="polite"
                className="bg-danger/10 border border-danger/25 rounded-lg px-4 py-3 flex items-center gap-2"
              >
                <span className="text-danger-ink text-sm font-medium">{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <div className="text-center mt-3">
              <button type="button" onClick={() => router.push('/forgot-password')}
                className="text-sm text-on-surface-variant hover:text-primary transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-on-surface-variant">
              ¿No tienes una cuenta?{' '}
              <button onClick={() => router.push('/register')} className="text-primary hover:opacity-80 font-medium">
                Regístrate aquí
              </button>
            </p>
          </div>
        </AuthShell>
  );
}
