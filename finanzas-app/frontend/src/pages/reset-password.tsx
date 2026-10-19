import { useState } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
import AuthShell from '../components/layout/AuthShell';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setError(null);
    setLoading(true);
    try {
      await authAPI.resetPassword(token as string, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Token inválido o expirado. Solicita un nuevo enlace.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && typeof window !== 'undefined') {
    return (
      <AuthShell subtitle="Enlace inválido">
        <div className="text-center">
          <XCircle size={48} className="text-danger-ink mx-auto mb-4" />
          <h2 className="text-[22px] font-bold tracking-tight text-on-surface mb-3">Enlace inválido</h2>
          <p className="text-on-surface-variant text-sm mb-6">Este enlace de recuperación no es válido o ya fue utilizado.</p>
          <button onClick={() => router.push('/forgot-password')} className="btn-primary w-full">
            Solicitar nuevo enlace
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Nueva contraseña">
          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-ok-ink" />
                </div>
              </div>
              <h2 className="text-[22px] font-bold tracking-tight text-on-surface mb-3">¡Contraseña actualizada!</h2>
              <p className="text-on-surface-variant text-sm mb-6">
                Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold tracking-tight text-on-surface mb-2">Nueva contraseña</h2>
              <p className="font-body-default text-on-surface-variant mb-6">
                Elige una contraseña segura con al menos 8 caracteres.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      className={`input pr-10 ${weak ? 'border-warning' : ''}`}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {weak && <p className="text-xs text-warn-ink mt-1">Demasiado corta</p>}
                </div>

                <div>
                  <label className="label">Confirmar contraseña</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    className={`input ${mismatch ? 'border-danger' : ''}`}
                    placeholder="Repite la contraseña"
                    required
                  />
                  {mismatch && <p className="text-xs text-danger-ink mt-1">Las contraseñas no coinciden</p>}
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/25 rounded-lg px-4 py-3">
                    <p className="text-danger-ink text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading || mismatch || weak} className="btn-primary w-full py-3">
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </AuthShell>
  );
}
