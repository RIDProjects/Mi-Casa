import Layout from '../../components/layout/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { housesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Building2, Users, Edit2, Trash2, Plus, X, UserCheck, UserX, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roles?: { name: string }[];
}

export default function AdminHouses() {
  const qc = useQueryClient();

  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [editNameModal, setEditNameModal] = useState(false);
  const [houseName, setHouseName] = useState('');

  const { data: houses = [], isLoading } = useQuery('adminHouses', () => housesAPI.getAll().then(r => r.data));

  // Mutations - exact pattern from users.tsx
  const updateHouseMut = useMutation((vars: any) => housesAPI.updateHouse(selectedHouse?.id, vars), {
    onSuccess: () => {
      toast.success('Nombre actualizado');
      qc.invalidateQueries('adminHouses');
      setEditNameModal(false);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al actualizar'); },
  });

  const toggleUserMut = useMutation((vars: any) => housesAPI.toggleUserActive(selectedHouse?.id, vars.userId), {
    onSuccess: () => {
      toast.success('Usuario actualizado');
      qc.invalidateQueries('adminHouses');
      // Refresh members list
      if (selectedHouse) {
        housesAPI.getMembers(selectedHouse.id).then(res => {
          setSelectedHouse({ ...selectedHouse, members: res.data });
        });
      }
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al actualizar'); },
  });

  const removeUserMut = useMutation((vars: any) => housesAPI.removeUserFromHouse(selectedHouse?.id, vars.userId), {
    onSuccess: () => {
      toast.success('Usuario eliminado de la casa');
      qc.invalidateQueries('adminHouses');
      setShowMembersModal(false);
    },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Error al eliminar'); },
  });

  const handleViewMembers = (house: any) => {
    setSelectedHouse(house);
    setShowMembersModal(true);
  };

  const handleEditName = (house: any) => {
    setSelectedHouse(house);
    setHouseName(house.name);
    setEditNameModal(true);
  };

  const handleSaveName = () => {
    if (!houseName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    updateHouseMut.mutate({ name: houseName });
  };

  const handleToggleUser = (userId: string) => {
    toggleUserMut.mutate({ userId });
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    if (confirm(`¿Eliminar a ${userName} de esta casa?`)) {
      removeUserMut.mutate({ userId });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-on-surface-variant">Cargando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-page-title text-page-title text-on-surface">Gestión de Casas</h1>
          <p className="text-on-surface-variant mt-1">Administra las casas del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((house: any) => (
          <div key={house.id} className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">{house.name}</h3>
                    <p className="font-body-default text-on-surface-variant">
                      {house.members?.length || 0} miembros
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewMembers(house)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-primary rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
                >
                  <Users size={16} />
                  Miembros
                </button>
                <button
                  onClick={() => handleEditName(house)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant">
              <p className="text-xs text-on-surface-variant">
                Creada: {new Date(house.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        ))}

        {houses.length === 0 && (
          <div className="col-span-full">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-12 text-center">
              <Building2 size={48} className="mx-auto text-outline mb-4" />
              <p className="text-on-surface-variant">No hay casas todavía</p>
            </div>
          </div>
        )}
      </div>

      {/* Members Modal */}
      {showMembersModal && selectedHouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-on-surface">
                  Miembros de {selectedHouse.name}
                </h3>
              </div>
              <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-surface-variant rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {selectedHouse.members?.length > 0 ? (
                <div className="space-y-3">
                  {selectedHouse.members.map((member: Member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          member.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          {member.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{member.name}</p>
                          <p className="font-body-default text-on-surface-variant">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleUser(member.id)}
                          disabled={toggleUserMut.isLoading}
                          className={`p-2 rounded-lg transition-colors ${
                            member.isActive
                              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={member.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {member.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                        <button
                          onClick={() => handleRemoveUser(member.id, member.name)}
                          disabled={removeUserMut.isLoading}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar de la casa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-on-surface-variant py-8">
                  Esta casa no tiene miembros
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {editNameModal && selectedHouse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant">
              <h3 className="text-lg font-semibold text-on-surface">
                Editar Casa
              </h3>
              <button onClick={() => setEditNameModal(false)} className="p-2 hover:bg-surface-variant rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre de la casa</label>
                <input
                  className="input"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setEditNameModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={updateHouseMut.isLoading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {updateHouseMut.isLoading && <Loader2 size={16} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
