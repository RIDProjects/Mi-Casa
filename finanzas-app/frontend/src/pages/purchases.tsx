import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { purchasesAPI } from '../services/api';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ChevronRight, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(Number(n)||0);

const defaultItemForm = { name: '', quantity: 1, unitPrice: 0, plannedPriceCUP: 0, plannedPriceUSD: 0, status: 'pending' };
const defaultListForm = { name: '', description: '', budgetCUP: 0, budgetUSD: 0, exchangeRate: 515 };

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [selectedList, setSelectedList] = useState<any>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteListId, setDeleteListId] = useState<string|null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string|null>(null);
  const [listForm, setListForm] = useState<any>(defaultListForm);
  const [itemForm, setItemForm] = useState<any>(defaultItemForm);

  const { data: lists = [] } = useQuery('purchaseLists', () => purchasesAPI.getLists().then(r => r.data));
  const { data: listDetail } = useQuery(['purchaseList', selectedList?.id], () =>
    purchasesAPI.getList(selectedList.id).then(r => r.data), { enabled: !!selectedList?.id });

  const createListMut = useMutation((d: any) => purchasesAPI.createList(d), {
    onSuccess: () => { toast.success('Lista creada'); setShowListModal(false); setListForm(defaultListForm); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('purchaseLists'); },
  });
  const deleteListMut = useMutation((id: string) => purchasesAPI.deleteList(id), {
    onSuccess: () => { toast.success('Lista eliminada'); setDeleteListId(null); if (selectedList?.id === deleteListId) setSelectedList(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries('purchaseLists'); },
  });
  const addItemMut = useMutation((d: any) => purchasesAPI.addItem(selectedList?.id, d), {
    onSuccess: () => { toast.success('Producto agregado'); setShowItemModal(false); setItemForm(defaultItemForm); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries(['purchaseList', selectedList?.id]); qc.invalidateQueries('purchaseLists'); },
  });
  const updateItemMut = useMutation((d: any) => purchasesAPI.updateItem(editItem?.id, d), {
    onSuccess: () => { toast.success('Actualizado'); setEditItem(null); setShowItemModal(false); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries(['purchaseList', selectedList?.id]); qc.invalidateQueries('purchaseLists'); },
  });
  const deleteItemMut = useMutation((id: string) => purchasesAPI.deleteItem(id), {
    onSuccess: () => { toast.success('Eliminado'); setDeleteItemId(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries(['purchaseList', selectedList?.id]); qc.invalidateQueries('purchaseLists'); },
  });
  const toggleStatusMut = useMutation(({ id, status }: any) => purchasesAPI.updateItem(id, { status }), {
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
    onSettled: () => { qc.invalidateQueries(['purchaseList', selectedList?.id]); qc.invalidateQueries('purchaseLists'); },
  });

  const handleEditItem = (item: any) => {
    setItemForm({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, plannedPriceCUP: item.plannedPriceCUP, plannedPriceUSD: item.plannedPriceUSD, status: item.status });
    setEditItem(item);
    setShowItemModal(true);
  };

  const detail = listDetail || selectedList;
  const summary = detail?.summary;

  const statusColor = (s: string) => ({ ok: 'text-success-600 bg-success-50', ajustado: 'text-warning-600 bg-warning-50', excedido: 'text-danger-600 bg-danger-50' })[s?.toLowerCase().includes('justo') ? 'ok' : s?.includes('Ajustado') ? 'ajustado' : 'excedido'] || 'text-gray-600 bg-gray-50';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-gray-900">🛒 Listas de Compra</h1><p className="text-gray-500 mt-1">Gestión de compras con presupuesto en CUP y USD</p></div>
        <button onClick={() => setShowListModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18}/>Nueva lista</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists sidebar */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Listas</h2>
          {lists.map((list: any) => (
            <div key={list.id} onClick={() => setSelectedList(list)}
              className={`card cursor-pointer transition-all hover:shadow-md p-4 ${selectedList?.id === list.id ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg text-primary-600"><ShoppingCart size={16}/></div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{list.name}</p>
                    <p className="text-xs text-gray-400">{list.items?.length || 0} productos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setDeleteListId(list.id); }} className="text-danger-500 hover:text-danger-700 p-1"><Trash2 size={14}/></button>
                  <ChevronRight size={16} className="text-gray-400"/>
                </div>
              </div>
              {list.summary && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                  <span className="text-gray-500">Real CUP: <strong className="text-gray-800">${fmt(list.summary.totalRealCUP)}</strong></span>
                  <span className="text-gray-500">Real USD: <strong className="text-gray-800">${fmt(list.summary.totalRealUSD)}</strong></span>
                </div>
              )}
            </div>
          ))}
          {lists.length === 0 && <div className="card text-center text-gray-400 py-8"><p>Sin listas aún</p></div>}
        </div>

        {/* List detail */}
        <div className="lg:col-span-2">
          {selectedList && detail ? (
            <>
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{detail.name}</h2>
                  <button onClick={() => setShowItemModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16}/>Agregar producto</button>
                </div>

                {summary && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">Real CUP</p>
                      <p className="font-bold text-gray-900 text-lg">${fmt(summary.totalRealCUP)}</p>
                      <p className="text-xs text-gray-400">Plan: ${fmt(summary.totalPlanCUP)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">Real USD</p>
                      <p className="font-bold text-gray-900 text-lg">${fmt(summary.totalRealUSD)}</p>
                      <p className="text-xs text-gray-400">Plan: ${fmt(summary.totalPlanUSD)}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${statusColor(summary.statusCUP)}`}>
                      <p className="text-xs opacity-75">Restante CUP</p>
                      <p className="font-bold text-lg">${fmt(summary.remainingCUP)}</p>
                      <p className="text-xs font-medium">{summary.statusCUP}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>✅ Comprados: <strong>{summary?.purchased||0}</strong></span>
                  <span>🕐 Pendientes: <strong>{summary?.pending||0}</strong></span>
                  <span>Tasa USD: <strong>{detail.exchangeRate}</strong></span>
                </div>
              </div>

              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Producto','Cant.','P.Unit','Real CUP','Real USD','Plan CUP','Estado','Acc.'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(detail.items||[]).map((item: any) => (
                      <tr key={item.id} className={`hover:bg-gray-50 ${item.status==='purchased'?'opacity-60':''}`}>
                        <td className="px-3 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-3 py-3 text-gray-600">{item.quantity}</td>
                        <td className="px-3 py-3 text-gray-600">${fmt(item.unitPrice)}</td>
                        <td className="px-3 py-3 font-medium">${fmt(item.realPriceCUP)}</td>
                        <td className="px-3 py-3 text-gray-600">${fmt(item.realPriceUSD)}</td>
                        <td className="px-3 py-3 text-gray-500">{item.plannedPriceCUP>0?`$${fmt(item.plannedPriceCUP)}`:'-'}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => toggleStatusMut.mutate({id:item.id, status: item.status==='purchased'?'pending':'purchased'})}
                            className={`flex items-center gap-1 text-xs font-medium ${item.status==='purchased'?'text-success-600':'text-gray-400 hover:text-success-600'}`}>
                            {item.status==='purchased'?<><CheckCircle size={14}/>Comprado</>:<><XCircle size={14}/>Pendiente</>}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleEditItem(item)} className="text-primary-500 hover:text-primary-700 p-1"><Edit2 size={14}/></button>
                            <button onClick={() => setDeleteItemId(item.id)} className="text-danger-500 hover:text-danger-700 p-1"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(detail.items||[]).length===0 && (
                      <tr><td colSpan={8} className="text-center text-gray-400 py-12">Sin productos en esta lista</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <ShoppingCart size={40} className="mx-auto mb-3 opacity-30"/>
                <p>Selecciona una lista para ver sus productos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List create modal */}
      <Modal isOpen={showListModal} onClose={() => setShowListModal(false)} title="Nueva lista de compra">
        <form onSubmit={e => { e.preventDefault(); createListMut.mutate(listForm); }} className="space-y-4">
          <div><label className="label">Nombre de la lista</label><input className="input" value={listForm.name} onChange={e => setListForm({...listForm,name:e.target.value})} required /></div>
          <div><label className="label">Descripción (opcional)</label><input className="input" value={listForm.description} onChange={e => setListForm({...listForm,description:e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Presupuesto CUP</label><input type="number" className="input" value={listForm.budgetCUP} onChange={e => setListForm({...listForm,budgetCUP:Number(e.target.value)})} /></div>
            <div><label className="label">Presupuesto USD</label><input type="number" className="input" value={listForm.budgetUSD} onChange={e => setListForm({...listForm,budgetUSD:Number(e.target.value)})} /></div>
          </div>
          <div><label className="label">Tasa de cambio (CUP/USD)</label><input type="number" className="input" value={listForm.exchangeRate} onChange={e => setListForm({...listForm,exchangeRate:Number(e.target.value)})} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowListModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createListMut.isLoading} className="btn-primary">{createListMut.isLoading?'Creando...':'Crear lista'}</button>
          </div>
        </form>
      </Modal>

      {/* Item modal */}
      <Modal isOpen={showItemModal || !!editItem} onClose={() => { setShowItemModal(false); setEditItem(null); setItemForm(defaultItemForm); }} title={editItem ? 'Editar producto' : 'Agregar producto'}>
        <form onSubmit={e => { e.preventDefault(); editItem ? updateItemMut.mutate(itemForm) : addItemMut.mutate(itemForm); }} className="space-y-4">
          <div><label className="label">Producto</label><input className="input" value={itemForm.name} onChange={e => setItemForm({...itemForm,name:e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Cantidad</label><input type="number" step="0.01" min="0" className="input" value={itemForm.quantity} onChange={e => setItemForm({...itemForm,quantity:Number(e.target.value)})} /></div>
            <div><label className="label">Precio unitario (CUP)</label><input type="number" step="0.01" min="0" className="input" value={itemForm.unitPrice} onChange={e => setItemForm({...itemForm,unitPrice:Number(e.target.value)})} /></div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-600">
            💡 El precio real CUP se calcula automáticamente: cantidad × precio unitario
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Plan CUP (objetivo)</label><input type="number" step="0.01" className="input" value={itemForm.plannedPriceCUP} onChange={e => setItemForm({...itemForm,plannedPriceCUP:Number(e.target.value)})} /></div>
            <div><label className="label">Plan USD (objetivo)</label><input type="number" step="0.01" className="input" value={itemForm.plannedPriceUSD} onChange={e => setItemForm({...itemForm,plannedPriceUSD:Number(e.target.value)})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowItemModal(false); setEditItem(null); setItemForm(defaultItemForm); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={addItemMut.isLoading || updateItemMut.isLoading} className="btn-primary">
              {addItemMut.isLoading || updateItemMut.isLoading ? 'Guardando...' : editItem ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteListId} onClose={() => setDeleteListId(null)} onConfirm={() => deleteListMut.mutate(deleteListId!)} loading={deleteListMut.isLoading} message="¿Eliminar esta lista y todos sus productos?" />
      <ConfirmDialog isOpen={!!deleteItemId} onClose={() => setDeleteItemId(null)} onConfirm={() => deleteItemMut.mutate(deleteItemId!)} loading={deleteItemMut.isLoading} message="¿Eliminar este producto?" />
    </Layout>
  );
}