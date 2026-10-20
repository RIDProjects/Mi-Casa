import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { assetsAPI, creditCardsAPI, loansAPI, netWorthHistoryAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, TrendingUp, Download, Printer, Home, Wallet } from 'lucide-react';
import { useCurrencyStore } from '../store/currency.store';
import { resolveRate } from '../lib/currency';
import { CurrencyToggle } from '../components/ui/CurrencyToggle';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { CardSkeleton } from '../components/ui/Skeleton';
import { fmt } from '../lib/format';
import { getErrorMessage } from '../utils/errors';
import { formatAxisMoney, CHART_GRID_STROKE, CHART_TICK, CHART_TOOLTIP, CHART_TOOLTIP_LABEL, CHART_TOOLTIP_ITEM, CHART_CURSOR, CHART_COLORS } from '../lib/chart';

const safeNum = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

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
  const { activeCurrencyCode, rates, currencies } = useCurrencyStore();
  const localCurrency = currencies.find(c => c.isLocal);
  const activeCurrency = currencies.find(c => c.currencyCode === activeCurrencyCode) ?? localCurrency;
  // Manual USD quote override; empty = use the configured house rate.
  const [usdRate, setUsdRate] = useState<number | null>(null);
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

  // Base currency is always 1. For non-base, divide by the exchange rate; with
  // no usable rate, show the amounts unconverted in the local currency.
  const requestedCode = activeCurrency?.currencyCode ?? localCurrency?.currencyCode ?? '';
  const localCode = localCurrency?.currencyCode ?? '';
  const resolvedRate = resolveRate(
    requestedCode,
    localCode,
    rates,
    requestedCode === 'USD' ? usdRate : null,
  );
  const canConvert = resolvedRate !== null;
  const divider = resolvedRate ?? 1;
  const displayCurrency = canConvert ? activeCurrency : localCurrency ?? activeCurrency;
  const activeCode = displayCurrency?.currencyCode ?? '';
  const netWorth = rawNetWorth / divider;
  const currencySymbol = displayCurrency?.symbol ?? '$';

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
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <TrendingUp size={24} /> Patrimonio Neto {activeCode !== localCode ? `(${activeCode})` : ''}
          </h1>
          <p className="text-on-surface-variant mt-1">Activos físicos, efectivo y deudas consolidadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencyToggle />
          {requestedCode === 'USD' && requestedCode !== localCode && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-on-surface-variant">Cotización:</span>
              <input
                type="number"
                min="1"
                className="input py-1.5 text-sm w-28"
                value={usdRate ?? rates['USD'] ?? ''}
                placeholder="Sin cotización"
                onChange={e => setUsdRate(Number(e.target.value) || null)}
              />
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border-light rounded-lg hover:bg-surface-gray transition-colors"
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
        <div className="bg-danger/10 border border-danger/25 rounded-lg px-4 py-3 text-sm text-danger-ink mb-6">
          {isErrorNetWorth && 'No se pudo cargar el patrimonio. Intenta recargar.'}
          {isErrorCards && !isErrorNetWorth && 'No se pudieron cargar las tarjetas de crédito.'}
          {isErrorLoans && !isErrorNetWorth && 'No se pudieron cargar los créditos.'}
        </div>
      )}

      <div className="bg-panel rounded-xl border border-border-light shadow-sm p-6 mb-6 text-center">
        <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
          Patrimonio Neto {activeCode !== localCode ? `(en ${activeCode})` : ''}
        </p>
        <p className={`text-[1.7rem] sm:text-5xl font-bold fin-number mb-4 break-words ${netWorthPositive ? 'text-ok-ink ' : 'text-danger-ink '}`}>
          {netWorthPositive ? '+' : '-'}{currencySymbol}{fmt(Math.abs(netWorth))}
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-on-surface-variant uppercase mb-0.5">Activos físicos</p>
            <p className="font-semibold text-on-surface">
              {currencySymbol}{fmt(physicalAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0) / divider)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant uppercase mb-0.5">Efectivo y cuentas</p>
            <p className="font-semibold text-on-surface">
              {currencySymbol}{fmt(cashAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0) / divider)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant uppercase mb-0.5">Deudas (tarjetas + créditos)</p>
            <p className="font-semibold text-danger-ink">-{currencySymbol}{fmt(totalDebts / divider)}</p>
          </div>
        </div>
      </div>

      <div className="bg-panel rounded-xl border border-border-light shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Evolución del patrimonio
          </h2>
          <div className="flex gap-1">
            {[6, 12, 24].map(m => (
              <button
                key={m}
                onClick={() => setHistoryMonths(m)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  historyMonths === m
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-high '
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>
        </div>
        {loadingHistory ? (
          <div className="h-52 bg-surface-container rounded-xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center">
            <p className="text-sm text-outline">Sin historial disponible todavía</p>
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
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={{ ...CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ ...CHART_TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatAxisMoney(safeNum(v), currencySymbol)}
                width={60}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                labelStyle={CHART_TOOLTIP_LABEL}
                itemStyle={CHART_TOOLTIP_ITEM}
                cursor={CHART_CURSOR}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    netWorth: 'Patrimonio',
                    assets: 'Activos',
                    liabilities: 'Pasivos',
                  };
                  return [`${currencySymbol}${fmt(value)}`, labels[name] ?? name];
                }}
              />
              <Area animationDuration={1200} animationEasing="ease-out"
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
        icon={<Home size={18} />}
        assets={physicalAssets}
        onEdit={handleEdit}
        onDelete={(id: string) => setDeleteId(id)}
        currencySymbol={currencySymbol}
        divider={divider}
      />

      <AssetSection
        title="Efectivo y Cuentas"
        icon={<Wallet size={18} />}
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
                { v: 'physical', l: 'Bien físico' },
                { v: 'cash', l: 'Efectivo / Cuenta' },
              ].map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm({ ...form, assetType: v })}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.assetType === v
                      ? 'border-primary-container bg-primary-container/10 text-info-ink '
                      : 'border-border-light text-on-surface-variant '
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
  icon,
  assets,
  onEdit,
  onDelete,
  currencySymbol,
  divider,
}: {
  title: string;
  icon: React.ReactNode;
  assets: any[];
  onEdit: (a: any) => void;
  onDelete: (id: string) => void;
  currencySymbol: string;
  divider: number;
}) {
  const fmtLocal = (n: number) => {
    const v = Number(n);
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);
  };

  const total = assets.reduce((s, a) => s + Number(a.valorEstimado || 0), 0) / divider;

  return (
    <div className="bg-panel rounded-xl border border-border-light shadow-sm overflow-x-auto mb-4">
      <div className="px-4 py-3 bg-surface-gray border-b border-border-light flex items-center justify-between">
        <h2 className="font-semibold text-on-surface">
          <span className="inline-flex items-center gap-2"><span className="text-info-ink">{icon}</span>{title}</span>
        </h2>
        <span className="text-sm font-bold text-on-surface-variant">{currencySymbol}{fmtLocal(total)}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-surface-gray border-b border-border-light">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant uppercase">Nombre</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant uppercase">Valor</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant uppercase">Notas</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-on-surface-variant uppercase">Acc.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {assets.map((a: any) => (
            <tr key={a.id} className="hover:bg-surface-gray transition-colors">
              <td className="px-4 py-3 font-medium text-on-surface">{a.nombre}</td>
              <td className="px-4 py-3 text-right font-semibold text-ok-ink">
                {currencySymbol}{fmtLocal(Number(a.valorEstimado || 0) / divider)}
              </td>
              <td className="px-4 py-3 text-on-surface-variant text-xs">{a.notas || '-'}</td>
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
              <td colSpan={4} className="px-4 py-6 text-center text-outline text-sm">
                Sin {title.toLowerCase()} registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
