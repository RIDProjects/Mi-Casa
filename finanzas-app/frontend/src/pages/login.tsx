import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      // Save token directly to localStorage to ensure it's available immediately
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuth(data.user, data.access_token);
      toast.success('¡Bienvenido!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-3xl font-bold text-white">FinanzasApp</h1>
          <p className="text-primary-200 mt-2">Sistema de gestión financiera</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="input" placeholder="admin@finanzas.com" required />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="input" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}