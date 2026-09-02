import { useState, useMemo, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useQueries, useMutation, useQueryClient } from 'react-query';
import { transactionsAPI, recurringTransactionsAPI, exportTransactionsCSV, importTransactionsCSV } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import {
  Plus, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw,
  Download, Upload, TrendingUp, DollarSign,
  ShoppingCart, Home, Car, Coffee, Search, Filter, ArrowUpRight, ArrowDownRight,
  Laptop, Calendar, Repeat, Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MONTH_NAMES } from '../lib/format';
import { useCurrencyFormatter } from '../lib/currency';
import { getErrorMessage } from '../utils/errors';

const CATEGORIES = [
  'Casa', 'Comida', 'Familia', 'Transporte', 'Viajes',
  'Deudas', 'Salud', 'Suscripciones', 'Cuidado Personal', 'Otros',
];

const TIPO_OPTIONS = [
  { v: 'ingreso_fijo', l: 'Ingreso fijo' },
  { v: 'ingreso_variable', l: 'Ingreso variable' },
  { v: 'gasto', l: 'Gasto' },
];

const METODO_OPTIONS = [
  { v: 'efectivo', l: 'Efectivo' },
  { v: 'transferencia', l: 'Transferencia' },
  { v: 'tarjeta', l: 'Tarjeta' },
];

const defaultForm = {
  tipo: 'gasto',
  concepto: '',
  categoria: '',
  monto: '',
  metodoPago: 'efectivo',
  nombreTarjeta: '',
  fecha: new Date().toISOString().split('T')[0],
};

const TABS = ['Historial', 'Programadas', 'Pendientes'] as const;
type Tab = typeof TABS[number];
// Pendientes no tiene modulo de backend todavia. Programadas ya se cablea a
// /recurring-transactions (el modulo existia hecho hace tiempo pero nunca
// se habia conectado a ninguna pantalla).
const TABS_WIP: Tab[] = ['Pendientes'];

const defaultRecurringForm = {
  name: '',
  amount: '',
  category: '',
  dayOfMonth: '1',
  isActive: true,
};

/** Map category name to a lucide icon */
function CategoryIcon({ categoria }: { categoria: string }) {
  const map: Record<string, React.ReactNode> = {
    Casa: <Home size={14} />,
    Comida: <Coffee size={14} />,
    Transporte: <Car size={14} />,
    Suscripciones: <Laptop size={14} />,
    Familia: <ShoppingCart size={14} />,
  };
  return <>{map[categoria] ?? <DollarSign size={14} />}</>;
}

/** Badge for tipo */
function TypeBadge({ tipo }: { tipo: string }) {
  if (tipo === 'gasto') {
    return (
      <span className="px-2 py-1 bg-danger/10 text-danger text-[10px] font-bold rounded-full uppercase">Gasto</span>
    );
  }
  if (tipo === 'ingreso_fijo') {
    return (
      <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">Ing. Fijo</span>
    );
  }
  return (
    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">Ing. Variable</span>
  );
}

/** Método badge */
function MetodoBadge({ metodo }: { metodo: string }) {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
  };
  return (
    <span className="px-2 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold rounded-full uppercase">
      {map[metodo] ?? metodo}
    </span>
  );
}

