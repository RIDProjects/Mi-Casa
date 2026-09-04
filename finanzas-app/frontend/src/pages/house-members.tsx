import Layout from '../components/layout/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { housesAPI, houseInviteAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { Users, Plus, UserCheck, UserX, Loader2, ShieldAlert } from 'lucide-react';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

interface Member {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles?: { id: string; name: string }[];
}

export default function HouseMembersPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const houseId = user?.house?.id;
  const houseName = user?.house?.name;
  const canManage = user?.roles?.some(r => ['admin', 'house_admin'].includes(r.name)) ?? false;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const emptyCreateForm = { name: '', email: '', password: '', role: 'user' };
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const { data: members = [], isLoading, refetch } = useQuery(['houseMembers', houseId], () =>
    houseId ? housesAPI.getMembers(houseId).then(r => r.data) : []
  );

  const toggleMut = useMutation((userId: string) =>
    houseId ? housesAPI.toggleUserActive(houseId, userId) : Promise.reject('No house')
  , {
    onSuccess: () => { toast.success('Usuario actualizado'); refetch(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  const removeMut = useMutation((userId: string) =>
    houseId ? housesAPI.removeUserFromHouse(houseId, userId) : Promise.reject('No house')
  , {
    onSuccess: () => { toast.success('Usuario eliminado'); setMemberToDelete(null); refetch(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  const createMemberMut = useMutation((data: typeof emptyCreateForm) =>
    houseInviteAPI.createMember(houseId, data)
  , {
    onSuccess: () => {
      toast.success('Usuario creado — pasale el email y la contraseña para que inicie sesión');
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      qc.invalidateQueries(['houseMembers', houseId]);
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error al crear el usuario'); },
  });

  const handleRemoveUser = (member: Member) => {
    setMemberToDelete(member);
  };

  const handleToggleActive = (member: Member) => {
    toggleMut.mutate(member.id);
  };

  const isAdminMember = (member: Member) =>
    member.roles?.some(r => ['admin', 'owner', 'superadmin'].includes(r.name.toLowerCase())) ?? false;

  if (!houseId) {
    return (
      <Layout>
        <EmptyState
          emoji="🏠"
          title="Sin casa asignada"
          description="No perteneces a ningún hogar todavía"
        />
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-outline" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={<><Users size={22} /> Miembros de Casa</>}
        subtitle={`Gestiona los usuarios de: ${houseName}`}
        action={
          canManage ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} /> Crear usuario
              </button>
            </div>
          ) : undefined
        }
      />

      {!canManage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <ShieldAlert size={16} className="shrink-0" />
          Solo el administrador de la casa puede crear, activar/desactivar o eliminar miembros. Podés ver la lista, pero no gestionarla.
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Sin miembros en el hogar"
          description="Agregá usuarios para gestionar el acceso a la casa"
          action={canManage ? { label: 'Crear usuario', onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(members as Member[]).map((member) => {
            const isAdmin = isAdminMember(member);
            const initials = (member.name?.[0] || member.email?.[0] || '?').toUpperCase();

            return (
              <div
                key={member.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-on-surface truncate">{member.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{member.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.roles?.map((r) => (
                        <Badge key={r.id} variant="blue">{r.name}</Badge>
                      ))}
                      {member.isActive
                        ? <Badge variant="green"><UserCheck size={10} className="mr-0.5" />Activo</Badge>
                        : <Badge variant="gray"><UserX size={10} className="mr-0.5" />Inactivo</Badge>
                      }
                    </div>
                  </div>
                </div>

                {!isAdmin && canManage && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant">
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        member.isActive
                          ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {member.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => handleRemoveUser(member)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Eliminar del hogar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm(emptyCreateForm); }} title="Crear usuario en el hogar">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={createForm.name}
              onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={createForm.email}
              onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="usuario@email.com"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="text"
              value={createForm.password}
              onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={createForm.role}
              onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
            >
              <option value="user">Miembro</option>
              <option value="house_admin">Administrador de la casa</option>
            </select>
          </div>
          <p className="text-xs text-on-surface-variant">
            Se crea la cuenta al instante — pasale el email y la contraseña a la persona para que inicie sesión.
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={() => createMemberMut.mutate(createForm)}
              disabled={
                createMemberMut.isLoading ||
                !createForm.name.trim() ||
                !createForm.email.trim() ||
                createForm.password.length < 6
              }
              className="btn-primary flex-1"
            >
              {createMemberMut.isLoading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Eliminar del hogar">
        {memberToDelete && (
          <div className="space-y-4">
            <p className="text-on-surface">
              ¿Eliminar a <strong>{memberToDelete.name}</strong> de la casa?
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setMemberToDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => removeMut.mutate(memberToDelete.id)}
                disabled={removeMut.isLoading}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {removeMut.isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </Layout>
  );
}
