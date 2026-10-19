import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import AuthShell from '../components/layout/AuthShell';
import { Home, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const invitationToken = typeof router.query.invitationToken === 'string' ? router.query.invitationToken : '';
  const isInvitation = !!invitationToken;
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

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!isInvitation && form.housePassword.length < 3) {
      toast.error('La contraseña de la casa debe tener al menos 3 caracteres');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const payload = isInvitation
        ? { name: form.name, email: form.email, password: form.password, invitationToken }
        : form;
      const { data } = await authAPI.register(payload);
      setAuth(data.user, data.access_token);
      toast.success('¡Registro exitoso! Bienvenido a tu casa.');

      const isAdminGlobal = data.user.roles?.some((r: any) => r.name === 'admin');
      router.push(isAdminGlobal ? '/admin' : '/guia?welcome=1');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError('No autorizado. Verifica los datos ingresados.');
      } else {
        setError(err.response?.data?.message || 'Error al registrarse. Intenta de nuevo.');
      }
      setForm(f => ({ ...f, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell subtitle="Crear cuenta" onBack={() => router.push('/login')} backLabel="Volver al login">
          <h2 className="text-[22px] font-bold tracking-tight text-on-surface mb-6">Registrarse</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isInvitation ? (
              <div className="bg-primary-container/10 rounded-lg p-4 border border-primary-container/25 flex items-center gap-2">
                <Home size={18} className="text-primary" />
                <span className="text-sm text-info-ink">
                  Te invitaron a unirte a una casa — completa tus datos para aceptar la invitación.
                </span>
              </div>
            ) : (
              /* Casa Info */
              <div className="bg-primary-container/10 rounded-lg p-4 border border-primary-container/25">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={18} className="text-primary" />
                  <span className="font-medium text-info-ink">Información de la Casa</span>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
                      >
                        {showHousePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-primary mt-1">
                      Comparte esta contraseña con los miembros de tu casa
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="font-body-small text-outline mt-1">Mínimo 8 caracteres</p>
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
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-on-surface-variant">
              ¿Ya tienes una cuenta?{' '}
              <button onClick={() => router.push('/login')} className="text-primary hover:opacity-80 font-medium">
                Iniciar sesión
              </button>
            </p>
          </div>
        </AuthShell>
  );
}
