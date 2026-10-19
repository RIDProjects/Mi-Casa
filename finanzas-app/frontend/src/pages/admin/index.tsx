import Layout from '../../components/layout/Layout';
import { useQuery } from 'react-query';
import { usersAPI, housesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import {
  Users, Home, UserCheck, UserX, TrendingUp,
  AlertTriangle, Activity, Crown, Star, Gift, ArrowRight,
} from 'lucide-react';
import { fmtInt as fmt } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';

const PLAN_CONFIG = {
  free:   { label: 'Gratis',  color: 'text-on-surface-variant',   bg: 'bg-surface-container',       icon: <Gift size={14} /> },
  pro:    { label: 'PRO',     color: 'text-info-ink',    bg: 'bg-primary-container/15 ',    icon: <Star size={14} /> },
  family: { label: 'Familia', color: 'text-info-ink ', bg: 'bg-primary-container/15 ', icon: <Crown size={14} /> },
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: stats } = useQuery('adminStats', () => usersAPI.getAdminStats().then(r => r.data), { staleTime: 60000 });
  const { data: houses = [] } = useQuery('adminHouses', () => housesAPI.getAll().then(r => r.data));

  const planDist = stats?.planDist ?? { free: 0, pro: 0, family: 0 };
  const paidTotal = planDist.pro + planDist.family;
  const convRate = stats?.total ? ((paidTotal / stats.total) * 100).toFixed(1) : '0.0';

  return (
    <Layout>
      <PageHeader title="Panel de administración" subtitle="Resumen del sistema en tiempo real" />

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={20} />} title="Total usuarios" value={fmt(Number(stats?.total ?? 0))} color="blue" />
        <StatCard icon={<UserCheck size={20} />} title="Activos" value={fmt(Number(stats?.activeUsers ?? 0))} subtitle={`${stats?.total ? Math.round((stats.activeUsers / stats.total) * 100) : 0}% del total`} color="green" />
        <StatCard icon={<Home size={20} />} title="Casas" value={fmt(Number(houses.length))} color="blue" />
        <StatCard icon={<TrendingUp size={20} />} title="Nuevos (30d)" value={fmt(Number(stats?.newLast30 ?? 0))} color="blue" />
      </div>

      {/* ── Engagement + Churn ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Activity size={20} />} title="Activos últimos 7d" value={fmt(Number(stats?.activeLast7 ?? 0))} color="blue" />
        <StatCard icon={<Activity size={20} />} title="Activos últimos 30d" value={fmt(Number(stats?.activeLast30 ?? 0))} color="blue" />
        <StatCard icon={<AlertTriangle size={20} />} title="Riesgo de churn" value={fmt(Number(stats?.churnRisk ?? 0))} subtitle="Activos sin login en 30d" color="yellow" />
        <StatCard icon={<UserX size={20} />} title="Nunca logueados" value={fmt(Number(stats?.neverLogged ?? 0))} subtitle="Registro sin primer acceso" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Distribución de planes ── */}
        <div className="bg-panel rounded-2xl shadow-soft border border-border-light p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
            <Crown size={16} className="text-info-ink" /> Distribución de planes
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
                      className={`h-2 rounded-full transition-all ${plan === 'free' ? 'bg-outline' : plan === 'pro' ? 'bg-primary-container' : 'bg-primary-container'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border-light flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Tasa de conversión</span>
            <span className="text-sm font-bold text-ok-ink fin-number">{convRate}%</span>
          </div>
        </div>

        {/* ── Casas recientes ── */}
        <div className="bg-panel rounded-2xl shadow-soft border border-border-light overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Home size={16} className="text-info-ink" /> Casas ({houses.length})
            </h2>
            <button onClick={() => router.push('/admin/houses')} className="inline-flex items-center gap-1 text-xs font-semibold text-info-ink hover:underline">Ver todas <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y divide-border-light max-h-64 overflow-y-auto">
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
        <div className="bg-panel rounded-2xl shadow-soft border border-border-light p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Accesos rápidos</h2>
          <div className="space-y-2">
            {[
              { label: 'Gestionar usuarios', href: '/admin/users', icon: <Users size={16} />, color: 'text-info-ink', bg: 'bg-primary-container/10 ' },
              { label: 'Gestionar casas',    href: '/admin/houses', icon: <Home size={16} />,  color: 'text-info-ink', bg: 'bg-primary-container/10 ' },
              { label: 'Gestionar roles',    href: '/admin/roles',  icon: <Star size={16} />,  color: 'text-warn-ink', bg: 'bg-warning/10 ' },
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
                <ArrowRight size={16} className="ml-auto text-outline" />
              </button>
            ))}
          </div>

          {(stats?.churnRisk ?? 0) > 0 && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/25 rounded-xl">
              <p className="text-xs font-medium text-warn-ink">
                {stats!.churnRisk} usuario{stats!.churnRisk !== 1 ? 's' : ''} sin actividad en 30 días.
                Considera enviar un recordatorio.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
