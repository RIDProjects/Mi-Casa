import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationsAPI } from '../services/api';
import { Bell, CheckCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePushNotifications } from '../hooks/usePushNotifications';

type FilterType = 'todas' | 'no_leidas' | 'presupuesto' | 'metas' | 'tarjetas';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'todas',       label: 'Todas' },
  { key: 'no_leidas',   label: 'No leídas' },
  { key: 'presupuesto', label: 'Presupuesto' },
  { key: 'metas',       label: 'Metas' },
  { key: 'tarjetas',    label: 'Tarjetas' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function NotificacionesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('todas');
  const { permission, requestPermission } = usePushNotifications();

  const { data: notifications = [], isLoading, isError, refetch } = useQuery(
    'notifications',
    () => notificationsAPI.getAll().then(r => r.data),
    { staleTime: 30 * 1000, retry: false }
  );

  const markReadMut = useMutation((id: string) => notificationsAPI.markRead(id), {
    onSuccess: () => qc.invalidateQueries('notifications'),
    onError: () => { toast.error('Error al marcar como leída'); },
  });

  const markAllReadMut = useMutation(() => notificationsAPI.markAllRead(), {
    onSuccess: () => { toast.success('Todas marcadas como leídas'); qc.invalidateQueries('notifications'); },
    onError: () => { toast.error('Error'); },
  });

  const unreadCount = (notifications as any[]).filter((n: any) => !n.isRead).length;

  const filtered = (notifications as any[]).filter((n: any) => {
    if (filter === 'no_leidas') return !n.isRead;
    if (filter === 'presupuesto') return n.type === 'presupuesto';
    if (filter === 'metas') return n.type === 'metas';
    if (filter === 'tarjetas') return n.type === 'tarjetas';
    return true;
  });

  return (
    <Layout>
      {permission === 'default' && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Activar notificaciones push</p>
            <p className="text-xs text-primary mt-0.5">Recibí alertas de presupuesto y vencimientos en tu dispositivo</p>
          </div>
          <button onClick={requestPermission} className="px-3 py-1.5 bg-primary-container text-on-primary text-sm rounded-lg hover:opacity-90">
            Activar
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface flex items-center gap-2">
            <Bell size={24} /> Notificaciones
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-on-surface-variant mt-1">Alertas y avisos del sistema</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMut.mutate()}
            disabled={markAllReadMut.isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
          >
            <CheckCheck size={16} /> Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary-600 text-white'
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {f.label}
            {f.key === 'no_leidas' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-on-surface-variant">No se pudieron cargar las notificaciones</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-on-surface">No hay notificaciones</h3>
          <p className="font-body-default text-on-surface-variant mt-1">
            {filter === 'no_leidas' ? 'No tenés notificaciones sin leer' : 'No hay notificaciones en esta categoría'}
          </p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((n: any) => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) markReadMut.mutate(n.id); }}
              className={`bg-surface-container-lowest rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                n.isRead
                  ? 'border-outline-variant opacity-70'
                  : 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm ${n.isRead ? 'text-on-surface-variant' : 'font-medium text-on-surface'}`}>
                      {n.message ?? n.title ?? 'Notificación'}
                    </p>
                    {n.body && (
                      <p className="text-xs text-on-surface-variant mt-0.5">{n.body}</p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {n.type && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-surface-container text-on-surface-variant mb-1 capitalize">
                      {n.type}
                    </span>
                  )}
                  <p className="text-xs text-outline">
                    {n.createdAt ? timeAgo(n.createdAt) : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
