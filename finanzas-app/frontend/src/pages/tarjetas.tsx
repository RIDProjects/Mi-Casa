import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { creditCardsAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PageHeader from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import ActionButtons from '../components/ui/ActionButtons';
import { Plus, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';

import { useCurrencyFormatter } from '../lib/currency';
import { getErrorMessage } from '../utils/errors';

const TIPO_PAGO_OPTIONS = [
  { v: 'full', l: 'Pago todo el saldo' },
  { v: 'minimum', l: 'Pago mínimo' },
  { v: 'stopped', l: 'Dejé de pagar' },
  { v: 'partial', l: 'Pago parcial' },
];

const ADVISORY: Record<string, { label: string; badge: string }> = {
  full:    { label: '✅ Pagás saldo completo',       badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  minimum: { label: '⚠️ Pagás mínimo',               badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  stopped: { label: '❌ Dejaste de pagar',            badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  partial: { label: '💡 Pago parcial',               badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
};

const defaultForm = {
  banco: '',
  nombreTarjeta: '',
  tasaAnual: '',
  saldoActual: '',
  lineaCredito: '',
  fechaCorte: '',
  fechaPago: '',
  tipoPago: 'full',
};

function utilizationColor(pct: number) {
  if (pct < 30) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (pct < 50) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

function utilizationBarColor(pct: number) {
  if (pct < 30) return 'bg-green-500';
  if (pct < 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function TarjetasPage() {
  const qc = useQueryClient();
  const { fmt: cfmt } = useCurrencyFormatter();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: cards = [], isLoading, isError, refetch } = useQuery(
    'credit-cards',
    () => creditCardsAPI.getAll().then(r => r.data),
    { staleTime: 0 }
  );


  const refreshCache = () => {
    creditCardsAPI.getAll().then(r => qc.setQueryData('credit-cards', r.data));
  };

  const createMut = useMutation((d: any) => creditCardsAPI.create(d), {
    onSuccess: () => { toast.success('Tarjeta registrada'); setShowModal(false); setForm(defaultForm); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const updateMut = useMutation((d: any) => creditCardsAPI.update(editItem?.id, d), {
    onSuccess: () => { toast.success('Tarjeta actualizada'); setEditItem(null); setShowModal(false); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const deleteMut = useMutation((id: string) => creditCardsAPI.delete(id), {
    onSuccess: () => { toast.success('Tarjeta eliminada'); setDeleteId(null); refreshCache(); },
    onError: (e: any) => { toast.error(getErrorMessage(e)); },
  });

  const handleEdit = (c: any) => {
    setForm({
      banco: c.banco,
      nombreTarjeta: c.nombreTarjeta,
      tasaAnual: c.tasaAnual,
      saldoActual: c.saldoActual,
      lineaCredito: c.lineaCredito,
      fechaCorte: c.fechaCorte,
      fechaPago: c.fechaPago,
      tipoPago: c.tipoPago,
    });
    setEditItem(c);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editItem ? updateMut.mutate(form) : createMut.mutate(form);
  };

  // Summary
  const totalDeuda = cards.reduce((s: number, c: any) => s + Number(c.saldoActual || 0), 0);
  const totalLimite = cards.reduce((s: number, c: any) => s + Number(c.lineaCredito || 0), 0);
  const totalUtilPct = totalLimite > 0 ? (totalDeuda / totalLimite) * 100 : 0;

  const summaryColor =
    totalUtilPct < 30 ? 'text-success' :
    totalUtilPct < 50 ? 'text-warning' :
    'text-danger';

  return (
    <Layout>
      <PageHeader
        title={<><CreditCard size={24} /> Tarjetas de Crédito</>}
        subtitle="Gestión de tus tarjetas y deuda"
        action={
          <button
            onClick={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Nueva Tarjeta
          </button>
        }
      />

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle size={40} className="text-danger" />
          <p className="text-on-surface-variant">Error al cargar las tarjetas</p>
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Summary bar */}
      {!isLoading && !isError && cards.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-0.5">Deuda total</p>
              <p className="text-xl font-bold text-danger">{cfmt(totalDeuda)}</p>
            </div>
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-0.5">Límite total</p>
              <p className="text-xl font-bold text-on-surface">{cfmt(totalLimite)}</p>
            </div>
            <div>
              <p className="font-label-upper text-label-upper text-on-surface-variant mb-0.5">Utilización global</p>
              <p className={`text-xl font-bold ${summaryColor}`}>{totalUtilPct.toFixed(1)}%</p>
            </div>
          </div>
          {totalLimite > 0 && (
            <div className="mt-3 w-full bg-surface-container rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${utilizationBarColor(totalUtilPct)}`}
                style={{ width: `${Math.min(totalUtilPct, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Cards table */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && !isError && cards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-on-surface">No hay tarjetas registradas</h3>
          <p className="text-sm text-on-surface-variant mt-1">Agregá tu primera tarjeta para empezar a hacer seguimiento</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">
            Agregar tarjeta
          </button>
        </div>
      ) : !isLoading && !isError ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-left font-label-upper text-label-upper text-on-surface-variant">Banco / Tarjeta</th>
                  <th className="px-4 py-3 text-right font-label-upper text-label-upper text-on-surface-variant">Saldo</th>
                  <th className="px-4 py-3 text-right font-label-upper text-label-upper text-on-surface-variant">Límite</th>
                  <th className="px-4 py-3 text-center font-label-upper text-label-upper text-on-surface-variant">% Util.</th>
                  <th className="px-4 py-3 text-right font-label-upper text-label-upper text-on-surface-variant">Tasa</th>
                  <th className="px-4 py-3 text-left font-label-upper text-label-upper text-on-surface-variant">Estado pago</th>
                  <th className="px-4 py-3 text-center font-label-upper text-label-upper text-on-surface-variant">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {cards.map((c: any) => {
                  const saldo = Number(c.saldoActual || 0);
                  const limite = Number(c.lineaCredito || 0);
                  const util = limite > 0 ? (saldo / limite) * 100 : 0;
                  const utilVariant = util < 30 ? 'green' : util < 60 ? 'amber' : 'red';
                  const utilLabel = util < 30 ? 'Saludable' : util < 60 ? 'Cuidado' : util < 90 ? 'Alto' : 'Crítico';
                  const payDay = Number(c.fechaPago);
                  let daysLeft: number | null = null;
                  let urgVariant: 'red' | 'amber' | 'gray' = 'gray';
                  if (payDay) {
                    const today = new Date();
                    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                    const nextPayment = new Date(today.getFullYear(), today.getMonth(), Math.min(payDay, daysInCurrentMonth));
                    if (nextPayment <= today) {
                      const daysInNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
                      nextPayment.setMonth(nextPayment.getMonth() + 1, Math.min(payDay, daysInNextMonth));
                    }
                    daysLeft = Math.ceil((nextPayment.getTime() - today.getTime()) / 86400000);
                    urgVariant = daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'amber' : 'gray';
                  }
                  return (
                    <tr key={c.id} className="hover:bg-surface-gray transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-on-surface flex items-center gap-2">
                          {c.banco}
                          <Badge variant={utilVariant}>{utilLabel} {util.toFixed(0)}%</Badge>
                        </div>
                        <div className="text-xs text-on-surface-variant flex items-center gap-2 mt-0.5">
                          {c.nombreTarjeta}
                          {daysLeft !== null && <Badge variant={urgVariant}>Pago en {daysLeft}d</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">{cfmt(saldo)}</td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">{cfmt(limite)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${utilizationColor(util)}`}>
                          {util.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">{c.tasaAnual}%</td>
                      <td className="px-4 py-3">
                        {ADVISORY[c.tipoPago] ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ADVISORY[c.tipoPago].badge}`}
                            title={ADVISORY[c.tipoPago].label}
                          >
                            {ADVISORY[c.tipoPago].label}
                          </span>
                        ) : <span className="text-outline">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionButtons
                          onEdit={() => handleEdit(c)}
                          onDelete={() => setDeleteId(c.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Editar tarjeta' : 'Nueva tarjeta'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="tarjeta-banco">Banco</label>
              <input
                id="tarjeta-banco"
                className="input"
                value={form.banco}
                onChange={e => setForm({ ...form, banco: e.target.value })}
                placeholder="Ej: Santander"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="tarjeta-nombre">Nombre tarjeta</label>
              <input
                id="tarjeta-nombre"
                className="input"
                value={form.nombreTarjeta}
                onChange={e => setForm({ ...form, nombreTarjeta: e.target.value })}
                placeholder="Ej: Visa Oro"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="tarjeta-saldo">Saldo actual</label>
              <input
                id="tarjeta-saldo"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.saldoActual}
                onChange={e => setForm({ ...form, saldoActual: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="tarjeta-limite">Línea de crédito</label>
              <input
                id="tarjeta-limite"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.lineaCredito}
                onChange={e => setForm({ ...form, lineaCredito: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tarjeta-tasa">Tasa anual %</label>
            <input
              id="tarjeta-tasa"
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.tasaAnual}
              onChange={e => setForm({ ...form, tasaAnual: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="tarjeta-fecha-corte">Fecha de corte (día)</label>
              <input
                id="tarjeta-fecha-corte"
                type="number"
                min="1"
                max="31"
                className="input"
                value={form.fechaCorte}
                onChange={e => setForm({ ...form, fechaCorte: e.target.value })}
                placeholder="15"
              />
            </div>
            <div>
              <label className="label" htmlFor="tarjeta-fecha-pago">Fecha de pago (día)</label>
              <input
                id="tarjeta-fecha-pago"
                type="number"
                min="1"
                max="31"
                className="input"
                value={form.fechaPago}
                onChange={e => setForm({ ...form, fechaPago: e.target.value })}
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <label className="label">Tipo de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_PAGO_OPTIONS.map(({ v, l }) => (
                <button
                  key={v} type="button"
                  onClick={() => setForm({ ...form, tipoPago: v })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border-2 text-left transition-all ${
                    form.tipoPago === v
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
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
