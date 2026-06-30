import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { assetsAPI, creditCardsAPI, loansAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const defaultForm = {
  assetType: 'physical' as 'physical' | 'cash',
  nombre: '',
  valorEstimado: '',
  notas: '',
};

export default function PatrimonioPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  // Load cards and loans to compute total debts
  const { data: cards = [] } = useQuery('credit-cards', () => creditCardsAPI.getAll().then(r => r.data), { staleTime: 0 });
  const { data: loans = [] } = useQuery('loans', () => loansAPI.getAll().then(r => r.data), { staleTime: 0 });

  const totalCardBalances = (cards as any[]).reduce((s, c) => s + Number(c.saldoActual || 0), 0);
  const totalLoanDebt = (loans as any[]).reduce((s, l) => s + Number(l.deudaActual || 0), 0);

  const { data: assetsData, isLoading } = useQuery(
    ['net-worth', totalCardBalances, totalLoanDebt],
    () => assetsAPI.getAll(totalCardBalances, totalLoanDebt).then(r => r.data),
    { staleTime: 0, enabled: true }
  );

  const assets: any[] = assetsData?.assets ?? assetsData ?? [];
  const netWorth: number = assetsData?.netWorth ?? 0;
  const totalActivos: number = assetsData?.totalAssets ?? assets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0);
  const totalDebts = totalCardBalances + totalLoanDebt;

  const physicalAssets = assets.filter((a: any) => a.assetType === 'physical');
  const cashAssets = assets.filter((a: any) => a.assetType === 'cash');

  const getErrorMessage = (e: any) => e?.response?.data?.message || e?.message || 'Error';

  const refreshCache = () => {
    assetsAPI.getAll(totalCardBalances, totalLoanDebt).then(r =>
      qc.setQueryData(['net-worth', totalCardBalances, totalLoanDebt], r.data)
    );
  };

  const createMut = useMutation((d: any) => assetsAPI.create(d), {
    onSuccess: () => { toast.success('Activo registrado'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation((d: any) => assetsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Activo actualizado'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation((id: string) => assetsAPI.delete(id), {
    onSuccess: () => { toast.success('Activo eliminado'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => toast.error(getErrorMessage(e)),
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
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      </Layout>
    );
  }

  const netWorthPositive = netWorth >= 0;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={24} /> Patrimonio Neto
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Activos físicos, efectivo y deudas consolidadas</p>
        </div>
        <button
          onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Agregar Activo
        </button>
      </div>

      {/* Big KPI */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6 text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Patrimonio Neto
        </p>
        <p className={`text-5xl font-bold mb-4 ${netWorthPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {netWorthPositive ? '+' : '-'}${fmt(Math.abs(netWorth))}
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Activos físicos</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              ${fmt(physicalAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Efectivo y cuentas</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              ${fmt(cashAssets.reduce((s: number, a: any) => s + Number(a.valorEstimado || 0), 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-0.5">Deudas (tarjetas + créditos)</p>
            <p className="font-semibold text-red-600 dark:text-red-400">-${fmt(totalDebts)}</p>
          </div>
        </div>
      </div>

      {/* Physical assets */}
      <AssetSection
        title="Bienes Físicos"
        emoji="🏠"
        assets={physicalAssets}
        onEdit={handleEdit}
        onDelete={(id: string) => setDeleteId(id)}
      />

      {/* Cash assets */}
      <AssetSection
        title="Efectivo y Cuentas"
        emoji="💰"
        assets={cashAssets}
        onEdit={handleEdit}
        onDelete={(id: string) => setDeleteId(id)}
      />

      {/* Modal */}
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

// Sub-component for asset table section
function AssetSection({
  title,
  emoji,
  assets,
  onEdit,
  onDelete,
}: {
  title: string;
  emoji: string;
  assets: any[];
  onEdit: (a: any) => void;
  onDelete: (id: string) => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

  const total = assets.reduce((s, a) => s + Number(a.valorEstimado || 0), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-4">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">
          {emoji} {title}
        </h2>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">${fmt(total)}</span>
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
              <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">${fmt(Number(a.valorEstimado || 0))}</td>
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
