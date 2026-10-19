import { useState, useMemo } from 'react';
import Layout from '../../components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersAPI, rolesAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCheck, UserX, Eye, EyeOff, Search, Crown, Star, Gift, X } from 'lucide-react';

interface UserFormValues {
  name: string; email: string; password: string; roleIds: string[];
}

const PLAN_CONFIG = {
  free:   { label: 'Gratis',  icon: <Gift size={12} />,  badge: 'bg-surface-container text-on-surface-variant ' },
  pro:    { label: 'PRO',     icon: <Star size={12} />,  badge: 'bg-primary-container/15 text-info-ink ' },
  family: { label: 'Familia', icon: <Crown size={12} />, badge: 'bg-primary-container/15 text-info-ink ' },
};

function UserForm({ form, setForm, editUser, showPassword, setShowPassword, onCancel, onSubmit, roles, isLoading }: {
  form: UserFormValues; setForm: (v: UserFormValues) => void; editUser: any;
  showPassword: boolean; setShowPassword: (v: boolean) => void;
  onCancel: () => void; onSubmit: (e: React.FormEvent) => void;
  roles: any[]; isLoading: boolean;
}) {
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
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Roles</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
          {roles.map((role: any) => (
            <label key={role.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.roleIds.includes(role.id)}
                onChange={e => setForm({ ...form, roleIds: e.target.checked ? [...form.roleIds, role.id] : form.roleIds.filter(id => id !== role.id) })} />
              <span className="text-sm font-medium text-on-surface-variant">{role.name}</span>
              <span className="text-xs text-outline">{role.description}</span>
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
  const [showCreate, setShowCreate]     = useState(false);
  const [editUser, setEditUser]         = useState<any>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [form, setForm]                 = useState<UserFormValues>({ name: '', email: '', password: '', roleIds: [] });
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan, setFilterPlan]     = useState<'all' | 'free' | 'pro' | 'family'>('all');
  const [planTarget, setPlanTarget]     = useState<any>(null);
  const [planValue, setPlanValue]       = useState<'free' | 'pro' | 'family'>('free');

  const { data: users = [] } = useQuery('users', () => usersAPI.getAll().then(r => r.data));
  const { data: roles = [] }  = useQuery('roles', () => rolesAPI.getAll().then(r => r.data));

  const createMut = useMutation((data: any) => usersAPI.create(data), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Usuario creado'); setShowCreate(false); resetForm(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al crear'); },
  });
  const updateMut = useMutation((data: any) => usersAPI.update(editUser?.id, data), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Actualizado'); setEditUser(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });
  const deleteMut = useMutation((id: string) => usersAPI.delete(id), {
    onSuccess: () => { qc.invalidateQueries('users'); toast.success('Eliminado'); setDeleteId(null); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error al eliminar'); },
  });
  const toggleMut = useMutation((user: any) => usersAPI.update(user.id, { isActive: !user.isActive }), {
    onSuccess: (_, user) => { qc.invalidateQueries('users'); toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado'); },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error al cambiar el estado'); },
  });
  const planMut = useMutation(({ id, plan }: { id: string; plan: string }) => usersAPI.update(id, { plan }), {
    onSuccess: () => { qc.invalidateQueries('users'); qc.invalidateQueries('adminStats'); toast.success('Plan actualizado'); setPlanTarget(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
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

  const filtered = useMemo(() => {
    return (users as any[]).filter(u => {
      const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.isActive : !u.isActive);
      const matchPlan   = filterPlan === 'all' || (u.plan ?? 'free') === filterPlan;
      return matchSearch && matchStatus && matchPlan;
    });
  }, [users, search, filterStatus, filterPlan]);

  const hasFilters = search || filterStatus !== 'all' || filterPlan !== 'all';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">👥 Usuarios</h1>
          <p className="text-on-surface-variant mt-1">{(users as any[]).length} usuarios registrados</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo usuario
        </button>
      </div>

      {/* ── Barra de búsqueda y filtros ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            className="input pl-9 py-2"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
              <X size={14} />
            </button>
          )}
        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="input py-2 w-auto min-w-36">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as any)}
          className="input py-2 w-auto min-w-36">
          <option value="all">Todos los planes</option>
          <option value="free">Gratis</option>
          <option value="pro">PRO</option>
          <option value="family">Familia</option>
        </select>

        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPlan('all'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface-variant border border-border-light rounded-xl">
            <X size={13} /> Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="bg-panel rounded-xl border border-border-light overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-gray border-b border-border-light">
            <tr>
              {['Usuario', 'Email', 'Plan', 'Roles', 'Último login', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.map((user: any) => {
              const plan = (user.plan ?? 'free') as keyof typeof PLAN_CONFIG;
              const cfg = PLAN_CONFIG[plan];
              const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
              const daysAgo = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null;
              const loginLabel = lastLogin
                ? daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `${daysAgo}d atrás`
                : 'Nunca';
              const loginColor = !lastLogin ? 'text-outline' : daysAgo! > 30 ? 'text-warn-ink ' : 'text-on-surface-variant ';

              return (
                <tr key={user.id} className="hover:bg-surface-gray transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-on-surface">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{user.email}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setPlanTarget(user); setPlanValue(plan); }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.badge} hover:opacity-80 transition-opacity`}
                      title="Cambiar plan"
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((r: any) => (
                        <span key={r.id} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-container/15 text-info-ink">{r.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${loginColor}`}>{loginLabel}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMut.mutate(user)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-success/15 text-ok-ink ' : 'bg-danger/15 text-danger-ink '} hover:opacity-80 transition-opacity`}
                      title={user.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {user.isActive ? <><UserCheck size={12} /> Activo</> : <><UserX size={12} /> Inactivo</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(user)} className="p-1.5 text-info-ink hover:bg-primary-container/10 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteId(user.id)} className="p-1.5 text-danger-ink hover:bg-danger/10 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-outline py-12">
            {hasFilters ? 'Sin resultados para ese filtro' : 'No hay usuarios registrados'}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 bg-surface-gray border-t border-border-light text-xs text-outline">
            Mostrando {filtered.length} de {(users as any[]).length} usuarios
          </div>
        )}
      </div>

      {/* ── Modal crear/editar ── */}
      <Modal isOpen={showCreate || !!editUser} onClose={handleCancel} title={editUser ? 'Editar usuario' : 'Nuevo usuario'}>
        <UserForm form={form} setForm={setForm} editUser={editUser} showPassword={showPassword}
          setShowPassword={setShowPassword} onCancel={handleCancel} onSubmit={handleSubmit}
          roles={roles} isLoading={createMut.isLoading || updateMut.isLoading} />
      </Modal>

      {/* ── Modal cambio de plan ── */}
      <Modal isOpen={!!planTarget} onClose={() => setPlanTarget(null)} title="Cambiar plan" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            Usuario: <strong className="text-on-surface">{planTarget?.name}</strong>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(PLAN_CONFIG) as [string, typeof PLAN_CONFIG.free][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setPlanValue(key as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                  planValue === key
                    ? key === 'free' ? 'border-outline bg-surface-gray text-on-surface-variant '
                    : key === 'pro' ? 'border-primary-container bg-primary-container/10 text-info-ink '
                    : 'border-primary-container bg-primary-container/10 text-info-ink '
                    : 'border-border-light text-on-surface-variant '
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setPlanTarget(null)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => planMut.mutate({ id: planTarget.id, plan: planValue })}
              disabled={planMut.isLoading}
              className="btn-primary"
            >
              {planMut.isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId!)} loading={deleteMut.isLoading}
        message="¿Eliminar este usuario permanentemente?" />
    </Layout>
  );
}
