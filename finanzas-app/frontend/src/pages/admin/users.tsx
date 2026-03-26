import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersAPI, rolesAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsappNumber: '', roleIds: [] as string[] });

  const { data: users = [] } = useQuery('users', () => usersAPI.getAll().then(r => r.data));
  const { data: roles = [] } = useQuery('roles', () => rolesAPI.getAll().then(r => r.data));

  const createMut = useMutation((data: any) => usersAPI.create(data), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Usuario creado'); setShowCreate(false); resetForm(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al crear'); },
  });

  const updateMut = useMutation((data: any) => usersAPI.update(editUser?.id, data), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Usuario actualizado'); setEditUser(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al actualizar'); },
  });

  const deleteMut = useMutation((id: string) => usersAPI.delete(id), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Usuario eliminado'); setDeleteId(null); },
  });

  const resetForm = () => setForm({ name: '', email: '', password: '', whatsappNumber: '', roleIds: [] });

  const handleEdit = (user: any) => {
    setForm({ name: user.name, email: user.email, password: '', whatsappNumber: user.whatsappNumber || '', roleIds: user.roles?.map(r => r.id) || [] });
    setEditUser(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    editUser ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const UserForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="label">Nombre</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
      <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
      <div><label className="label">Contraseña {editUser && '(dejar vacío para no cambiar)'}</label>
        <input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} {...(!editUser && { required: true })} /></div>
      <div><label className="label">WhatsApp (para alertas)</label><input className="input" value={form.whatsappNumber} onChange={e => setForm({...form, whatsappNumber: e.target.value})} placeholder="+5491112345678" /></div>
      <div>
        <label className="label">Roles</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
          {roles.map((role: any) => (
            <label key={role.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.roleIds.includes(role.id)}
                onChange={e => setForm({...form, roleIds: e.target.checked ? [...form.roleIds, role.id] : form.roleIds.filter(id => id !== role.id)})} />
              <span className="text-sm font-medium">{role.name}</span>
              <span className="text-xs text-gray-400">{role.description}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => { setShowCreate(false); setEditUser(null); }} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={createMut.isLoading || updateMut.isLoading} className="btn-primary">
          {createMut.isLoading || updateMut.isLoading ? 'Guardando...' : editUser ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-bold text-gray-900">👥 Usuarios</h1><p className="text-gray-500 mt-1">Gestión de usuarios del sistema</p></div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo usuario
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nombre', 'Email', 'Roles', 'Estado', 'WhatsApp', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((r: any) => (
                      <span key={r.id} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">{r.name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.isActive ? <span className="badge-ok flex items-center gap-1 w-fit"><UserCheck size={12}/> Activo</span>
                    : <span className="badge-out flex items-center gap-1 w-fit"><UserX size={12}/> Inactivo</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.whatsappNumber || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(user)} className="text-primary-600 hover:text-primary-700 p-1"><Edit2 size={16}/></button>
                    <button onClick={() => setDeleteId(user.id)} className="text-danger-600 hover:text-danger-700 p-1"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-gray-400 py-12">No hay usuarios registrados</p>}
      </div>

      <Modal isOpen={showCreate || !!editUser} onClose={() => { setShowCreate(false); setEditUser(null); }}
        title={editUser ? 'Editar usuario' : 'Nuevo usuario'}>
        <UserForm />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId!)}
        loading={deleteMut.isLoading} message="¿Eliminar este usuario permanentemente?" />
    </Layout>
  );
}