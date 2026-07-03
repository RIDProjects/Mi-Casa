import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '../services/api';
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
  const weak = password.length > 0 && password.length < 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setError(null);
    setLoading(true);
    try {
      await authAPI.resetPassword(token as string, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Token inválido o expirado. Solicitá un nuevo enlace.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && typeof window !== 'undefined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Enlace inválido</h2>
          <p className="text-gray-500 text-sm mb-6">Este enlace de recuperación no es válido o ya fue utilizado.</p>
          <button onClick={() => router.push('/forgot-password')} className="btn-primary w-full">
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-3xl font-bold text-white">Mi Casa Pro</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">¡Contraseña actualizada!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Ya podés iniciar sesión con tu nueva contraseña.
              </p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nueva contraseña</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Elegí una contraseña segura con al menos 6 caracteres.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      className={`input pr-10 ${weak ? 'border-amber-400' : ''}`}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {weak && <p className="text-xs text-amber-600 mt-1">Demasiado corta</p>}
                </div>

                <div>
                  <label className="label">Confirmar contraseña</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    className={`input ${mismatch ? 'border-red-400' : ''}`}
                    placeholder="Repetí la contraseña"
                    required
                  />
                  {mismatch && <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>}
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading || mismatch || weak} className="btn-primary w-full py-3">
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
