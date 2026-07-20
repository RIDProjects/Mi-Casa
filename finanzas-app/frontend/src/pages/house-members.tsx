import Layout from '../components/layout/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { housesAPI, houseInviteAPI } from '../services/api';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { Users, Trash2, Plus, UserCheck, UserX, Loader2 } from 'lucide-react';
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });

  const { data: allUsers = [] } = useQuery('allUsersForHouse', () =>
    usersAPI.getAll().then(r => r.data)
  );

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
    onSuccess: () => { toast.success('Usuario eliminado'); setShowEditModal(false); refetch(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  const inviteMut = useMutation(({ email, role }: { email: string; role: string }) =>
    houseInviteAPI.invite(houseId, email, role)
  , {
    onSuccess: () => {
      toast.success('Miembro agregado');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member' });
      qc.invalidateQueries(['houseMembers', houseId]);
    },
    onError: (e: any) => { toast.error(e?.response?.data?.message || 'Error al invitar'); },
  });

  const handleSearchUser = async () => {
    if (!userEmail.trim()) {
      toast.error('Ingresa un email');
      return;
    }
    const foundUser = allUsers.find((u: any) => u.email.toLowerCase() === userEmail.toLowerCase());
    if (foundUser) {
      setSelectedMember(foundUser);
      setShowAddModal(false);
      setShowEditModal(true);
      setUserEmail('');
    } else {
      toast.error('Usuario no encontrado');
    }
  };

  const handleAddUserToHouse = async () => {
    if (!selectedMember || !houseId) return;
    try {
      await (housesAPI as any).addUserToHouse(houseId, { userId: selectedMember.id });
      toast.success(`${selectedMember.name} agregado a la casa`);
      setShowEditModal(false);
      setSelectedMember(null);
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al agregar usuario');
    }
  };

  const handleRemoveUser = (member: Member) => {
    if (confirm(`¿Eliminar a ${member.name} de la casa?`)) {
      removeMut.mutate(member.id);
    }
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
          <Loader2 className="animate-spin text-gray-400" />
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus size={18} /> Invitar por email
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> Agregar usuario
            </button>
          </div>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Sin miembros en el hogar"
          description="Agregá usuarios para gestionar el acceso a la casa"
          action={{ label: 'Agregar usuario', onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(members as Member[]).map((member) => {
            const isAdmin = isAdminMember(member);
            const initials = (member.name?.[0] || member.email?.[0] || '?').toUpperCase();

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
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

                {!isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
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

      <Modal isOpen={showInviteModal} onClose={() => { setShowInviteModal(false); setInviteForm({ email: '', role: 'member' }); }} title="Invitar miembro al hogar">
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={inviteForm.email}
              onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="usuario@email.com"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={inviteForm.role}
              onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <option value="member">Miembro</option>
              <option value="admin">Administrador</option>
              <option value="viewer">Solo lectura</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={() => inviteMut.mutate(inviteForm)}
              disabled={inviteMut.isLoading || !inviteForm.email.trim()}
              className="btn-primary flex-1"
            >
              {inviteMut.isLoading ? 'Invitando...' : 'Invitar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setUserEmail(''); }} title="Agregar usuario a la casa">
        <div className="space-y-4">
          <div>
            <label className="label">Buscar por email</label>
            <input
              className="input"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="usuario@email.com"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
            />
          </div>
          <button
            onClick={handleSearchUser}
            className="btn-primary w-full"
            disabled={loadingEmail}
          >
            {loadingEmail ? <Loader2 className="animate-spin mx-auto" /> : 'Buscar usuario'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showEditModal && !!selectedMember} onClose={() => { setShowEditModal(false); setSelectedMember(null); }} title="Agregar a la casa">
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {(selectedMember.name?.[0] || selectedMember.email?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selectedMember.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedMember.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleAddUserToHouse} className="btn-primary flex-1">Agregar</button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
