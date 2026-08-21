import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { rolesAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';

const MODULES = ['users', 'roles', 'debts', 'purchases', 'emergency_fund'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];
const moduleLabels: Record<string, string> = {
  users: 'Usuarios', roles: 'Roles', debts: 'Deudas',
  purchases: 'Compras', emergency_fund: 'Fondo Emergencia',
};

export default function RolesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissionIds: [] as string[] });

  const { data: roles = [] } = useQuery('roles', () => rolesAPI.getAll().then(r => r.data));
  const { data: permissions = [] } = useQuery('permissions', () => rolesAPI.getPermissions().then(r => r.data));

  const createMut = useMutation((d: any) => rolesAPI.create(d), {
    onSuccess: () => { qc.invalidateQueries('roles'); toast.success('Rol creado'); setShowModal(false); },
  });
  const updateMut = useMutation((d: any) => rolesAPI.update(editRole?.id, d), {
    onSuccess: () => { qc.invalidateQueries('roles'); toast.success('Rol actualizado'); setEditRole(null); setShowModal(false); },
  });
  const deleteMut = useMutation((id: string) => rolesAPI.delete(id), {
    onSuccess: () => { qc.invalidateQueries('roles'); toast.success('Rol eliminado'); setDeleteId(null); },
  });

  const togglePerm = (permId: string) => {
    setForm(f => ({
      ...f,
      permissionIds: f.permissionIds.includes(permId)
        ? f.permissionIds.filter(id => id !== permId)
        : [...f.permissionIds, permId],
    }));
  };

  const toggleModule = (mod: string) => {
    const modPerms = permissions.filter(p => p.module === mod).map(p => p.id);
    const allSelected = modPerms.every(id => form.permissionIds.includes(id));
    setForm(f => ({
      ...f,
      permissionIds: allSelected
        ? f.permissionIds.filter(id => !modPerms.includes(id))
        : Array.from(new Set([...f.permissionIds, ...modPerms])),
    }));
  };

  const handleEdit = (role: any) => {
    setForm({ name: role.name, description: role.description || '', permissionIds: role.permissions?.map(p => p.id) || [] });
    setEditRole(role);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editRole ? updateMut.mutate(form) : createMut.mutate(form);
  };

  const getPermId = (mod: string, action: string) =>
    permissions.find(p => p.module === mod && p.action === action)?.id;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface">🛡️ Roles y Permisos</h1>
          <p className="text-on-surface-variant mt-1">Control de acceso basado en roles (RBAC)</p>
        </div>
        <button onClick={() => { setForm({ name: '', description: '', permissionIds: [] }); setEditRole(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo rol
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role: any) => (
          <div key={role.id} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{role.name}</p>
                  <p className="text-xs text-outline">{role.description}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(role)} className="text-primary hover:text-blue-700 p-1">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setDeleteId(role.id)} className="text-danger hover:text-red-700 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {role.permissions?.slice(0, 8).map((p: any) => (
                <span key={p.id} className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">
                  {p.module}:{p.action}
                </span>
              ))}
              {role.permissions?.length > 8 && <span className="text-xs text-outline">+{role.permissions.length - 8} más</span>}
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="col-span-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant text-center text-outline py-12">
            No hay roles creados
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditRole(null); }} title={editRole ? 'Editar rol' : 'Nuevo rol'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del rol</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Permisos por módulo</label>
            <div className="border border-outline-variant rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-on-surface-variant">Módulo</th>
                    {ACTIONS.map(a => <th key={a} className="px-3 py-2 text-center font-medium text-on-surface-variant capitalize">{a}</th>)}
                    <th className="px-3 py-2 text-center font-medium text-on-surface-variant">Todos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {MODULES.map(mod => (
                    <tr key={mod} className="hover:bg-surface-gray">
                      <td className="px-3 py-2 font-medium text-on-surface">{moduleLabels[mod]}</td>
                      {ACTIONS.map(action => {
                        const pid = getPermId(mod, action);
                        return (
                          <td key={action} className="px-3 py-2 text-center">
                            {pid && <input type="checkbox" checked={form.permissionIds.includes(pid)}
                              onChange={() => togglePerm(pid)} className="cursor-pointer accent-blue-600" />}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" onChange={() => toggleModule(mod)}
                          checked={permissions.filter(p => p.module === mod).every(p => form.permissionIds.includes(p.id))}
                          className="cursor-pointer accent-blue-600" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditRole(null); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
              {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editRole ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading} />
    </Layout>
  );
}
