import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { savingsGoalsAPI } from '../services/api';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, Target, AlertTriangle, RefreshCw } from 'lucide-react';

const EMOJI_OPTIONS = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰', '🏋️', '🎸'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const defaultForm = {
  nombre: '',
  emoji: '',
  montoMeta: '',
  ahorrosActuales: '',
  mesesParaAhorrarla: '',
  tasaInteres: '',
};

export default function MetasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: goals = [], isLoading, isError, refetch } = useQuery(
    'savings-goals',
    () => savingsGoalsAPI.getAll().then(r => r.data),
    { staleTime: 0 }
  );

  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const refreshCache = () => {
    savingsGoalsAPI.getAll().then(r => qc.setQueryData('savings-goals', r.data));
  };

  const createMut = useMutation((d: any) => savingsGoalsAPI.create(d), {
    onSuccess: () => { toast.success('Meta creada'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => savingsGoalsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Meta actualizada'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => savingsGoalsAPI.delete(id), {
    onSuccess: () => { toast.success('Meta eliminada'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const handleEdit = (g: any) => {
    setForm({
      nombre: g.nombre,
      emoji: g.emoji || '',
      montoMeta: g.montoMeta,
      ahorrosActuales: g.ahorrosActuales,
      mesesParaAhorrarla: g.mesesParaAhorrarla,
      tasaInteres: g.tasaInteres || '',
    });
    setEditItem(g);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  const totalMensual = goals.reduce((s: number, g: any) => s + Number(g.monthlyContribution || 0), 0);

  const progressChartData = useMemo(() => {
    return goals.slice(0, 5).map((g: any, i: number) => ({
      name: g.nombre,
      value: Math.min(g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0, 100),
      fill: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5],
    }));
  }, [goals]);

  return (
    <Layout>
      <PageHeader
        title={<><Target size={24} /> Metas de Ahorro</>}
        subtitle="Tus objetivos financieros a plazo"
        action={
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Nueva Meta
          </button>
        }
      />

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">Error al cargar las metas</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Progress radial chart */}
      {!isLoading && !isError && progressChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Progreso de metas</h2>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" data={progressChartData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f3f4f6' }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary footer stat */}
      {!isLoading && !isError && goals.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total mensual comprometido</span>
          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">${fmt(totalMensual)}/mes</span>
        </div>
      )}

      {/* Goals grid */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && !isError && goals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No hay metas de ahorro</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Creá tu primera meta para empezar a planificar</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            Agregar meta
          </button>
        </div>
      ) : !isLoading && !isError ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g: any) => {
            const pct = Math.min(
              g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0,
              100
            );
            const faltante = Math.max(Number(g.montoMeta) - Number(g.ahorrosActuales), 0);
            const monthly = Number(g.monthlyContribution || 0);
            const meses = Number(g.mesesParaAhorrarla || 0);
            const tasa = Number(g.tasaInteres || 0);
            const targetAmount = Number(g.montoMeta);
            const targetMonths = meses || 12;
            const monthlyRate = targetAmount / targetMonths;
            const monthsLeft = monthlyRate > 0 && faltante > 0 ? Math.ceil(faltante / monthlyRate) : null;
            const completionDate = monthsLeft != null
              ? new Date(Date.now() + monthsLeft * 30 * 24 * 60 * 60 * 1000)
              : null;

            return (
              <div
                key={g.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col gap-3"
              >
                {/* Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.emoji || '🎯'}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{g.nombre}</h3>
                  </div>
                  <ActionButtons
                    onEdit={() => handleEdit(g)}
                    onDelete={() => setDeleteId(g.id)}
                  />
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>${fmt(Number(g.ahorrosActuales))}</span>
                    <span>{pct.toFixed(0)}%</span>
                    <span>${fmt(Number(g.montoMeta))}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5" role="presentation">
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso de meta de ahorro: ${Math.round(pct)}%`}
                      className={`h-2.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {pct >= 100 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Meta alcanzada!</p>
                  ) : completionDate ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Estimado: {completionDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                    </p>
                  ) : null}
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-sm">
                  {monthly > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Cuota mensual necesaria</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">${fmt(monthly)}/mes</span>
                    </div>
                  )}
                  {meses > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Plazo</span>
                      <span className="font-medium">{meses} meses</span>
                    </div>
                  )}
                  {faltante > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Faltante</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">${fmt(faltante)}</span>
                    </div>
                  )}
                  {tasa > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Tasa anual</span>
                      <span className="font-medium">{tasa}%</span>
                    </div>
                  )}
                  {monthly > 0 && faltante > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Fin estimado</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {(() => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + meses);
                          return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                        })()}
                      </span>
                    </div>
                  )}
                  {pct >= 100 && (
                    <div className="mt-2 text-center text-sm font-semibold text-green-600 dark:text-green-400">
                      ✅ ¡Meta alcanzada!
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar meta' : 'Nueva meta de ahorro'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="meta-nombre">Nombre</label>
            <input
              id="meta-nombre"
              className="input"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Viaje a Europa"
              required
            />
          </div>

          <div>
            <label className="label">Emoji</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`text-xl p-1.5 rounded-lg border-2 transition-all ${
                    form.emoji === e
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="meta-monto">Monto meta</label>
            <input
              id="meta-monto"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.montoMeta}
              onChange={e => setForm({ ...form, montoMeta: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="meta-ahorro-actual">Ahorros actuales</label>
            <input
              id="meta-ahorro-actual"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.ahorrosActuales}
              onChange={e => setForm({ ...form, ahorrosActuales: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="meta-meses">Meses para ahorrarla</label>
            <input
              id="meta-meses"
              type="number"
              min="1"
              className="input"
              value={form.mesesParaAhorrarla}
              onChange={e => setForm({ ...form, mesesParaAhorrarla: e.target.value })}
              placeholder="12"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="meta-tasa">Tasa de interés anual % (opcional)</label>
            <input
              id="meta-tasa"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.tasaInteres}
              onChange={e => setForm({ ...form, tasaInteres: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear meta'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId!)}
        loading={deleteMut.isLoading}
      />
    </Layout>
  );
}
