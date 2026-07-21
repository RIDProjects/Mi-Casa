import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { investmentsAPI, exchangeRatesAPI } from '../services/api';
import { useCurrencyStore } from '../store/currency.store';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ActionButtons from '../components/ui/ActionButtons';
import { Badge } from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { Plus, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

type InvestmentType = 'plazo_fijo' | 'fci' | 'acciones' | 'crypto' | 'dolar' | 'propiedades' | 'otros';

const calcTEA = (tna: number): number => {
  return (Math.pow(1 + (tna / 100) / 365, 365) - 1) * 100;
};

const TYPE_LABELS: Record<InvestmentType, string> = {
  plazo_fijo: 'Plazo Fijo',
  fci: 'FCI',
  acciones: 'Acciones',
  crypto: 'Crypto',
  dolar: 'Dólar',
  propiedades: 'Propiedades',
  otros: 'Otros',
};

const TYPE_BADGE: Record<InvestmentType, BadgeVariant> = {
  plazo_fijo: 'blue',
  fci: 'purple',
  acciones: 'green',
  crypto: 'amber',
  dolar: 'yellow',
  propiedades: 'gray',
  otros: 'gray',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

function calcCurrentValue(inv: any): number {
  const amount = Number(inv.monto ?? inv.amount ?? 0);
  const rate = Number(inv.tna ?? inv.rate ?? 0);
  const tipo = inv.tipo ?? inv.type ?? '';
  const startDate = inv.fechaInicio ?? inv.startDate;

  if (tipo !== 'plazo_fijo' || !startDate || rate === 0) return amount;

  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return amount * (1 + (rate / 100) * (daysElapsed / 365));
}

const defaultForm = {
  nombre: '',
  tipo: 'plazo_fijo' as InvestmentType,
  monto: '',
  moneda: '',
  tna: '',
  fechaInicio: '',
  fechaFin: '',
  notas: '',
  quantity: '',
  ticker: '',
};

export default function InversionesPage() {
  const qc = useQueryClient();
  const { currencies } = useCurrencyStore();
  const baseCurrency = currencies.find(c => c.isBase);
  const getCurrencySymbol = (code: string) => currencies.find(c => c.currencyCode === code)?.symbol ?? code;
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: investments = [], isLoading } = useQuery(
    'investments',
    () => investmentsAPI.getAll().then(r => r.data),
    { retry: false }
  );

  // exchangeRates kept for potential future use
  useQuery(
    'exchangeRates',
    () => exchangeRatesAPI.getLatest().then(r => r.data),
    { retry: false }
  );

  const invalidate = () => qc.invalidateQueries('investments');

  const createMut = useMutation((d: any) => investmentsAPI.create(d), {
    onSuccess: () => {
      toast.success('Inversión registrada');
      setShowModal(false);
      setForm(defaultForm);
      invalidate();
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message ?? 'Error al crear'); },
  });

  const updateMut = useMutation((d: any) => investmentsAPI.update(editItem?.id, d), {
    onSuccess: () => {
      toast.success('Inversión actualizada');
      setEditItem(null);
      setShowModal(false);
      invalidate();
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message ?? 'Error al actualizar'); },
  });

  const deleteMut = useMutation((id: string) => investmentsAPI.remove(id), {
    onSuccess: () => {
      toast.success('Inversión eliminada');
      setDeleteId(null);
      invalidate();
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message ?? 'Error al eliminar'); },
  });

  const handleEdit = (inv: any) => {
    setForm({
      nombre: inv.nombre ?? inv.name ?? '',
      tipo: inv.tipo ?? inv.type ?? 'plazo_fijo',
      monto: String(inv.monto ?? inv.amount ?? ''),
      moneda: inv.moneda ?? inv.currency ?? baseCurrency?.currencyCode ?? '',
      tna: String(inv.tna ?? inv.rate ?? ''),
      fechaInicio: inv.fechaInicio ?? inv.startDate ?? '',
      fechaFin: inv.fechaFin ?? inv.endDate ?? '',
      notas: inv.notas ?? inv.notes ?? '',
      quantity: String(inv.quantity ?? ''),
      ticker: inv.ticker ?? '',
    });
    setEditItem(inv);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      monto: Number(form.monto),
      tna: form.tna ? Number(form.tna) : 0,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      ticker: form.ticker || undefined,
    };
    editItem ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const list = Array.isArray(investments) ? (investments as any[]) : [];

  const totalsByCurrency: Record<string, number> = {};
  list.forEach(i => {
    const code = i.moneda ?? i.currency ?? baseCurrency?.currencyCode ?? '';
    totalsByCurrency[code] = (totalsByCurrency[code] ?? 0) + calcCurrentValue(i);
  });

  const showQuantityFields = form.tipo === 'crypto' || form.tipo === 'dolar' || form.tipo === 'otros';

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={<><TrendingUp size={22} /> Inversiones</>}
        subtitle="Seguimiento de tu portafolio"
        action={
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Nueva inversión
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(totalsByCurrency).map(([code, total]) => (
          <div key={code} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
            <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Total {code}</p>
            <p className="text-xl font-bold text-primary">{getCurrencySymbol(code)}{fmt(total)}</p>
          </div>
        ))}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm">
          <p className="font-label-upper text-label-upper text-on-surface-variant mb-1">Inversiones</p>
          <p className="text-xl font-bold text-on-surface">{list.length}</p>
        </div>
      </div>

      {/* Table or empty state */}
      {list.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-lg font-semibold text-on-surface">Sin inversiones registradas</h3>
          <p className="text-sm text-on-surface-variant mt-1">Agregá tu primera inversión para comenzar</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  {['Nombre', 'Tipo', 'Monto', 'Moneda', 'TNA% / TEA%', 'Valor Actual', 'Vencimiento', 'Acciones'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left font-label-upper text-label-upper text-on-surface-variant whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {list.map((inv: any) => {
                  const tipo: InvestmentType = inv.tipo ?? inv.type ?? 'otros';
                  const moneda: string = inv.moneda ?? inv.currency ?? baseCurrency?.currencyCode ?? '';
                  const symbol = getCurrencySymbol(moneda);
                  const currentValue = calcCurrentValue(inv);
                  const fechaFin = inv.fechaFin ?? inv.endDate;
                  const tna = Number(inv.tna ?? inv.rate ?? 0);
                  return (
                    <tr key={inv.id} className="hover:bg-surface-gray transition-colors">
                      <td className="px-4 py-3 font-medium text-on-surface">
                        {inv.nombre ?? inv.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TYPE_BADGE[tipo] ?? 'gray'}>
                          {TYPE_LABELS[tipo] ?? tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-on-surface">
                        {symbol}{fmt(Number(inv.monto ?? inv.amount ?? 0))}
                        {inv.quantity && (
                          <div className="text-xs text-outline mt-0.5">
                            {inv.quantity} {inv.ticker ? inv.ticker : 'unidades'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{moneda}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {tna > 0 ? (
                          <div>
                            <span>{tna}% TNA</span>
                            {tipo === 'plazo_fijo' && (
                              <div className="text-xs text-success mt-0.5">
                                TEA: {calcTEA(tna).toFixed(2)}%
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-success">
                        {symbol}{fmt(currentValue)}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">
                        {fechaFin ? new Date(fechaFin).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionButtons
                          onEdit={() => handleEdit(inv)}
                          onDelete={() => setDeleteId(inv.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar inversión' : 'Nueva inversión'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Plazo fijo Banco Metropolitano"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value as InvestmentType })}
              >
                {(Object.entries(TYPE_LABELS) as [InvestmentType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Moneda</label>
              <select
                className="input"
                value={form.moneda || baseCurrency?.currencyCode || ''}
                onChange={e => setForm({ ...form, moneda: e.target.value })}
              >
                {currencies.filter(c => c.isActive).map(c => (
                  <option key={c.currencyCode} value={c.currencyCode}>
                    {c.symbol} {c.currencyCode} — {c.currencyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <label className="label">TNA %</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.tna}
                onChange={e => setForm({ ...form, tna: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          {showQuantityFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Cantidad de unidades</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="input"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Símbolo (BTC, USDT, etc.)</label>
                <input
                  className="input"
                  value={form.ticker}
                  onChange={e => setForm({ ...form, ticker: e.target.value })}
                  placeholder="BTC, USDT..."
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha inicio</label>
              <input
                type="date"
                className="input"
                value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Vencimiento (opcional)</label>
              <input
                type="date"
                className="input"
                value={form.fechaFin}
                onChange={e => setForm({ ...form, fechaFin: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input
              className="input"
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              placeholder="Detalles adicionales..."
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

    </Layout>
  );
}
