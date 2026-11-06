import React, { useState } from 'react';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { householdExpensesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, BookOpen, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { CardSkeleton } from '../components/ui/Skeleton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useCurrencyStore } from '../store/currency.store';
import { useCurrencyFormatter } from '../lib/currency';
import { SortableTh } from '../components/ui/SortableTh';
import { useTableSort } from '../hooks/useTableSort';

import { fmt, MONTH_NAMES } from '../lib/format';
import { todayLocalISO } from '../lib/dates';

const CATEGORIES = [
  'Comida', 'Transporte', 'Hogar', 'Salud', 'Ocio', 'Salidas', 'Shopper', 'Otros',
] as const;

type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<Category, string> = {
  Comida:     'bg-success/15 text-ok-ink ',
  Transporte: 'bg-primary-container/15 text-info-ink ',
  Hogar:      'bg-warning/15 text-warn-ink ',
  Salud:      'bg-danger/15 text-danger-ink ',
  Ocio:       'bg-primary-container/15 text-info-ink ',
  Salidas:    'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  Shopper:    'bg-primary-container/15 text-info-ink ',
  Otros:      'bg-surface-container text-on-surface-variant ',
};

function buildDefaultForm(monedaLocal: string) {
  return {
    fecha:       todayLocalISO(),
    descripcion: '',
    categoria:   'Otros' as Category,
    monto:       '',
    moneda:      monedaLocal,
    lugar:       '',
  };
}

interface ManualCardProps {
  title: string;
  tone: 'warn' | 'neutral';
  items: any[];
  subtotalLabel: string;
  subtotal: number;
  newLabel: string;
  emptyText: string;
  onNew: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  monedaLocal: string;
  fmtLocal: (n: number) => string;
  header?: React.ReactNode;
}

function ManualExpensesCard({
  title, tone, items, subtotalLabel, subtotal, newLabel, emptyText, onNew, onEdit, onDelete, monedaLocal, fmtLocal, header,
}: ManualCardProps) {
  const warn = tone === 'warn';
  // Sortable by column. Amounts are compared in the local currency; the biggest comes first.
  const { sorted: sortedItems, sort, toggle } = useTableSort<any>(items, {
    date: (s: any) => s.fecha,
    description: (s: any) => s.descripcion,
    category: (s: any) => s.categoria ?? '',
    place: (s: any) => s.lugar ?? '',
    amount: (s: any) => s.montoLocal ?? s.montoCUP ?? s.monto,
  }, { key: 'amount', dir: 'desc' });
  return (
    <section aria-label={title} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
      <div className={`px-4 py-3 border-b border-outline-variant flex items-center gap-2 ${warn ? 'bg-warning/10' : 'bg-surface-container-low'}`}>
        <BookOpen size={16} className={warn ? 'text-warn-ink' : 'text-on-surface-variant'} />
        <h2 className={`text-sm font-semibold ${warn ? 'text-warn-ink' : 'text-on-surface'}`}>{title}</h2>
        <button
          onClick={onNew}
          className={`ml-auto flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${warn ? 'text-warn-ink bg-warning/15 hover:bg-warning/20' : 'text-on-surface bg-surface-container hover:bg-surface-high'}`}
        >
          <Plus size={13} /> {newLabel}
        </button>
      </div>
      {header}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-container-low font-label-upper text-label-upper text-on-surface-variant">
            <tr>
              <SortableTh label="Fecha" sortKey="date" sort={sort} onSort={toggle} align="left" className="px-3 py-2" />
              <SortableTh label="Descripción" sortKey="description" sort={sort} onSort={toggle} align="left" className="px-3 py-2" />
              <SortableTh label="Categoría" sortKey="category" sort={sort} onSort={toggle} align="left" className="px-3 py-2" />
              <SortableTh label="Lugar" sortKey="place" sort={sort} onSort={toggle} align="left" className="px-3 py-2" />
              <SortableTh label="Monto" sortKey="amount" sort={sort} onSort={toggle} align="right" className="px-3 py-2" />
              <th className="px-3 py-2 text-center">Acc.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-outline text-xs">{emptyText}</td></tr>
            ) : (
              sortedItems.map((s: any) => (
                <tr key={s.id} className="hover:bg-surface-gray">
                  <td className="px-3 py-2 text-on-surface-variant text-xs">{s.fecha}</td>
                  <td className="px-3 py-2 text-on-surface font-medium">{s.descripcion}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[s.categoria as Category] ?? CAT_COLORS['Otros']}`}>
                      {s.categoria}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-on-surface-variant text-xs">{s.lugar || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="font-semibold text-on-surface">{fmt(s.monto ?? s.montoCUP)} {s.moneda ?? monedaLocal}</div>
                    {s.moneda && s.moneda !== monedaLocal && (
                      <div className="text-xs text-on-surface-variant">≈ {fmtLocal(s.montoLocal ?? s.montoCUP)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button aria-label="Editar" onClick={() => onEdit(s)} className="p-1.5 text-info-ink hover:text-info-ink rounded hover:bg-primary-container/10">
                        <Edit2 size={13} />
                      </button>
                      <button aria-label="Eliminar" onClick={() => onDelete(s.id)} className="p-1.5 text-danger-ink hover:text-danger-ink rounded hover:bg-danger/10">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className={warn ? 'bg-warning/10' : 'bg-surface-container-low'}>
              <tr>
                <td colSpan={4} className={`px-3 py-2 text-xs font-bold ${warn ? 'text-warn-ink' : 'text-on-surface-variant'}`}>{subtotalLabel}</td>
                <td className={`px-3 py-2 text-right text-sm font-bold ${warn ? 'text-warn-ink' : 'text-on-surface'}`}>{fmtLocal(subtotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function OutingsBudgetHeader({ outings, fmtLocal }: { outings: any; fmtLocal: (n: number) => string }) {
  const { total, budget, remaining, exceeded } = outings;
  if (budget == null) {
    return (
      <div className="px-4 py-3 border-b border-outline-variant bg-surface-gray">
        <p className="text-xs text-on-surface-variant">
          Sin límite: define el gasto «Salidas» en la categoría Comida de{' '}
          <Link href="/presupuesto" className="text-primary hover:underline">Presupuesto</Link>.
        </p>
      </div>
    );
  }
  const pct = budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 100;
  return (
    <div className="px-4 py-3 border-b border-outline-variant bg-surface-gray">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label-upper text-label-upper text-on-surface-variant">PRESUPUESTO DE SALIDAS DEL MES</p>
          <p className="text-xl font-extrabold text-on-surface">
            {fmtLocal(total)} <span className="text-xs font-medium text-outline">de {fmtLocal(budget)}</span>
          </p>
        </div>
        <p className={`text-sm font-bold ${exceeded ? 'text-danger-ink' : 'text-ok-ink'}`}>
          {exceeded ? `Te pasaste por ${fmtLocal(Math.abs(remaining))}` : `Te quedan ${fmtLocal(remaining)}`}
        </p>
      </div>
      <div
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Gastado en salidas"
        className="mt-2 h-2.5 rounded-full bg-surface-container overflow-hidden"
      >
        <div className={`h-full rounded-full ${exceeded ? 'bg-danger' : 'bg-success'}`} style={{ width: `${pct}%` }} />
      </div>
      {exceeded && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-ink">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <b>Superaste el presupuesto de Salidas</b>
            <p className="text-xs">Puedes seguir registrando; el presupuesto no se modifica desde aquí.</p>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-on-surface-variant">
        Límite tomado de «Salidas» en Comida, dentro de{' '}
        <Link href="/presupuesto" className="text-primary hover:underline">Presupuesto</Link>.
      </p>
    </div>
  );
}

export default function RegistroGastosPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { currencies, rates } = useCurrencyStore();
  const { fmt: fmtLocal } = useCurrencyFormatter();
  const localCurrency = currencies.find(c => c.isLocal);
  const monedaLocal = localCurrency?.currencyCode ?? '';

  const [form, setForm] = useState<any>(() => buildDefaultForm(monedaLocal));

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const qKey = ['household-expenses', monthStr];

  const { data, isLoading, isError, refetch } = useQuery(
    qKey,
    () => householdExpensesAPI.getMonth(monthStr).then(r => r.data),
    { staleTime: 0 },
  );

  const comprasMercado: any[]   = data?.comprasMercado  ?? [];
  // Market purchases sortable by column; the biggest total comes first.
  const { sorted: sortedCompras, sort: comprasSort, toggle: toggleComprasSort } = useTableSort<any>(comprasMercado, {
    date: (c: any) => c.fecha,
    description: (c: any) => c.descripcion,
    category: (c: any) => c.categoria ?? '',
    total: (c: any) => c.totalLocal ?? c.totalCUP,
  }, { key: 'total', dir: 'desc' });
  const salidas: any[]          = data?.salidas          ?? [];
  const resumen: any[]          = data?.resumenCategoria ?? [];
  const totalCompras: number    = data?.totalCompras     ?? 0;
  const totalSalidas: number    = data?.totalSalidas     ?? 0;
  const total: number           = data?.total            ?? 0;
  const outings: any            = data?.outings;
  const otros: any              = data?.otros;
  const unconvertedItems: number = data?.unconvertedItems ?? 0;


  const notifyOverBudget = (res: any) => {
    const w = res?.data?.budgetWarning;
    if (w) toast(`Superaste el presupuesto de Salidas por ${fmtLocal(w.exceededBy)}`, { icon: '⚠️' });
  };

  const createMut = useMutation((d: any) => householdExpensesAPI.create(d), {
    onSuccess: (res: any) => { toast.success('Gasto registrado'); notifyOverBudget(res); setShowModal(false); setForm(buildDefaultForm(monedaLocal)); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const updateMut = useMutation((d: any) => householdExpensesAPI.update(editItem?.id, d), {
    onSuccess: (res: any) => { toast.success('Gasto actualizado'); notifyOverBudget(res); setShowModal(false); setEditItem(null); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const deleteMut = useMutation((id: string) => householdExpensesAPI.delete(id), {
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries(qKey); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error'); },
  });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openNew = (categoria: Category) => {
    setForm({ ...buildDefaultForm(monedaLocal), categoria });
    setEditItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setForm({
      fecha:       item.fecha,
      descripcion: item.descripcion,
      categoria:   item.categoria,
      monto:       item.monto ?? item.montoCUP,
      moneda:      item.moneda ?? monedaLocal,
      lugar:       item.lugar || '',
    });
    setEditItem(item);
    setShowModal(true);
  };


  // Live preview of the outings limit for the expense being typed (informs, never blocks).
  const projectedOverBudget = (() => {
    if (!outings || outings.budget == null || form.categoria !== 'Salidas') return null;
    const amount = Number(form.monto);
    if (!amount || amount <= 0) return null;
    const rate = form.moneda === monedaLocal ? 1 : rates?.[form.moneda];
    if (!rate || rate <= 0) return null;
    const replaced = editItem && editItem.categoria === 'Salidas' ? Number(editItem.montoLocal ?? editItem.montoCUP ?? 0) : 0;
    const projected = Number(outings.total) - replaced + amount * rate;
    return projected > outings.budget
      ? { spent: Number(outings.total) - replaced, budget: Number(outings.budget), over: projected - outings.budget }
      : null;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) { toast.error('Ingresa una descripción'); return; }
    if (!form.monto || Number(form.monto) <= 0) { toast.error('Ingresa un monto válido'); return; }
    const moneda = form.moneda || monedaLocal;
    if (!moneda) { toast.error('Selecciona una moneda'); return; }
    const dto = { ...form, moneda, monto: Number(form.monto), mes: monthStr };
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
        <div className="bg-danger/10 border border-danger/25 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-danger-ink">
            <AlertTriangle size={16} />
            Error al cargar el registro de gastos.
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1 text-xs font-medium text-danger-ink hover:underline">
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
            <div className="px-4 py-3 border-b border-outline-variant bg-success/10 flex items-center gap-2">
              <ShoppingCart size={16} className="text-ok-ink" />
              <h2 className="text-sm font-semibold text-ok-ink">
                Compras de Mercado
              </h2>
              <span className="ml-auto text-xs text-on-surface-variant">Auto desde Lista de la Compra</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low font-label-upper text-label-upper text-on-surface-variant">
                  <tr>
                    <SortableTh label="Fecha" sortKey="date" sort={comprasSort} onSort={toggleComprasSort} align="left" className="px-3 py-2" />
                    <SortableTh label="Descripción" sortKey="description" sort={comprasSort} onSort={toggleComprasSort} align="left" className="px-3 py-2" />
                    <SortableTh label="Categoría" sortKey="category" sort={comprasSort} onSort={toggleComprasSort} align="left" className="px-3 py-2" />
                    <SortableTh label={`Total ${monedaLocal}`} sortKey="total" sort={comprasSort} onSort={toggleComprasSort} align="right" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {comprasMercado.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-outline text-xs">Sin compras este mes — agrega productos en Lista de la Compra</td></tr>
                  ) : (
                    sortedCompras.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-surface-gray">
                        <td className="px-3 py-2 text-on-surface-variant text-xs">{c.fecha}</td>
                        <td className="px-3 py-2 text-on-surface font-medium">{c.descripcion}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS['Comida']}`}>
                            {c.categoria}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">
                          {fmt(c.totalLocal ?? c.totalCUP)} {monedaLocal}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {comprasMercado.length > 0 && (
                  <tfoot className="bg-success/10">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-xs font-bold text-ok-ink">Subtotal Compras</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-ok-ink">{fmt(totalCompras)} {monedaLocal}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Section 2: Salidas and Otros gastos (single list for servers without the split) */}
          {outings ? (
            <>
              <ManualExpensesCard
                title="Salidas" tone="warn" items={outings.items ?? []}
                subtotalLabel="Subtotal Salidas" subtotal={outings.total ?? 0}
                newLabel="Nueva salida" emptyText="Sin salidas registradas — usa el botón &quot;Nueva salida&quot;"
                onNew={() => openNew('Salidas')} onEdit={handleEdit} onDelete={(id) => deleteMut.mutate(id)}
                monedaLocal={monedaLocal} fmtLocal={fmtLocal}
                header={<OutingsBudgetHeader outings={outings} fmtLocal={fmtLocal} />}
              />
              <ManualExpensesCard
                title="Otros gastos" tone="neutral" items={otros?.items ?? []}
                subtotalLabel="Subtotal Otros gastos" subtotal={otros?.total ?? 0}
                newLabel="Nuevo gasto" emptyText="Sin otros gastos este mes"
                onNew={() => openNew('Otros')} onEdit={handleEdit} onDelete={(id) => deleteMut.mutate(id)}
                monedaLocal={monedaLocal} fmtLocal={fmtLocal}
              />
            </>
          ) : (
            <ManualExpensesCard
              title="Salidas y Otros Gastos" tone="warn" items={salidas}
              subtotalLabel="Subtotal Salidas" subtotal={totalSalidas}
              newLabel="Nueva salida" emptyText="Sin salidas registradas — usa el botón &quot;Nueva salida&quot;"
              onNew={() => openNew('Otros')} onEdit={handleEdit} onDelete={(id) => deleteMut.mutate(id)}
              monedaLocal={monedaLocal} fmtLocal={fmtLocal}
            />
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
              <h2 className="text-sm font-semibold text-on-surface">Resumen del Mes</h2>
            </div>
            <div className="p-4 space-y-2">
              {resumen.map((r: any) => (
                <div key={r.categoria} className="flex items-center justify-between py-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLORS[r.categoria as Category] ?? CAT_COLORS['Otros']}`}>
                    {r.categoria}
                  </span>
                  <span className="text-sm font-semibold text-on-surface">{fmtLocal(r.totalCUP)}</span>
                </div>
              ))}
              {resumen.length === 0 && (
                <p className="text-xs text-outline text-center py-4">Sin datos este mes</p>
              )}
            </div>
            <div className="border-t border-outline-variant p-4 space-y-2">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Subtotal Compras</span>
                <span className="font-medium text-ok-ink">{fmt(totalCompras)} {monedaLocal}</span>
              </div>
              {unconvertedItems > 0 && (
                <p className="text-xs text-warn-ink">
                  Algunos artículos no tienen tasa de cambio y no se incluyen en el total
                </p>
              )}
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>{outings ? 'Salidas' : 'Subtotal Salidas'}</span>
                <span className="font-medium text-warn-ink">{fmtLocal(outings ? outings.total : totalSalidas)}</span>
              </div>
              {outings && (
                <div className="flex justify-between text-sm text-on-surface-variant">
                  <span>Otros gastos</span>
                  <span className="font-medium text-on-surface">{fmtLocal(otros?.total ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-on-surface border-t border-outline-variant pt-2 mt-1">
                <span>TOTAL</span>
                <span>{fmtLocal(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: nueva / editar salida */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4">
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
                  label="Monto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  required
                />
                <Select
                  label="Moneda"
                  value={form.moneda}
                  onChange={e => setForm({ ...form, moneda: e.target.value })}
                >
                  {(currencies.length > 0 ? currencies : [{ currencyCode: monedaLocal }]).map(c => (
                    <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </Select>
              </div>
              <Input
                label="Lugar (opcional)"
                value={form.lugar}
                onChange={e => setForm({ ...form, lugar: e.target.value })}
                placeholder="Dónde fue..."
              />
              {projectedOverBudget && (
                <div role="status" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warn-ink">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <b>Con esta salida superarías el presupuesto</b>
                    <p className="text-xs">
                      Llevas {fmtLocal(projectedOverBudget.spent)} de {fmtLocal(projectedOverBudget.budget)}; quedarías {fmtLocal(projectedOverBudget.over)} por encima. Puedes guardarla igualmente.
                    </p>
                  </div>
                </div>
              )}
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
