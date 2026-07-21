import Layout from '../../components/layout/Layout';
import { useQuery } from 'react-query';
import { usersAPI, housesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import {
  Users, Home, UserCheck, UserX, TrendingUp,
  AlertTriangle, Activity, Crown, Star, Gift,
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES').format(Number(n) || 0);

const PLAN_CONFIG = {
  free:   { label: 'Gratis',  color: 'text-on-surface-variant',   bg: 'bg-surface-container',       icon: <Gift size={14} /> },
  pro:    { label: 'PRO',     color: 'text-primary',    bg: 'bg-blue-100 dark:bg-blue-900/30',    icon: <Star size={14} /> },
  family: { label: 'Familia', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Crown size={14} /> },
};

function StatCard({ icon, label, value, sub, color, bg }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <span className={color}>{icon}</span>
        </div>
        <span className="font-body-default text-on-surface-variant font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{fmt(Number(value))}</p>
      {sub && <p className="text-xs text-outline mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: stats } = useQuery('adminStats', () => usersAPI.getAdminStats().then(r => r.data), { staleTime: 60000 });
  const { data: houses = [] } = useQuery('adminHouses', () => housesAPI.getAll().then(r => r.data));

  const planDist = stats?.planDist ?? { free: 0, pro: 0, family: 0 };
  const paidTotal = planDist.pro + planDist.family;
  const convRate = stats?.total ? ((paidTotal / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-page-title text-page-title text-on-surface">Panel de Administración</h1>
        <p className="text-on-surface-variant mt-1">Resumen del sistema en tiempo real</p>
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Users size={18} />} label="Total usuarios" value={stats?.total ?? 0}
          color="text-primary" bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<UserCheck size={18} />} label="Activos" value={stats?.activeUsers ?? 0}
          sub={`${stats?.total ? Math.round((stats.activeUsers / stats.total) * 100) : 0}% del total`}
          color="text-success" bg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<Home size={18} />} label="Casas" value={houses.length}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          icon={<TrendingUp size={18} />} label="Nuevos (30d)" value={stats?.newLast30 ?? 0}
          color="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-900/20"
        />
      </div>

      {/* ── Engagement + Churn ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Activity size={18} />} label="Activos últimos 7d" value={stats?.activeLast7 ?? 0}
          color="text-primary" bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<Activity size={18} />} label="Activos últimos 30d" value={stats?.activeLast30 ?? 0}
          color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          icon={<AlertTriangle size={18} />} label="Riesgo de churn" value={stats?.churnRisk ?? 0}
          sub="Activos sin login en 30d"
          color="text-warning" bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatCard
          icon={<UserX size={18} />} label="Nunca logueados" value={stats?.neverLogged ?? 0}
          sub="Registro sin primer acceso"
          color="text-danger" bg="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Distribución de planes ── */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Crown size={16} className="text-purple-500" /> Distribución de planes
          </h2>
          <div className="space-y-3">
            {(Object.entries(planDist) as [string, number][]).map(([plan, count]) => {
              const cfg = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
              const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-sm font-bold text-on-surface">{count} <span className="text-xs text-outline">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${plan === 'free' ? 'bg-gray-400' : plan === 'pro' ? 'bg-blue-500' : 'bg-purple-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Tasa de conversión</span>
            <span className="text-sm font-bold text-success">{convRate}%</span>
          </div>
        </div>

        {/* ── Casas recientes ── */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Home size={16} className="text-purple-500" /> Casas ({houses.length})
            </h2>
            <button onClick={() => router.push('/admin/houses')} className="text-xs text-primary hover:underline">Ver todas →</button>
          </div>
          <div className="divide-y divide-outline-variant max-h-64 overflow-y-auto">
            {(houses as any[]).slice(0, 8).map((h: any) => (
              <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-on-surface">{h.name}</p>
                <span className="text-xs text-outline">{h.members?.length ?? 0} miembro{(h.members?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            ))}
            {houses.length === 0 && <p className="px-5 py-8 text-center text-sm text-outline">Sin casas</p>}
          </div>
        </div>

        {/* ── Accesos rápidos ── */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Accesos rápidos</h2>
          <div className="space-y-2">
            {[
              { label: 'Gestionar usuarios', href: '/admin/users', icon: <Users size={16} />, color: 'text-primary', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Gestionar casas',    href: '/admin/houses', icon: <Home size={16} />,  color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Gestionar roles',    href: '/admin/roles',  icon: <Star size={16} />,  color: 'text-warning', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            ].map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-gray transition-colors text-left"
              >
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <span className="text-sm font-medium text-on-surface">{item.label}</span>
                <span className="ml-auto text-outline">→</span>
              </button>
            ))}
          </div>

          {(stats?.churnRisk ?? 0) > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                ⚠️ {stats!.churnRisk} usuario{stats!.churnRisk !== 1 ? 's' : ''} sin actividad en 30 días.
                Considerá enviar un recordatorio.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
