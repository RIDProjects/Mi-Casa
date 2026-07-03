import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { assetsAPI, creditCardsAPI, loansAPI, netWorthHistoryAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, TrendingUp, Download, Printer } from 'lucide-react';
import { useCurrencyStore } from '../store/currency.store';
import { CurrencyToggle } from '../components/ui/CurrencyToggle';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { CardSkeleton } from '../components/ui/Skeleton';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const defaultForm = {
  assetType: 'physical' as 'physical' | 'cash',
  nombre: '',
  valorEstimado: '',
  notas: '',
};

const exportPatrimonioCSV = (assets: any[]) => {
  const rows = assets.map(a => `${a.nombre || a.name},${a.valorEstimado || a.value},${a.assetType || a.tipo || ''}`);
  const csv = `Nombre,Valor,Tipo\n${rows.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patrimonio.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export default function PatrimonioPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);
  const { activeCurrency, rates } = useCurrencyStore();
  const [usdRate, setUsdRate] = useState<number>(1200);
  const [historyMonths, setHistoryMonths] = useState(12);

  const { data: cards = [], isLoading: loadingCards, isError: isErrorCards } = useQuery(
    'credit-cards',
    () => creditCardsAPI.getAll().then(r => r.data),
  );
  const { data: loans = [], isLoading: loadingLoans, isError: isErrorLoans } = useQuery(
    'loans',
    () => loansAPI.getAll().then(r => r.data),
  );

  const totalCardBalances = Array.isArray(cards)
    ? (cards as any[]).reduce((s, c) => s + Number(c.saldoActual || c.currentBalance || 0), 0)
    : 0;
  const totalLoanDebt = Array.isArray(loans)
    ? (loans as any[]).reduce((s, l) => s + Number(l.deudaActual || l.currentDebt || 0), 0)
    : 0;

  const { data: assetsData, isLoading, isError: isErrorNetWorth } = useQuery(
    ['net-worth', totalCardBalances, totalLoanDebt],
    () => assetsAPI.getAll(totalCardBalances, totalLoanDebt),
    {
      select: (d: any) => d.data,
      enabled: !loadingCards && !loadingLoans,
    }
  );

  const { data: historyData, isLoading: loadingHistory } = useQuery(
    ['net-worth-history', historyMonths],
    () => netWorthHistoryAPI.get(historyMonths).then(r => r.data),
    { staleTime: 10 * 60 * 1000 }
  );

  const assets: any[] = assetsData?.assets ?? assetsData ?? [];
  const rawNetWorth: number = assetsData?.netWorth ?? 0;
  const totalDebts = totalCardBalances + totalLoanDebt;

  // CUP is base currency. Divide by rate to convert to another currency.
  const divider =
    activeCurrency === 'USD' ? (usdRate || rates.USD || 125) :
    activeCurrency === 'MLC' ? (rates.MLC || 120) :
    1; // CUP: no conversion needed
  const netWorth = rawNetWorth / divider;
  const currencySymbol =
    activeCurrency === 'USD' ? 'US$' :
    activeCurrency === 'MLC' ? 'MLC$' : '$';

  const physicalAssets = assets.filter((a: any) => a.assetType === 'physical');
  const cashAssets = assets.filter((a: any) => a.assetType === 'cash');

  const historyPoints: any[] = Array.isArray(historyData?.history ?? historyData)
    ? (historyData?.history ?? historyData)
    : [];

  const chartData = historyPoints.map((h: any) => ({
    name: h.month ?? h.name ?? '',
    netWorth: Number(h.netWorth ?? h.patrimonio ?? 0) / divider,
    assets: Number(h.assets ?? h.activos ?? 0) / divider,
    liabilities: Number(h.liabilities ?? h.pasivos ?? 0) / divider,
  }));

  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const invalidateAll = () => {
    qc.invalidateQueries(['net-worth', totalCardBalances, totalLoanDebt]);
    qc.invalidateQueries('credit-cards');
    qc.invalidateQueries('loans');
  };

  const createMut = useMutation((d: any) => assetsAPI.create(d), {
    onSuccess: () => { toast.success('Activo registrado'); setShowModal(false); setForm(defaultForm); invalidateAll(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => assetsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Activo actualizado'); setEditItem(null); setShowModal(false); invalidateAll(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => assetsAPI.delete(id), {
    onSuccess: () => { toast.success('Activo eliminado'); setDeleteId(null); invalidateAll(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const handleEdit = (a: any) => {
    setForm({
      assetType: a.assetType,
      nombre: a.nombre,
      valorEstimado: a.valorEstimado,
      notas: a.notas || '',
    });
    setEditItem(a);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      </Layout>
    );
  }

  const netWorthPositive = netWorth >= 0;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={24} /> Patrimonio Neto {activeCurrency !== 'CUP' ? `(${activeCurrency})` : ''}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Activos físicos, efectivo y deudas consolidadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencyToggle />
          {activeCurrency === 'USD' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Cotización:</span>
              <input
                type="number"
                min="1"
                className="input py-1.5 text-sm w-28"
                value={usdRate}
                onChange={e => setUsdRate(Number(e.target.value) || 1)}
              />
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer size={14} /> PDF
          </button>
          <button
            onClick={() => exportPatrimonioCSV(assets)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={15} /> Exportar CSV
          </button>
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Agregar Activo
          </button>
        </div>
      </div>

      {(isErrorCards || isErrorLoans || isErrorNetWorth) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-6">
          {isErrorNetWorth && 'No se pudo cargar el patrimonio. Intentá recargar.'}
          {isErrorCards && !isErrorNetWorth && 'No se pudieron cargar las tarjetas de crédito.'}
          {isErrorLoans && !isErrorNetWorth && 'No se pudieron cargar los créditos.'}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6 text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Patrimonio Neto {activeCurrency !== 'CUP' ? `(en ${activeCurrency})` : ''}
        </p>
        <p className={`text-5xl font-bold mb-4 ${netWorthPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {netWorthPositive ? '+' : '-'}{currencySymbol}{fmt(Math.abs(netWorth))}
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Activos físicos</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {currencySymbol}{fmt(physicalAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0) / divider)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Efectivo y cuentas</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {currencySymbol}{fmt(cashAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0) / divider)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Deudas (tarjetas + créditos)</p>
            <p className="font-semibold text-red-600 dark:text-red-400">-{currencySymbol}{fmt(totalDebts / divider)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Evolución del patrimonio
          </h2>
          <div className="flex gap-1">
            {[6, 12, 24].map(m => (
              <button
                key={m}
                onClick={() => setHistoryMonths(m)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  historyMonths === m
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>
        </div>
        {loadingHistory ? (
          <div className="h-52 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Sin historial disponible todavía</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    netWorth: 'Patrimonio',
                    assets: 'Activos',
                    liabilities: 'Pasivos',
                  };
                  return [`${currencySymbol}${fmt(value)}`, labels[name] ?? name];
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#nwGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <AssetSection
        title="Bienes Físicos"
        emoji="🏠"
        assets={physicalAssets}
        onEdit={handleEdit}
        onDelete={(id: string) => setDeleteId(id)}
        currencySymbol={currencySymbol}
        divider={divider}
      />

      <AssetSection
        title="Efectivo y Cuentas"
        emoji="💰"
        assets={cashAssets}
        onEdit={handleEdit}
        onDelete={(id: string) => setDeleteId(id)}
        currencySymbol={currencySymbol}
        divider={divider}
      />

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar activo' : 'Nuevo activo'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Tipo de activo</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: 'physical', l: '🏠 Bien físico' },
                { v: 'cash', l: '💰 Efectivo / Cuenta' },
              ].map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm({ ...form, assetType: v })}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.assetType === v
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
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder={form.assetType === 'physical' ? 'Ej: Casa en zona norte' : 'Ej: Cuenta corriente Galicia'}
              required
            />
          </div>

          <div>
            <label className="label">Valor estimado</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.valorEstimado}
              onChange={e => setForm({ ...form, valorEstimado: e.target.value })}
              placeholder="0.00"
              required
            />
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

function AssetSection({
  title,
  emoji,
  assets,
  onEdit,
  onDelete,
  currencySymbol,
  divider,
}: {
  title: string;
  emoji: string;
  assets: any[];
  onEdit: (a: any) => void;
  onDelete: (id: string) => void;
  currencySymbol: string;
  divider: number;
}) {
  const fmtLocal = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

  const total = assets.reduce((s, a) => s + Number(a.valorEstimado || 0), 0) / divider;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">
          {emoji} {title}
        </h2>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{currencySymbol}{fmtLocal(total)}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-600">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Valor</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Notas</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {assets.map((a: any) => (
            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.nombre}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                {currencySymbol}{fmtLocal(Number(a.valorEstimado || 0) / divider)}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{a.notas || '-'}</td>
              <td className="px-4 py-3 text-center">
                <ActionButtons
                  onEdit={() => onEdit(a)}
                  onDelete={() => onDelete(a.id)}
                />
              </td>
            </tr>
          ))}
          {assets.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                Sin {title.toLowerCase()} registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