export default function TransaccionesPage() {
  const qc = useQueryClient();
  const { fmt: cfmt } = useCurrencyFormatter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const [activeTab, setActiveTab] = useState<Tab>('Historial');
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editRecurringItem, setEditRecurringItem] = useState<any>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null);
  const [recurringForm, setRecurringForm] = useState<any>(defaultRecurringForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qKey = ['transactions', year, month];
  const summaryKey = ['transactions-summary', year, month];

  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i));
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }, [year, month]);

  const monthlyResults = useQueries(
    last6Months.map(m => ({
      queryKey: ['tx-monthly', m.year, m.month],
      queryFn: () => transactionsAPI.getSummary(m.year, m.month).then((r: any) => r.data),
      staleTime: 5 * 60 * 1000,
    }))
  );

  const chartData = useMemo(() => {
    return last6Months.map((m, i) => ({
      name: MONTH_NAMES[m.month - 1].slice(0, 3),
      Gastos: (monthlyResults[i].data as any)?.totalExpenses ?? 0,
      Ingresos: (monthlyResults[i].data as any)?.totalIncome ?? 0,
    }));
  }, [last6Months, monthlyResults]);

  const { data: transactions = [], isLoading, isError, refetch } = useQuery(
    qKey,
    () => transactionsAPI.getByMonth(year, month).then(r => r.data),
    { staleTime: 0 }
  );


  const refreshCache = () => {
    transactionsAPI.getByMonth(year, month).then(r => qc.setQueryData(qKey, r.data));
    transactionsAPI.getSummary(year, month).then(r => qc.setQueryData(summaryKey, r.data));
  };

  const createMut = useMutation((d: any) => transactionsAPI.create(d), {
    onSuccess: () => { toast.success('Transacción registrada'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => transactionsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Transacción actualizada'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => transactionsAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  // ── Programadas (transacciones recurrentes) ──
  const recurringKey = ['recurring-transactions'];
  const { data: recurringTransactions = [], isLoading: recurringLoading } = useQuery(
    recurringKey,
    () => recurringTransactionsAPI.getAll().then(r => r.data),
    { enabled: activeTab === 'Programadas' },
  );

  const createRecurringMut = useMutation((d: any) => recurringTransactionsAPI.create(d), {
    onSuccess: () => {
      toast.success('Recurrente creada');
      setShowRecurringModal(false);
      setRecurringForm(defaultRecurringForm);
      qc.invalidateQueries(recurringKey);
    },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateRecurringMut = useMutation((d: any) => recurringTransactionsAPI.update(editRecurringItem?.id, d), {
    onSuccess: () => {
      toast.success('Recurrente actualizada');
      setEditRecurringItem(null);
      setShowRecurringModal(false);
      qc.invalidateQueries(recurringKey);
    },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteRecurringMut = useMutation((id: string) => recurringTransactionsAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteRecurringId(null); qc.invalidateQueries(recurringKey); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const generateMut = useMutation(() => recurringTransactionsAPI.generate(year, month), {
    onSuccess: (r: any) => {
      const n = r.data?.generated ?? 0;
      toast.success(n > 0 ? `${n} transacción(es) generada(s) para ${MONTH_NAMES[month - 1]}` : 'No había nada nuevo para generar este mes');
      refreshCache();
    },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const handleEditRecurring = (rt: any) => {
    setRecurringForm({
      name: rt.name,
      amount: rt.amount,
      category: rt.category || '',
      dayOfMonth: String(rt.dayOfMonth ?? 1),
      isActive: rt.isActive,
    });
    setEditRecurringItem(rt);
    setShowRecurringModal(true);
  };

  const handleRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editRecurringItem ? updateRecurringMut.mutate(recurringForm) : createRecurringMut.mutate(recurringForm);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importTransactionsCSV(file, year, month);
      toast.success(`Importadas ${result.data.imported} transacciones`);
      qc.invalidateQueries('transactions');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al importar CSV');
    } finally {
      e.target.value = '';
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setCurrentPage(1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setCurrentPage(1);
  };

  const handleEdit = (t: any) => {
    setForm({
      tipo: t.tipo,
      concepto: t.concepto,
      categoria: t.categoria || '',
      monto: t.monto,
      metodoPago: t.metodoPago,
      nombreTarjeta: t.nombreTarjeta || '',
      fecha: t.fecha?.split('T')[0] ?? defaultForm.fecha,
    });
    setEditItem(t);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  // KPIs
  const ingresos = useMemo(
    () => transactions.filter((t: any) => t.tipo !== 'gasto').reduce((s: number, t: any) => s + Number(t.monto), 0),
    [transactions]
  );
  const gastos = useMemo(
    () => transactions.filter((t: any) => t.tipo === 'gasto').reduce((s: number, t: any) => s + Number(t.monto), 0),
    [transactions]
  );
  const disponible = ingresos - gastos;
  const usoPct = ingresos > 0 ? Math.min((gastos / ingresos) * 100, 100) : 0;

  // Thermometer label
  const thermoLabel = usoPct < 70
    ? { text: 'Todo bajo control', color: 'text-success', bar: 'bg-success', status: 'EN_META' }
    : usoPct < 90
    ? { text: 'Acercándose al límite', color: 'text-warning', bar: 'bg-warning', status: 'ATENCIÓN' }
    : { text: '¡Gastos superaron el presupuesto!', color: 'text-danger', bar: 'bg-danger', status: 'ALERTA' };

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t: any) => t.tipo === 'gasto').forEach((t: any) => {
      const cat = t.categoria || 'Sin categoría';
      map[cat] = (map[cat] || 0) + Number(t.monto);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: any) => {
      const matchSearch = !searchTerm || t.concepto?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTipo = !filterTipo || t.tipo === filterTipo;
      const matchCat = !filterCategoria || t.categoria === filterCategoria;
      return matchSearch && matchTipo && matchCat;
    });
  }, [transactions, searchTerm, filterTipo, filterCategoria]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  const resetPage = () => setCurrentPage(1);

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger" />
          <p className="font-body-default text-body-default text-on-surface-variant">Error al cargar las transacciones</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-variant transition-colors">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface">Transacciones</h1>
          <p className="font-body-default text-body-default text-on-surface-variant mt-1">
            Registro mensual de ingresos y gastos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-container-lowest border border-border-light text-on-surface-variant hover:bg-surface-gray rounded-xl transition-colors"
          >
            <Upload size={15} /> Importar
          </button>
          <button
            onClick={() => exportTransactionsCSV(year, month)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-container-lowest border border-border-light text-on-surface-variant hover:bg-surface-gray rounded-xl transition-colors"
          >
            <Download size={15} /> Exportar
          </button>
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-section-title text-section-title transition-opacity hover:opacity-90"
          >
            <Plus size={18} /> Nueva transacción
          </button>
        </div>
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

      {/* ── WIP tab placeholder ── */}
      {TABS_WIP.includes(activeTab) && (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
          <span className="text-4xl">🚧</span>
          <p className="font-section-title text-section-title">Próximamente</p>
          <p className="font-body-default text-body-default opacity-60">
            La sección <strong>{activeTab}</strong> estará disponible en una próxima versión.
          </p>
        </div>
      )}

      {/* ── Programadas content ── */}
      {activeTab === 'Programadas' && (
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <p className="font-body-default text-body-default text-on-surface-variant">
              Plantillas que generan una transacción real al mes cuando las corrés desde acá — no se crean solas.
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => generateMut.mutate()}
                disabled={generateMut.isLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-container-lowest border border-border-light text-on-surface-variant hover:bg-surface-gray rounded-xl transition-colors disabled:opacity-50"
              >
                <Zap size={15} /> {generateMut.isLoading ? 'Generando...' : `Generar para ${MONTH_NAMES[month - 1]}`}
              </button>
              <button
                onClick={() => { setRecurringForm(defaultRecurringForm); setEditRecurringItem(null); setShowRecurringModal(true); }}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-section-title text-section-title transition-opacity hover:opacity-90"
              >
                <Plus size={18} /> Nueva recurrente
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">NOMBRE</th>
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">CATEGORÍA</th>
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-center">DÍA</th>
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-center">ESTADO</th>
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-right">MONTO</th>
                  <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-center">ACC.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {recurringLoading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-surface-container-low rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : recurringTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="font-body-default text-body-default text-on-surface-variant">
                        No tenés transacciones programadas todavía.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recurringTransactions.map((rt: any) => (
                    <tr key={rt.id} className="hover:bg-surface-gray transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center text-on-surface-variant flex-shrink-0">
                            <Repeat size={14} />
                          </div>
                          <p className="font-card-title text-card-title text-on-surface">{rt.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {rt.category ? (
                          <span className="font-body-small text-body-small text-on-surface-variant">{rt.category}</span>
                        ) : (
                          <span className="font-caption text-caption text-outline">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-body-small text-body-small text-on-surface-variant">
                        {rt.dayOfMonth}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                          rt.isActive ? 'bg-success/10 text-success' : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {rt.isActive ? 'Activa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-card-title text-card-title text-warning">
                        {cfmt(rt.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ActionButtons
                          onEdit={() => handleEditRecurring(rt)}
                          onDelete={() => setDeleteRecurringId(rt.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Historial content ── */}
      {activeTab === 'Historial' && <>

      {/* ── Month navigator ── */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-surface-variant transition-colors text-on-surface-variant"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 text-on-surface">
          <Calendar size={16} className="text-primary" />
          <span className="font-section-title text-section-title min-w-[180px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-surface-variant transition-colors text-on-surface-variant"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Summary cards grid: 2-col "Desempeño" + 1-col "Balance Operativo" ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Desempeño del Mes — 2-col span */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-border-light rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-section-title text-section-title text-on-surface">Desempeño del Mes</h3>
            <span className="font-caption text-caption text-on-surface-variant">{MONTH_NAMES[month - 1]} {year}</span>
          </div>

          {/* KPI stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">INGRESOS REALES</p>
              <p className="text-[20px] font-bold text-success">{cfmt(ingresos)}</p>
            </div>
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">GASTOS REALES</p>
              <p className="text-[20px] font-bold text-danger">{cfmt(gastos)}</p>
            </div>
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant uppercase mb-1">% USO</p>
              <p className={`text-[20px] font-bold ${thermoLabel.color}`}>{usoPct.toFixed(1)}%</p>
            </div>
          </div>

          {/* Plan vs Real progress bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1.5">
                  <ArrowUpRight size={12} className="text-success" /> Ingresos
                </span>
                <span className="font-caption text-caption text-on-surface">{cfmt(ingresos)}</span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                <div className="bg-success h-full rounded-full transition-all duration-1000" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1.5">
                  <ArrowDownRight size={12} className="text-danger" /> Gastos
                </span>
                <span className="font-caption text-caption text-on-surface">{cfmt(gastos)}</span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                <div
                  className={`${thermoLabel.bar} h-full rounded-full transition-all duration-1000`}
                  style={{ width: `${usoPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status text */}
          <p className={`font-caption text-caption mt-3 ${thermoLabel.color}`}>{thermoLabel.text}</p>
        </div>

        {/* Balance Operativo — dark panel */}
        <div className="bg-advisory-bg rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-section-title text-section-title text-advisory-text mb-1">Balance Operativo</h3>
            <p className="font-caption text-caption opacity-70 text-advisory-text-dim">Diferencia proyectada vs real</p>
          </div>
          <div className="py-4">
            <span className={`font-hero-title text-[38px] leading-tight ${disponible >= 0 ? 'text-advisory-text' : 'text-danger'}`}>
              {disponible >= 0 ? '+' : '-'}{cfmt(Math.abs(disponible))}
            </span>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="font-formula-code text-formula-code text-advisory-text-dim">
              STATUS: {thermoLabel.status}
            </p>
          </div>
        </div>
      </div>

      {/* ── 6-month bar chart ── */}
      <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-gray">
          <h3 className="font-section-title text-section-title text-on-surface">Gastos e Ingresos — Últimos 6 meses</h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant, #e5e7eb)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip formatter={(value: number) => cfmt(value)} />
              <Bar dataKey="Ingresos" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gastos" fill="#d97706" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Filter toolbar ── */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-surface-container-low p-4 rounded-xl border border-outline-variant mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Buscar concepto..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-border-light rounded-xl font-body-small text-body-small text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <Filter size={15} className="text-on-surface-variant flex-shrink-0" />
        </div>
        <div className="flex gap-2">
          <select
            value={filterTipo}
            onChange={e => { setFilterTipo(e.target.value); resetPage(); }}
            className="py-2 px-3 bg-surface-container-lowest border border-border-light rounded-xl font-body-small text-body-small text-on-surface focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Todos los tipos</option>
            {TIPO_OPTIONS.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={filterCategoria}
            onChange={e => { setFilterCategoria(e.target.value); resetPage(); }}
            className="py-2 px-3 bg-surface-container-lowest border border-border-light rounded-xl font-body-small text-body-small text-on-surface focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Transactions table ── */}
      <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-gray">
          <h3 className="font-section-title text-section-title text-on-surface">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <span className="font-caption text-caption text-on-surface-variant">
            {filteredTransactions.length} transacciones
          </span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">FECHA</th>
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">CONCEPTO</th>
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">CATEGORÍA</th>
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant">CUENTA</th>
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-right">MONTO</th>
              <th className="px-6 py-3 font-label-upper text-label-upper text-on-surface-variant text-center">ACC.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-surface-container-low rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="font-body-default text-body-default text-on-surface-variant">
                    No hay transacciones en {MONTH_NAMES[month - 1]} {year}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((t: any) => {
                const isIncome = t.tipo !== 'gasto';
                return (
                  <tr key={t.id} className="hover:bg-surface-gray transition-colors group">
                    <td className="px-6 py-4 font-body-default text-body-default text-on-surface whitespace-nowrap">
                      {t.fecha
                        ? new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-variant flex items-center justify-center text-on-surface-variant flex-shrink-0">
                          {isIncome ? <TrendingUp size={14} /> : <CategoryIcon categoria={t.categoria} />}
                        </div>
                        <div>
                          <p className="font-card-title text-card-title text-on-surface">{t.concepto}</p>
                          <p className="font-caption text-caption text-outline">
                            <TypeBadge tipo={t.tipo} />
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.categoria ? (
                        <span className="font-body-small text-body-small text-on-surface-variant">{t.categoria}</span>
                      ) : (
                        <span className="font-caption text-caption text-outline">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <MetodoBadge metodo={t.metodoPago} />
                      {t.nombreTarjeta && (
                        <span className="ml-1 font-caption text-caption text-outline">({t.nombreTarjeta})</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right font-card-title text-card-title ${isIncome ? 'text-primary' : 'text-warning'}`}>
                      {isIncome ? '+' : '-'}{cfmt(t.monto)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ActionButtons
                        onEdit={() => handleEdit(t)}
                        onDelete={() => setDeleteId(t.id)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-6">
          <span className="font-caption text-caption text-on-surface-variant">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="font-caption text-caption text-on-surface-variant px-1">…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl font-body-small text-body-small transition-colors ${
                      p === currentPage
                        ? 'bg-primary-container text-on-primary-container'
                        : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))
            }
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Category breakdown ── */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-surface-container-lowest border border-border-light rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-gray">
            <h3 className="font-section-title text-section-title text-on-surface">Gastos por Categoría</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryBreakdown.map(([cat, total]) => (
              <div key={cat} className="bg-surface-container-low border border-border-light rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center text-danger mx-auto mb-2">
                  <CategoryIcon categoria={cat} />
                </div>
                <p className="font-caption text-caption text-on-surface-variant mb-1 truncate">{cat}</p>
                <p className="font-card-title text-card-title text-danger">{cfmt(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      </>} {/* end Historial content */}

      {/* ── Modal Create/Edit ── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar transacción' : 'Nueva transacción'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPO_OPTIONS.map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm({ ...form, tipo: v, categoria: '' })}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    form.tipo === v
                      ? 'border-primary bg-surface-container-low text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tx-concepto">Concepto</label>
            <input
              id="tx-concepto"
              className="input"
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
              placeholder="Descripción de la transacción"
              required
            />
          </div>

          {form.tipo === 'gasto' && (
            <div>
              <label className="label" htmlFor="tx-categoria">Categoría</label>
              <select
                id="tx-categoria"
                className="input"
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                required
              >
                <option value="">Seleccioná una categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label" htmlFor="tx-monto">Monto</label>
            <input
              id="tx-monto"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.monto}
              onChange={e => setForm({ ...form, monto: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METODO_OPTIONS.map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm({ ...form, metodoPago: v, nombreTarjeta: '' })}
                  className={`py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    form.metodoPago === v
                      ? 'border-primary bg-surface-container-low text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.metodoPago === 'tarjeta' && (
            <div>
              <label className="label" htmlFor="tx-tarjeta-nombre">Nombre de la tarjeta</label>
              <input
                id="tx-tarjeta-nombre"
                className="input"
                value={form.nombreTarjeta}
                onChange={e => setForm({ ...form, nombreTarjeta: e.target.value })}
                placeholder="Ej: Visa Santander"
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="tx-fecha">Fecha</label>
            <input
              id="tx-fecha"
              type="date"
              className="input"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              required
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
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Registrar'}
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

      {/* ── Modal Create/Edit Recurrente ── */}
      <Modal
        isOpen={showRecurringModal}
        onClose={() => { setShowRecurringModal(false); setEditRecurringItem(null); }}
        title={editRecurringItem ? 'Editar recurrente' : 'Nueva transacción programada'}
        size="md"
      >
        <form onSubmit={handleRecurringSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="rt-name">Nombre</label>
            <input
              id="rt-name"
              className="input"
              value={recurringForm.name}
              onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
              placeholder="Ej: Alquiler, Netflix, Gimnasio"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="rt-amount">Monto</label>
            <input
              id="rt-amount"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={recurringForm.amount}
              onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="rt-categoria">Categoría</label>
            <select
              id="rt-categoria"
              className="input"
              value={recurringForm.category}
              onChange={e => setRecurringForm({ ...recurringForm, category: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="rt-dia">Día del mes</label>
            <input
              id="rt-dia"
              type="number"
              min="1"
              max="31"
              className="input"
              value={recurringForm.dayOfMonth}
              onChange={e => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })}
              required
            />
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              En meses de menos días (ej. febrero) se genera el día 28.
            </p>
          </div>

          <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3">
            <label htmlFor="rt-activa" className="font-body-default text-body-default text-on-surface">
              Recurrente activa
            </label>
            <button
              type="button"
              id="rt-activa"
              role="switch"
              aria-checked={recurringForm.isActive}
              onClick={() => setRecurringForm({ ...recurringForm, isActive: !recurringForm.isActive })}
              className={`w-11 h-6 rounded-full transition-colors relative ${recurringForm.isActive ? 'bg-primary' : 'bg-outline-variant'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${recurringForm.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowRecurringModal(false); setEditRecurringItem(null); }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createRecurringMut.isLoading || updateRecurringMut.isLoading}
              className="btn-primary"
            >
              {createRecurringMut.isLoading || updateRecurringMut.isLoading ? 'Guardando...' : editRecurringItem ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteRecurringId}
        onClose={() => setDeleteRecurringId(null)}
        onConfirm={() => deleteRecurringMut.mutate(deleteRecurringId!)}
        loading={deleteRecurringMut.isLoading}
      />
    </Layout>
  );
}
