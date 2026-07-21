import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { useCurrencyStore, HouseCurrency } from '../../store/currency.store';
import { useAuthStore } from '../../store/auth.store';
import { houseCurrenciesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Coins, Plus, Trash2, Star } from 'lucide-react';

const COMMON_CURRENCIES = [
  { code: 'CUP', name: 'Peso Cubano',                   symbol: '$',    locale: 'es-CU' },
  { code: 'MLC', name: 'Moneda Libremente Convertible', symbol: 'MLC$', locale: 'es-CU' },
  { code: 'USD', name: 'Dólar Estadounidense',          symbol: 'US$',  locale: 'en-US' },
  { code: 'EUR', name: 'Euro',                          symbol: '€',    locale: 'es-ES' },
  { code: 'ARS', name: 'Peso Argentino',                symbol: '$',    locale: 'es-AR' },
  { code: 'MXN', name: 'Peso Mexicano',                 symbol: '$',    locale: 'es-MX' },
  { code: 'CLP', name: 'Peso Chileno',                  symbol: '$',    locale: 'es-CL' },
  { code: 'COP', name: 'Peso Colombiano',               symbol: '$',    locale: 'es-CO' },
  { code: 'BRL', name: 'Real Brasileño',                symbol: 'R$',   locale: 'pt-BR' },
  { code: 'GBP', name: 'Libra Esterlina',               symbol: '£',    locale: 'en-GB' },
  { code: 'CAD', name: 'Dólar Canadiense',              symbol: 'CA$',  locale: 'en-CA' },
];

const defaultAddForm = {
  preset: '',
  currencyCode: '',
  currencyName: '',
  symbol: '',
  locale: '',
};

