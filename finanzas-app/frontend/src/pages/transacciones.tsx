import { useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { transactionsAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, ChevronLeft, ChevronRight, Receipt, AlertTriangle, RefreshCw } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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

function typeBadge(tipo: string) {
  const map: Record<string, string> = {
    ingreso_fijo: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    ingreso_variable: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    gasto: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  const label: Record<string, string> = {
    ingreso_fijo: 'Ing. Fijo',
    ingreso_variable: 'Ing. Variable',
    gasto: 'Gasto',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[tipo] ?? ''}`}>
      {label[tipo] ?? tipo}
    </span>
  );
}

export default function TransaccionesPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const qKey = ['transactions', year, month];
  const summaryKey = ['transactions-summary', year, month];

  const { data: transactions = [], isLoading, isError, refetch } = useQuery(
    qKey,
    () => transactionsAPI.getByMonth(year, month).then(r => r.data),
    { staleTime: 0 }
  );

  const { data: summary } = useQuery(
    summaryKey,
    () => transactionsAPI.getSummary(year, month).then(r => r.data),
    { staleTime: 0 }
  );

  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const refreshCache = () => {
    transactionsAPI.getByMonth(year, month).then(r => qc.setQueryData(qKey, r.data));
    transactionsAPI.getSummary(year, month).then(r => qc.setQueryData(summaryKey, r.data));
  };

  const createMut = useMutation((d: any) => transactionsAPI.create(d), {
    onSuccess: () => { toast.success('Transacción registrada'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation((d: any) => transactionsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Transacción actualizada'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation((id: string) => transactionsAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminada'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
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
    ? { text: 'Todo bajo control', color: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' }
    : usoPct < 90
    ? { text: 'Acercándose al límite', color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' }
    : { text: '¡Gastos superaron el presupuesto!', color: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' };

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t: any) => t.tipo === 'gasto').forEach((t: any) => {
      const cat = t.categoria || 'Sin categoría';
      map[cat] = (map[cat] || 0) + Number(t.monto);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-gray-500 dark:text-gray-400">Error al cargar las transacciones</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt size={24} /> Transacciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Registro mensual de ingresos y gastos</p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Nueva transacción
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[160px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Ingresos reales</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${fmt(ingresos)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Gastos reales</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${fmt(gastos)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Disponible</p>
          <p className={`text-2xl font-bold ${disponible >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            ${fmt(disponible)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">% Uso presupuesto</p>
          <p className={`text-2xl font-bold ${usoPct < 70 ? 'text-green-600 dark:text-green-400' : usoPct < 90 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {usoPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Spending thermometer */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Termómetro de gasto</span>
          <span className={`text-sm font-semibold ${thermoLabel.color}`}>{thermoLabel.text}</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${thermoLabel.bar}`}
            style={{ width: `${usoPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
          <span>$0</span>
          <span>${fmt(ingresos)}</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Método</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((t: any) => (
                <tr
                  key={t.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    t.tipo !== 'gasto' ? 'bg-green-50/40 dark:bg-green-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {t.fecha ? new Date(t.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3">{typeBadge(t.tipo)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.concepto}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.categoria || '-'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.tipo !== 'gasto' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.tipo !== 'gasto' ? '+' : '-'}${fmt(t.monto)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 capitalize">
                    {t.metodoPago}
                    {t.nombreTarjeta ? ` (${t.nombreTarjeta})` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionButtons
                      onEdit={() => handleEdit(t)}
                      onDelete={() => setDeleteId(t.id)}
                    />
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    No hay transacciones en {MONTH_NAMES[month - 1]} {year}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Gastos por categoría
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryBreakdown.map(([cat, total]) => (
              <div key={cat} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{cat}</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">${fmt(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Create/Edit */}
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
                  className={`py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all ${
                    form.tipo === v
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Concepto</label>
            <input
              className="input"
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
              placeholder="Descripción de la transacción"
              required
            />
          </div>

          {form.tipo === 'gasto' && (
            <div>
              <label className="label">Categoría</label>
              <select
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
            <label className="label">Monto</label>
            <input
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
                  className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                    form.metodoPago === v
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.metodoPago === 'tarjeta' && (
            <div>
              <label className="label">Nombre de la tarjeta</label>
              <input
                className="input"
                value={form.nombreTarjeta}
                onChange={e => setForm({ ...form, nombreTarjeta: e.target.value })}
                placeholder="Ej: Visa Santander"
              />
            </div>
          )}

          <div>
            <label className="label">Fecha</label>
            <input
              type="date"
              className="input"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
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
    </Layout>
  );
}
