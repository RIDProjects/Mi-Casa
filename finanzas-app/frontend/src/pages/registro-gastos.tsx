import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { householdExpensesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, BookOpen, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { CardSkeleton } from '../components/ui/Skeleton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

import { fmt, MONTH_NAMES } from '../lib/format';

const CATEGORIES = [
  'Comida', 'Transporte', 'Hogar', 'Salud', 'Ocio', 'Salidas', 'Shopper', 'Otros',
] as const;

type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<Category, string> = {
  Comida:     'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Transporte: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Hogar:      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Salud:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Ocio:       'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Salidas:    'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  Shopper:    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  Otros:      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const defaultForm = {
  fecha:       new Date().toISOString().split('T')[0],
  descripcion: '',
  categoria:   'Otros' as Category,
  montoCUP:    '',
  lugar:       '',
};

export default function RegistroGastosPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const qKey = ['household-expenses', monthStr];

  const { data, isLoading, isError, refetch } = useQuery(
    qKey,
    () => householdExpensesAPI.getMonth(monthStr).then(r => r.data),
    { staleTime: 0 },
  );

  const comprasMercado: any[]   = data?.comprasMercado  ?? [];
  const salidas: any[]          = data?.salidas          ?? [];
  const resumen: any[]          = data?.resumenCategoria ?? [];
  const totalCompras: number    = data?.totalCompras     ?? 0;
  const totalSalidas: number    = data?.totalSalidas     ?? 0;
  const total: number           = data?.total            ?? 0;

  const createMut = useMutation((d: any) => householdExpensesAPI.create(d), {
    onSuccess: () => { toast.success('Gasto registrado'); setShowModal(false); setForm(defaultForm); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const updateMut = useMutation((d: any) => householdExpensesAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Gasto actualizado'); setShowModal(false); setEditItem(null); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const deleteMut = useMutation((id: string) => householdExpensesAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleEdit = (item: any) => {
    setForm({
      fecha:       item.fecha,
      descripcion: item.descripcion,
      categoria:   item.categoria,
      montoCUP:    item.montoCUP,
      lugar:       item.lugar || '',
    });
    setEditItem(item);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) { toast.error('Ingresá una descripción'); return; }
    if (!form.montoCUP || Number(form.montoCUP) <= 0) { toast.error('Ingresá un monto válido'); return; }
    const dto = { ...form, montoCUP: Number(form.montoCUP), mes: monthStr };
    editItem ? updateMut.mutate(dto) : createMut.mutate(dto);
  };

  if (isLoading) return (
    <Layout>
      <div className="space-y-3">
        {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle size={16} />
            Error al cargar el registro de gastos.
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 hover:underline">
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <PageHeader
        title={<><BookOpen size={24} /> Registro de Gastos</>}
        subtitle="Compras del mercado + salidas y otros gastos"
      />

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-variant transition-colors">
          <ChevronLeft size={20} className="text-on-surface-variant" />
        </button>
        <span className="text-lg font-semibold text-on-surface min-w-[180px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-variant transition-colors">
          <ChevronRight size={20} className="text-on-surface-variant" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: tables */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Compras de Mercado */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-2">
              <ShoppingCart size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Compras de Mercado
              </h2>
              <span className="ml-auto text-xs text-on-surface-variant">Auto desde Lista de la Compra</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low font-label-upper text-label-upper text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                    <th className="px-3 py-2 text-right">Total CUP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {comprasMercado.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-outline text-xs">Sin compras este mes — agregá productos en Lista de la Compra</td></tr>
                  ) : (
                    comprasMercado.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-gray">
                        <td className="px-3 py-2 text-on-surface-variant text-xs">{c.fecha}</td>
                        <td className="px-3 py-2 text-on-surface font-medium">{c.descripcion}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS['Comida']}`}>
                            {c.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">
                          {fmt(c.totalCUP)} CUP
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {comprasMercado.length > 0 && (
                  <tfoot className="bg-emerald-50 dark:bg-emerald-900/20">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">Subtotal Compras</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalCompras)} CUP</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Section 2: Salidas y Otros Gastos */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-orange-50 dark:bg-orange-900/20 flex items-center gap-2">
              <BookOpen size={16} className="text-orange-600 dark:text-orange-400" />
              <h2 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                Salidas y Otros Gastos
              </h2>
              <button
                onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} /> Nueva salida
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low font-label-upper text-label-upper text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                    <th className="px-3 py-2 text-left">Lugar</th>
                    <th className="px-3 py-2 text-right">Monto CUP</th>
                    <th className="px-3 py-2 text-center">Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {salidas.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-outline text-xs">Sin salidas registradas — usá el botón &quot;Nueva salida&quot;</td></tr>
                  ) : (
                    salidas.map((s: any) => (
                      <tr key={s.id} className="hover:bg-surface-gray">
                        <td className="px-3 py-2 text-on-surface-variant text-xs">{s.fecha}</td>
                        <td className="px-3 py-2 text-on-surface font-medium">{s.descripcion}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[s.categoria as Category] ?? CAT_COLORS['Otros']}`}>
                            {s.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-on-surface-variant text-xs">{s.lugar || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">{fmt(s.montoCUP)} CUP</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleEdit(s)} className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => deleteMut.mutate(s.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {salidas.length > 0 && (
                  <tfoot className="bg-orange-50 dark:bg-orange-900/20">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-xs font-bold text-orange-800 dark:text-orange-300">Subtotal Salidas</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-orange-700 dark:text-orange-300">{fmt(totalSalidas)} CUP</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
              <h2 className="text-sm font-semibold text-on-surface">📊 Resumen del Mes</h2>
            </div>
            <div className="p-4 space-y-2">
              {resumen.map((r: any) => (
                <div key={r.categoria} className="flex items-center justify-between py-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[r.categoria as Category] ?? CAT_COLORS['Otros']}`}>
                    {r.categoria}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{fmt(r.totalCUP)} CUP</span>
                </div>
              ))}
              {resumen.length === 0 && (
                <p className="text-xs text-outline text-center py-4">Sin datos este mes</p>
              )}
            </div>
            <div className="border-t border-outline-variant p-4 space-y-2">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal Compras</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(totalCompras)} CUP</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal Salidas</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{fmt(totalSalidas)} CUP</span>
              </div>
              <div className="flex justify-between text-base font-bold text-on-surface border-t border-outline-variant pt-2 mt-1">
                <span>TOTAL</span>
                <span>{fmt(total)} CUP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: nueva / editar salida */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-on-surface">
              {editItem ? 'Editar gasto' : 'Nueva salida / gasto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fecha"
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  required
                />
                <Select
                  label="Categoría"
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <Input
                label="Descripción"
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Cena en restaurante, Taxi, Farmacia..."
                autoFocus
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Monto CUP"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.montoCUP}
                  onChange={e => setForm({ ...form, montoCUP: e.target.value })}
                  required
                />
                <Input
                  label="Lugar (opcional)"
                  value={form.lugar}
                  onChange={e => setForm({ ...form, lugar: e.target.value })}
                  placeholder="Dónde fue..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
