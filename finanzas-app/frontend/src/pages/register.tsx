import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { Moon, Sun, ArrowLeft, Home, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const { theme, toggleTheme } = useThemeStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    houseName: '',
    housePassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHousePassword, setShowHousePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (form.housePassword.length < 3) {
      toast.error('La contraseña de la casa debe tener al menos 3 caracteres');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      setAuth(data.user, data.access_token);
      toast.success('¡Registro exitoso! Bienvenido a tu casa.');

      const isAdminGlobal = data.user.roles?.some((r: any) => r.name === 'admin');
      router.push(isAdminGlobal ? '/admin' : '/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError('No autorizado. Verificá los datos ingresados.');
      } else {
        setError(err.response?.data?.message || 'Error al registrarse. Intentá de nuevo.');
      }
      setForm(f => ({ ...f, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        {theme === 'dark' ? (
          <Sun size={24} className="text-yellow-400" />
        ) : (
          <Moon size={24} className="text-white" />
        )}
      </button>

      {/* Back to Login */}
      <button
        onClick={() => router.push('/login')}
        className="fixed top-4 left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-3xl font-bold text-white">Mi Casa Pro</h1>
          <p className="text-blue-200 mt-2">Crea tu cuenta y únete a tu casa</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Registrarse</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Casa Info */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Home size={18} className="text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-200">Información de la Casa</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Nombre de la casa</label>
                  <input
                    type="text"
                    value={form.houseName}
                    onChange={e => { setError(null); setForm({ ...form, houseName: e.target.value }); }}
                    className="input"
                    placeholder="Mi Casa"
                    required
                    minLength={2}
                  />
                </div>
                <div>
                  <label className="label">Contraseña de la casa</label>
                  <div className="relative">
                    <input
                      type={showHousePassword ? 'text' : 'password'}
                      value={form.housePassword}
                      onChange={e => { setError(null); setForm({ ...form, housePassword: e.target.value }); }}
                      className="input pr-10"
                      placeholder="••••••••"
                      required
                      minLength={3}
                    />
                    <button
                      type="button"
                      onClick={() => setShowHousePassword(!showHousePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showHousePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Comparte esta contraseña con los miembros de tu casa
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => { setError(null); setForm({ ...form, name: e.target.value }); }}
                className="input"
                placeholder="Juan Pérez"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setError(null); setForm({ ...form, email: e.target.value }); }}
                className="input"
                placeholder="juan@email.com"
                required
              />
            </div>
            <div>
              <label className="label">Tu contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setError(null); setForm({ ...form, password: e.target.value }); }}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
            </div>
            {error && (
              <div
                aria-live="polite"
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-2"
              >
                <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes una cuenta?{' '}
              <button onClick={() => router.push('/login')} className="text-blue-600 hover:text-blue-700 font-medium">
                Iniciar sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
