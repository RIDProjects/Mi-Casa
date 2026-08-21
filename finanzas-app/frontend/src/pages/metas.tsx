import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { savingsGoalsAPI } from '../services/api';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import {
  Plus, AlertTriangle, RefreshCw, PiggyBank,
  TrendingUp, CheckCircle, Calendar, DollarSign, ChevronRight,
} from 'lucide-react';
import { fmt } from '../lib/format';

const EMOJI_OPTIONS = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰', '🏋️', '🎸'];

const defaultForm = {
  nombre: '',
  emoji: '',
  montoMeta: '',
  ahorrosActuales: '',
  mesesParaAhorrarla: '',
  tasaInteres: '',
};

const TABS = ['Activas', 'Completadas', 'Simulador'] as const;
type Tab = typeof TABS[number];

export default function MetasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [activeTab, setActiveTab] = useState<Tab>('Activas');

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

  const activeGoals = useMemo(
    () => goals.filter((g: any) => {
      const pct = g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0;
      return pct < 100;
    }),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g: any) => {
      const pct = g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0;
      return pct >= 100;
    }),
    [goals]
  );

  const progressChartData = useMemo(() => {
    return goals.slice(0, 5).map((g: any, i: number) => ({
      name: g.nombre,
      value: Math.min(g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0, 100),
      fill: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5],
    }));
  }, [goals]);

  const displayedGoals = activeTab === 'Activas' ? activeGoals : activeTab === 'Completadas' ? completedGoals : [];

  // Avg days to complete (rough estimate using mesesParaAhorrarla * 30)
  const avgDias = useMemo(() => {
    if (!goals.length) return 0;
    const total = goals.reduce((s: number, g: any) => s + Number(g.mesesParaAhorrarla || 0) * 30, 0);
    return Math.round(total / goals.length);
  }, [goals]);

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface">Metas de Ahorro</h1>
          <p className="font-body-default text-body-default text-on-surface-variant mt-1">
            Tus objetivos financieros a plazo
          </p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-section-title text-section-title transition-opacity hover:opacity-90"
        >
          <Plus size={18} /> Añadir Meta
        </button>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 font-section-title text-section-title transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger" />
          <p className="font-body-default text-body-default text-on-surface-variant">Error al cargar las metas</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant font-body-default text-body-default hover:bg-surface-variant transition-colors">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* ── Simulator tab ── */}
      {activeTab === 'Simulador' && (
        <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden p-6">
          <h2 className="font-section-title text-section-title text-on-surface mb-4">Simulador de Ahorro</h2>
          {progressChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="100%" data={progressChartData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f0f3ff' }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <p className="font-body-default text-body-default text-on-surface-variant text-center py-12">
              No hay metas para simular.
            </p>
          )}
        </div>
      )}

      {/* ── Main content (Activas / Completadas) ── */}
      {(activeTab === 'Activas' || activeTab === 'Completadas') && !isError && (
        <>
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-section-title text-section-title text-on-surface">Tu Progreso Financiero</h2>
            {goals.length > 0 && (
              <span className="font-caption text-caption text-on-surface-variant">
                {completedGoals.length} completada{completedGoals.length !== 1 ? 's' : ''} de {goals.length}
              </span>
            )}
          </div>

          {/* ── Loading skeleton ── */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {!isLoading && displayedGoals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant mb-4">
                <PiggyBank size={32} />
              </div>
              <h3 className="font-section-title text-section-title text-on-surface mb-1">
                {activeTab === 'Activas' ? 'No hay metas activas' : 'No hay metas completadas'}
              </h3>
              <p className="font-body-default text-body-default text-on-surface-variant mb-6">
                {activeTab === 'Activas' ? 'Creá tu primera meta para empezar a planificar' : 'Completá una meta para verla acá'}
              </p>
              {activeTab === 'Activas' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-section-title text-section-title hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} /> Agregar meta
                </button>
              )}
            </div>
          )}

          {/* ── Goals list ── */}
          {!isLoading && displayedGoals.length > 0 && (
            <div className="space-y-4 mb-6">
              {displayedGoals.map((g: any, idx: number) => {
                const pct = Math.min(
                  g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0,
                  100
                );
                const faltante = Math.max(Number(g.montoMeta) - Number(g.ahorrosActuales), 0);
                const monthly = Number(g.monthlyContribution || 0);
                const meses = Number(g.mesesParaAhorrarla || 0);
                const tasa = Number(g.tasaInteres || 0);
                const isMain = idx === 0 && activeTab === 'Activas';
                const completionDate = meses > 0
                  ? (() => { const d = new Date(); d.setMonth(d.getMonth() + meses); return d; })()
                  : null;

                if (isMain) {
                  // ── Large featured card ──
                  return (
                    <div
                      key={g.id}
                      className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden flex flex-col md:flex-row"
                    >
                      {/* Photo / icon placeholder */}
                      <div className="w-full md:w-1/3 relative h-48 md:h-auto overflow-hidden bg-gradient-to-br from-primary-container to-surface-container-low rounded-t-xl md:rounded-l-xl md:rounded-tr-none flex items-center justify-center text-on-primary">
                        <PiggyBank size={64} className="opacity-30" />
                        <div className="absolute top-4 left-4">
                          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Prioridad Alta
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 text-4xl">{g.emoji || '🎯'}</div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-section-title text-section-title text-on-surface">{g.nombre}</h3>
                            {completionDate && (
                              <p className="font-caption text-caption text-outline mt-0.5 flex items-center gap-1">
                                <Calendar size={11} /> Estimado: {completionDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <ActionButtons onEdit={() => handleEdit(g)} onDelete={() => setDeleteId(g.id)} />
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-caption text-caption text-on-surface-variant">${fmt(Number(g.ahorrosActuales))} ahorrados</span>
                            <span className="font-card-title text-card-title text-primary">{pct.toFixed(0)}%</span>
                            <span className="font-caption text-caption text-on-surface-variant">Meta: ${fmt(Number(g.montoMeta))}</span>
                          </div>
                          <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                            <div
                              role="progressbar"
                              aria-valuenow={Math.round(pct)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`Progreso de meta de ahorro: ${Math.round(pct)}%`}
                              className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {monthly > 0 && (
                            <div className="bg-surface-container-low rounded-lg p-3">
                              <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">CUOTA MENSUAL</p>
                              <p className="font-card-title text-card-title text-primary">${fmt(monthly)}/mes</p>
                            </div>
                          )}
                          {faltante > 0 && (
                            <div className="bg-surface-container-low rounded-lg p-3">
                              <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">FALTANTE</p>
                              <p className="font-card-title text-card-title text-warning">${fmt(faltante)}</p>
                            </div>
                          )}
                          {meses > 0 && (
                            <div className="bg-surface-container-low rounded-lg p-3">
                              <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">PLAZO</p>
                              <p className="font-card-title text-card-title text-on-surface">{meses} meses</p>
                            </div>
                          )}
                        </div>

                        {/* PMT formula box */}
                        {monthly > 0 && (
                          <div className="bg-advisory-bg rounded-lg p-4 flex items-center justify-between border-l-4 border-primary">
                            <div className="flex items-center gap-3">
                              <DollarSign size={18} className="text-advisory-text-dim flex-shrink-0" />
                              <div>
                                <p className="text-[10px] font-formula-code text-advisory-text-dim/70 uppercase">Cuota Mensual Estimada (PMT)</p>
                                <p className="font-formula-code text-[18px] text-advisory-text font-bold">
                                  ${fmt(monthly)} <span className="text-[12px] font-normal text-advisory-text-dim/70">/ mes</span>
                                </p>
                              </div>
                            </div>
                            {tasa > 0 && (
                              <span className="font-caption text-caption text-advisory-text-dim/70">{tasa}% anual</span>
                            )}
                          </div>
                        )}

                        {pct >= 100 && (
                          <div className="flex items-center gap-2 text-success font-card-title text-card-title">
                            <CheckCircle size={16} /> Meta alcanzada
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // ── Secondary goal cards ──
                return (
                  <div
                    key={g.id}
                    className="bg-surface-container-lowest border border-border-light rounded-xl p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-xl">
                          {g.emoji || '🎯'}
                        </div>
                        <div>
                          <h3 className="font-card-title text-card-title text-on-surface">{g.nombre}</h3>
                          {completionDate && (
                            <p className="font-caption text-caption text-outline flex items-center gap-1 mt-0.5">
                              <Calendar size={10} /> {completionDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-card-title text-card-title text-primary">{pct.toFixed(0)}%</span>
                        <ActionButtons onEdit={() => handleEdit(g)} onDelete={() => setDeleteId(g.id)} />
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="font-caption text-caption text-on-surface-variant">${fmt(Number(g.ahorrosActuales))}</span>
                        <span className="font-caption text-caption text-on-surface-variant">${fmt(Number(g.montoMeta))}</span>
                      </div>
                      <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progreso: ${Math.round(pct)}%`}
                          className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between text-sm">
                      {monthly > 0 && (
                        <span className="font-caption text-caption text-on-surface-variant">
                          Cuota: <span className="text-primary font-medium">${fmt(monthly)}/mes</span>
                        </span>
                      )}
                      {faltante > 0 && (
                        <span className="font-caption text-caption text-on-surface-variant">
                          Faltante: <span className="text-warning font-medium">${fmt(faltante)}</span>
                        </span>
                      )}
                      {pct >= 100 && (
                        <span className="flex items-center gap-1 text-success font-caption text-caption">
                          <CheckCircle size={12} /> Completada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 3-col stat summary ── */}
          {!isLoading && goals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-container-low border border-border-light rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">CAPACIDAD DE AHORRO</p>
                  <p className="text-[20px] font-bold text-on-surface">${fmt(totalMensual)}<span className="text-[12px] font-normal text-on-surface-variant">/mes</span></p>
                </div>
              </div>

              <div className="bg-surface-container-low border border-border-light rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success flex-shrink-0">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">METAS ALCANZADAS</p>
                  <p className="text-[20px] font-bold text-on-surface">{completedGoals.length} <span className="text-[12px] font-normal text-on-surface-variant">de {goals.length}</span></p>
                </div>
              </div>

              <div className="bg-surface-container-low border border-border-light rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning flex-shrink-0">
                  <Calendar size={22} />
                </div>
                <div>
                  <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">DÍAS PROMEDIO</p>
                  <p className="text-[20px] font-bold text-on-surface">{avgDias} <span className="text-[12px] font-normal text-on-surface-variant">días</span></p>
                </div>
              </div>
            </div>
          )}

          {/* ── Últimos aportes table ── */}
          {!isLoading && goals.length > 0 && (
            <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-gray">
                <h3 className="font-section-title text-section-title text-on-surface">Últimos Aportes</h3>
                <ChevronRight size={16} className="text-on-surface-variant" />
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">META</th>
                    <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">AHORRADO</th>
                    <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">META TOTAL</th>
                    <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">PROGRESO</th>
                    <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">CUOTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {goals.map((g: any) => {
                    const pct = Math.min(
                      g.montoMeta > 0 ? (Number(g.ahorrosActuales) / Number(g.montoMeta)) * 100 : 0,
                      100
                    );
                    const monthly = Number(g.monthlyContribution || 0);
                    return (
                      <tr key={g.id} className="hover:bg-surface-gray transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center text-base">
                              {g.emoji || '🎯'}
                            </div>
                            <p className="font-card-title text-card-title text-on-surface">{g.nombre}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-body-default text-body-default text-primary">
                          ${fmt(Number(g.ahorrosActuales))}
                        </td>
                        <td className="px-6 py-4 font-body-default text-body-default text-on-surface">
                          ${fmt(Number(g.montoMeta))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-surface-variant h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-caption text-caption text-on-surface-variant">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-body-default text-body-default text-on-surface-variant">
                          {monthly > 0 ? `$${fmt(monthly)}/mes` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Modal ── */}
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
                      ? 'border-primary bg-surface-container-low'
                      : 'border-transparent hover:border-outline-variant'
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
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditItem(null); }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMut.isLoading || updateMut.isLoading}
              className="btn-primary"
            >
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
