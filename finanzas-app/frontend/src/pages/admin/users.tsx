import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersAPI, rolesAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

interface UserFormProps {
  form: UserFormValues;
  setForm: (v: UserFormValues) => void;
  editUser: any;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  roles: any[];
  isLoading: boolean;
}

function UserForm({
  form,
  setForm,
  editUser,
  showPassword,
  setShowPassword,
  onCancel,
  onSubmit,
  roles,
  isLoading,
}: UserFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Nombre</label>
        <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div>
        <label className="label">Contraseña {editUser && '(dejar vacío para no cambiar)'}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="input pr-10"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            {...(!editUser && { required: true })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Roles</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border dark:border-gray-600 rounded-lg p-3">
          {roles.map((role: any) => (
            <label key={role.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.roleIds.includes(role.id)}
                onChange={e =>
                  setForm({
                    ...form,
                    roleIds: e.target.checked
                      ? [...form.roleIds, role.id]
                      : form.roleIds.filter(id => id !== role.id),
                  })
                }
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.name}</span>
              <span className="text-xs text-gray-400">{role.description}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Guardando...' : editUser ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>({ name: '', email: '', password: '', roleIds: [] });
  const [showPassword, setShowPassword] = useState(false);

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

  const resetForm = () => setForm({ name: '', email: '', password: '', roleIds: [] });

  const handleEdit = (user: any) => {
    setForm({ name: user.name, email: user.email, password: '', roleIds: user.roles?.map((r: any) => r.id) || [] });
    setEditUser(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.password) delete payload.password;
    editUser ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const handleCancel = () => { setShowCreate(false); setEditUser(null); };

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de usuarios del sistema</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b">
            <tr>
              {['Nombre', 'Email', 'Roles', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((r: any) => (
                      <span key={r.id} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">{r.name}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.isActive ? (
                    <span className="badge-ok flex items-center gap-1 w-fit"><UserCheck size={12} /> Activo</span>
                  ) : (
                    <span className="badge-out flex items-center gap-1 w-fit"><UserX size={12} /> Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-700 p-1">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setDeleteId(user.id)} className="text-red-600 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">No hay usuarios registrados</div>
        )}
      </div>

      <Modal
        isOpen={showCreate || !!editUser}
        onClose={handleCancel}
        title={editUser ? 'Editar usuario' : 'Nuevo usuario'}
      >
        <UserForm
          form={form}
          setForm={setForm}
          editUser={editUser}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          roles={roles}
          isLoading={createMut.isLoading || updateMut.isLoading}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId!)}
        loading={deleteMut.isLoading}
        message="¿Eliminar este usuario permanentemente?"
      />
    </Layout>
  );
}
