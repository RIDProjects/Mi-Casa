import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const currentYear = new Date().getFullYear();

interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface MonthData {
  products: Product[];
  montoUSD: number;
  tasaCambio: number;
}

type StorageData = Record<string, MonthData>;

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const defaultProduct = { name: '', quantity: 1, unitPrice: 0 };

export default function PurchasesPage() {
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonth}`);
  const [products, setProducts] = useState<Product[]>([]);
  const [montoUSD, setMontoUSD] = useState<number>(0);
  const [tasaCambio, setTasaCambio] = useState<number>(515);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Product>(defaultProduct);

  useEffect(() => {
    const stored = localStorage.getItem('purchases-data');
    if (stored) {
      const data: StorageData = JSON.parse(stored);
      const monthData = data[selectedMonth];
      if (monthData) {
        setProducts(monthData.products || []);
        setMontoUSD(monthData.montoUSD || 0);
        setTasaCambio(monthData.tasaCambio || 515);
      } else {
        setProducts([]);
        setMontoUSD(0);
        setTasaCambio(515);
      }
    }
  }, [selectedMonth]);

  const saveToStorage = (prods: Product[], monto: number, tasa: number) => {
    const stored = localStorage.getItem('purchases-data');
    const data: StorageData = stored ? JSON.parse(stored) : {};
    data[selectedMonth] = { products: prods, montoUSD: monto, tasaCambio: tasa };
    localStorage.setItem('purchases-data', JSON.stringify(data));
  };

  const handleAddProduct = () => {
    if (!productForm.name.trim()) {
      toast.error('Ingresa el nombre del producto');
      return;
    }
    if (productForm.unitPrice <= 0) {
      toast.error('Ingresa un precio válido');
      return;
    }

    const newProduct: Product = {
      id: generateId(),
      name: productForm.name.trim(),
      quantity: productForm.quantity || 1,
      unitPrice: productForm.unitPrice,
    };

    const newProducts = [...products, newProduct];
    setProducts(newProducts);
    saveToStorage(newProducts, montoUSD, tasaCambio);
    setProductForm(defaultProduct);
    setShowProductModal(false);
    toast.success('Producto agregado');
  };

  const handleEditProduct = () => {
    if (!editProduct) return;
    if (!productForm.name.trim()) {
      toast.error('Ingresa el nombre del producto');
      return;
    }
    if (productForm.unitPrice <= 0) {
      toast.error('Ingresa un precio válido');
      return;
    }

    const newProducts = products.map(p =>
      p.id === editProduct.id
        ? { ...p, name: productForm.name.trim(), quantity: productForm.quantity || 1, unitPrice: productForm.unitPrice }
        : p
    );
    setProducts(newProducts);
    saveToStorage(newProducts, montoUSD, tasaCambio);
    setProductForm(defaultProduct);
    setEditProduct(null);
    setShowProductModal(false);
    toast.success('Producto actualizado');
  };

  const handleDeleteProduct = (id: string) => {
    const newProducts = products.filter(p => p.id !== id);
    setProducts(newProducts);
    saveToStorage(newProducts, montoUSD, tasaCambio);
    toast.success('Producto eliminado');
  };

  const handleOpenEdit = (product: Product) => {
    setProductForm({ id: product.id, name: product.name, quantity: product.quantity, unitPrice: product.unitPrice });
    setEditProduct(product);
    setShowProductModal(true);
  };

  const handleSaveConfig = () => {
    saveToStorage(products, montoUSD, tasaCambio);
    toast.success('Configuración guardada');
  };

  // Cálculos
  const totalRealCUP = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const totalRealUSD = tasaCambio > 0 ? totalRealCUP / tasaCambio : 0;
  
  const presupuestoCUP = montoUSD * tasaCambio;
  const presupuestoUSD = montoUSD;
  const diferenciaCUP = presupuestoCUP - totalRealCUP;
  const diferenciaUSD = presupuestoUSD - totalRealUSD;

  const selectedMonthLabel = MONTHS.find(m => `${currentYear}-${m.value}` === selectedMonth)?.label || '';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛒 Lista de la Compra</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de compras con presupuesto</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="input w-64"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {MONTHS.map(m => (
            <option key={`${currentYear}-${m.value}`} value={`${currentYear}-${m.value}`}>
              {m.label} {currentYear}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📋 LISTA DE LA COMPRA - Izquierda */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📋 Lista de la Compra — {selectedMonthLabel}</h2>
              <button onClick={() => { setProductForm(defaultProduct); setEditProduct(null); setShowProductModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={16} /> Agregar producto
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">🧾 Producto</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">📦 Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💵 Unit. CUP</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💳 Real CUP</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">💲 Real USD</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {products.map((item) => {
                    const realCUP = item.quantity * item.unitPrice;
                    const realUSD = tasaCambio > 0 ? realCUP / tasaCambio : 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">${fmt(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">${fmt(realCUP)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">${fmt(realUSD)}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenEdit(item)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteProduct(item.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-gray-400 dark:text-gray-500">Sin productos en esta lista</td>
                    </tr>
                  )}
                </tbody>
                {products.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-200 dark:border-gray-600">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 text-right">TOTAL:</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">${fmt(totalRealCUP)}</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">${fmt(totalRealUSD)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* 📊 AUXILIARES + CONFIGURACIÓN - Derecha con estructura específica */}
        <div className="space-y-6">
          {/* Card principal con las 3 secciones */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header principal */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white text-center">📊 Auxiliares</h2>
            </div>

            <div className="p-3 space-y-3">
              {/* Sección 1: Presupuesto CUP */}
              <div>
                <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-1">💰 Presupuesto CUP</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${fmt(presupuestoCUP)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Ingreso</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${diferenciaCUP >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${fmt(Math.abs(diferenciaCUP))}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Restante</p>
                  </div>
                </div>
              </div>

              {/* División */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Sección 2: Presupuesto USD */}
              <div>
                <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-1">💲 Presupuesto USD</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${fmt(presupuestoUSD)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Ingreso</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${diferenciaUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${fmt(Math.abs(diferenciaUSD))}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Restante</p>
                  </div>
                </div>
              </div>

              {/* División */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Sección 3: Configuración */}
              <div>
                <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-1">⚙️ Configuración</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input text-center text-sm font-bold py-1"
                      value={montoUSD || ''}
                      onChange={e => setMontoUSD(Number(e.target.value) || 0)}
                      onBlur={handleSaveConfig}
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 text-center">↑ Ingreso USD</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input text-center text-sm font-bold py-1"
                      value={tasaCambio || ''}
                      onChange={e => setTasaCambio(Number(e.target.value) || 0)}
                      onBlur={handleSaveConfig}
                      placeholder="515"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 text-center">↑ Tasa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estado del presupuesto */}
          <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl ${diferenciaUSD >= 0 ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'}`}>
            {diferenciaUSD >= 0 ? (
              <>
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-700 dark:text-green-400">Dentro del presupuesto</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-700 dark:text-red-400">Presupuesto excedido</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar producto */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${showProductModal ? '' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => { setShowProductModal(false); setEditProduct(null); setProductForm(defaultProduct); }}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editProduct ? 'Editar producto' : 'Agregar producto'}
          </h3>
          <form onSubmit={e => { e.preventDefault(); editProduct ? handleEditProduct() : handleAddProduct(); }} className="space-y-4">
            <div>
              <label className="label">Producto</label>
              <input
                className="input"
                value={productForm.name}
                onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Nombre del producto"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={productForm.quantity || ''}
                  onChange={e => setProductForm({ ...productForm, quantity: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Precio Unit. (CUP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={productForm.unitPrice || ''}
                  onChange={e => setProductForm({ ...productForm, unitPrice: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowProductModal(false); setEditProduct(null); setProductForm(defaultProduct); }} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {editProduct ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