export default function MonedasPage() {
  const user = useAuthStore(s => s.user);
  const { currencies, rates, setCurrencies, setRates } = useCurrencyStore();
  const houseId = user?.house?.id ?? '';

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(defaultAddForm);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const baseCurrency = currencies.find(c => c.isBase);

  const reload = async () => {
    if (!houseId) return;
    const [currRes, rateRes] = await Promise.all([
      houseCurrenciesAPI.getAll(houseId),
      houseCurrenciesAPI.getRates(houseId),
    ]);
    setCurrencies(currRes.data);
    setRates(rateRes.data);
  };

  const handlePresetChange = (code: string) => {
    const preset = COMMON_CURRENCIES.find(c => c.code === code);
    if (preset) {
      setAddForm({
        preset: code,
        currencyCode: preset.code,
        currencyName: preset.name,
        symbol: preset.symbol,
        locale: preset.locale,
      });
    } else {
      setAddForm({ ...defaultAddForm, preset: '' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId) return;
    try {
      await houseCurrenciesAPI.add(houseId, {
        currencyCode: addForm.currencyCode.toUpperCase(),
        currencyName: addForm.currencyName,
        symbol: addForm.symbol,
        locale: addForm.locale,
      });
      toast.success(`Moneda ${addForm.currencyCode.toUpperCase()} agregada`);
      setShowAddModal(false);
      setAddForm(defaultAddForm);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al agregar la moneda');
    }
  };

  const handleSetBase = async (currency: HouseCurrency) => {
    if (!houseId || currency.isBase) return;
    setLoading(l => ({ ...l, [`base-${currency.id}`]: true }));
    try {
      await houseCurrenciesAPI.setBase(houseId, currency.id);
      toast.success(`${currency.currencyCode} es ahora la moneda base`);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al cambiar la moneda base');
    } finally {
      setLoading(l => ({ ...l, [`base-${currency.id}`]: false }));
    }
  };

  const handleRemove = async (currency: HouseCurrency) => {
    if (!houseId) return;
    if (currency.isBase) {
      toast.error('No podés eliminar la moneda base');
      return;
    }
    setLoading(l => ({ ...l, [`del-${currency.id}`]: true }));
    try {
      await houseCurrenciesAPI.remove(houseId, currency.id);
      toast.success(`${currency.currencyCode} eliminada`);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar la moneda');
    } finally {
      setLoading(l => ({ ...l, [`del-${currency.id}`]: false }));
    }
  };

  const handleSaveRate = async (currency: HouseCurrency) => {
    if (!houseId || !baseCurrency) return;
    const rawRate = rateInputs[currency.currencyCode];
    const rate = parseFloat(rawRate);
    if (!rawRate || isNaN(rate) || rate <= 0) {
      toast.error('Ingresá una tasa válida mayor a 0');
      return;
    }
    setLoading(l => ({ ...l, [`rate-${currency.id}`]: true }));
    try {
      await houseCurrenciesAPI.upsertRate(houseId, {
        fromCurrency: currency.currencyCode,
        toCurrency: baseCurrency.currencyCode,
        rate,
      });
      toast.success(`Tasa de ${currency.currencyCode} actualizada`);
      await reload();
      setRateInputs(r => {
        const next = { ...r };
        delete next[currency.currencyCode];
        return next;
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al guardar la tasa');
    } finally {
      setLoading(l => ({ ...l, [`rate-${currency.id}`]: false }));
    }
  };

  const alreadyAddedCodes = new Set(currencies.map(c => c.currencyCode));

  return (
    <Layout>
      <PageHeader
        title={<><Coins size={24} /> Monedas del hogar</>}
        subtitle="Configurá las monedas que usa tu hogar y sus tasas de cambio"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Agregar moneda
          </button>
        }
      />

      {currencies.length === 0 ? (
        <EmptyState
          emoji="💱"
          title="No hay monedas configuradas"
          description="Agregá una moneda base y luego sumá las que uses habitualmente"
          action={{ label: 'Agregar moneda', onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {currencies.map(currency => {
            const currentRate = rates[currency.currencyCode];
            const rateInput = rateInputs[currency.currencyCode] ?? '';

            return (
              <div
                key={currency.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Currency info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0">
                      {currency.symbol}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-on-surface">
                          {currency.currencyCode}
                        </span>
                        {currency.isBase && (
                          <Badge variant="green">Base</Badge>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant truncate">{currency.currencyName}</p>
                    </div>
                  </div>

                  {/* Rate field — only for non-base currencies */}
                  {!currency.isBase && baseCurrency && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-on-surface-variant whitespace-nowrap">
                        1 {currency.currencyCode} =
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input w-28 text-sm py-1.5"
                        placeholder={currentRate ? String(currentRate) : '0.00'}
                        value={rateInput}
                        onChange={e =>
                          setRateInputs(r => ({ ...r, [currency.currencyCode]: e.target.value }))
                        }
                      />
                      <span className="text-xs text-on-surface-variant">{baseCurrency.currencyCode}</span>
                      <button
                        onClick={() => handleSaveRate(currency)}
                        disabled={loading[`rate-${currency.id}`] || !rateInput}
                        className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {loading[`rate-${currency.id}`] ? '...' : 'Guardar'}
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!currency.isBase && (
                      <button
                        onClick={() => handleSetBase(currency)}
                        disabled={loading[`base-${currency.id}`]}
                        title="Establecer como moneda base"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                      >
                        <Star size={13} />
                        {loading[`base-${currency.id}`] ? '...' : 'Hacer base'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(currency)}
                      disabled={currency.isBase || loading[`del-${currency.id}`]}
                      title={currency.isBase ? 'No se puede eliminar la moneda base' : 'Eliminar moneda'}
                      className="p-1.5 rounded-lg text-outline hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Current rate display */}
                {!currency.isBase && currentRate && !rateInput && (
                  <p className="text-xs text-outline mt-2 pl-13">
                    Tasa actual: 1 {currency.currencyCode} = {currentRate} {baseCurrency?.currencyCode}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Currency Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setAddForm(defaultAddForm); }}
        title="Agregar moneda"
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="label" htmlFor="preset-select">Monedas comunes</label>
            <select
              id="preset-select"
              className="input"
              value={addForm.preset}
              onChange={e => handlePresetChange(e.target.value)}
            >
              <option value="">— Elegir una moneda —</option>
              {COMMON_CURRENCIES.filter(c => !alreadyAddedCodes.has(c.code)).map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-outline-variant" />
            <span className="text-xs text-outline">o ingresá manualmente</span>
            <div className="flex-1 border-t border-outline-variant" />
          </div>

          <div>
            <label className="label" htmlFor="currency-code">Código (ej: CUP)</label>
            <input
              id="currency-code"
              className="input uppercase"
              maxLength={8}
              value={addForm.currencyCode}
              onChange={e => setAddForm(f => ({ ...f, currencyCode: e.target.value.toUpperCase(), preset: '' }))}
              placeholder="USD"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="currency-name">Nombre</label>
            <input
              id="currency-name"
              className="input"
              value={addForm.currencyName}
              onChange={e => setAddForm(f => ({ ...f, currencyName: e.target.value, preset: '' }))}
              placeholder="Dólar Estadounidense"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="currency-symbol">Símbolo</label>
              <input
                id="currency-symbol"
                className="input"
                value={addForm.symbol}
                onChange={e => setAddForm(f => ({ ...f, symbol: e.target.value, preset: '' }))}
                placeholder="$"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="currency-locale">Locale</label>
              <input
                id="currency-locale"
                className="input"
                value={addForm.locale}
                onChange={e => setAddForm(f => ({ ...f, locale: e.target.value, preset: '' }))}
                placeholder="es-CU"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setAddForm(defaultAddForm); }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Agregar
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
