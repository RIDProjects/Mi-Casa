import Layout from '../components/layout/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { housesAPI } from '../services/api';
import { usersAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { Users, Edit2, Trash2, Plus, UserCheck, UserX, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';

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
  const houseId = (user as any)?.house?.id;
  const houseName = (user as any)?.house?.name;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Get all users to find by email
  const { data: allUsers = [] } = useQuery('allUsersForHouse', () => 
    usersAPI.getAll().then(r => r.data)
  );

  // Get members of current house
  const { data: members = [], isLoading, refetch } = useQuery(['houseMembers', houseId], () => 
    houseId ? housesAPI.getMembers(houseId).then(r => r.data) : []
  );

  // Toggle user active
  const toggleMut = useMutation((userId: string) => 
    houseId ? housesAPI.toggleUserActive(houseId, userId) : Promise.reject('No house')
  , {
    onSuccess: () => { toast.success('Usuario actualizado'); refetch(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  // Remove user from house
  const removeMut = useMutation((userId: string) => 
    houseId ? housesAPI.removeUserFromHouse(houseId, userId) : Promise.reject('No house')
  , {
    onSuccess: () => { toast.success('Usuario eliminado'); setShowEditModal(false); refetch(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error'); },
  });

  const handleSearchUser = async () => {
    if (!userEmail.trim()) {
      toast.error('Ingresa un email');
      return;
    }
    
    // Find user by email in all users
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
      await housesAPI.addUserToHouse(houseId, { userId: selectedMember.id });
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

  if (!houseId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">No perteneces a una casa</p>
        </div>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 Miembros de Casa</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona los usuarios de: <span className="font-semibold">{houseName}</span></p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Agregar usuario
        </button>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rol</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map((member: Member) => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{member.email}</td>
                <td className="px-4 py-3">
                  {member.isActive ? (
                    <span className="badge-ok flex items-center gap-1 w-fit"><UserCheck size={12} /> Activo</span>
                  ) : (
                    <span className="badge-out flex items-center gap-1 w-fit"><UserX size={12} /> Inactivo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {member.roles?.map((r) => (
                      <span key={r.id} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        {r.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleToggleActive(member)}
                      className={`p-2 rounded-lg transition-colors ${member.isActive ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                      title={member.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {member.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button 
                      onClick={() => handleRemoveUser(member)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Eliminar de la casa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">
            No hay miembros en esta casa
          </div>
        )}
      </div>

      {/* Add User Modal */}
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

      {/* Confirm Add Modal */}
      <Modal isOpen={showEditModal && selectedMember} onClose={() => { setShowEditModal(false); setSelectedMember(null); }} title="Agregar a la casa">
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {selectedMember.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{selectedMember.name}</p>
                <p className="text-sm text-gray-500">{selectedMember.email}</p>
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
