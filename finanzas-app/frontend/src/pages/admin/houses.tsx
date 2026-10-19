import Layout from '../../components/layout/Layout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { housesAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageHeader from '../../components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Building2, Users, Edit2, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';

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
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

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
      setMemberToRemove(null);
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

  const handleRemoveUser = (member: Member) => {
    setMemberToRemove(member);
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
      <PageHeader title="Gestión de casas" subtitle="Administra las casas del sistema" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map((house: any) => (
          <div key={house.id} className="bg-panel rounded-2xl shadow-soft border border-border-light overflow-hidden transition-shadow hover:shadow-lift">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="icon-blue !p-2.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">{house.name}</h3>
                    <p className="font-body-default text-on-surface-variant">
                      {house.members?.length || 0} {(house.members?.length || 0) === 1 ? 'miembro' : 'miembros'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewMembers(house)}
                  className="btn-secondary flex-1 !min-h-[38px]"
                >
                  <Users size={16} />
                  Miembros
                </button>
                <button
                  onClick={() => handleEditName(house)}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg transition-colors"
                  aria-label="Editar nombre"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-surface-gray border-t border-border-light">
              <p className="text-xs text-on-surface-variant">
                Creada: {new Date(house.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        ))}

        {houses.length === 0 && (
          <div className="col-span-full">
            <div className="bg-panel rounded-2xl shadow-soft border border-border-light p-12 text-center">
              <div className="icon-blue !p-4 !rounded-2xl mb-4 inline-flex"><Building2 size={32} /></div>
              <p className="text-on-surface-variant">No hay casas todavía</p>
            </div>
          </div>
        )}
      </div>

      {/* Members Modal */}
      <Modal
        isOpen={showMembersModal && !!selectedHouse}
        onClose={() => setShowMembersModal(false)}
        title={`Miembros de ${selectedHouse?.name ?? ''}`}
      >
        {selectedHouse?.members?.length > 0 ? (
          <ul className="space-y-3">
            {selectedHouse.members.map((member: Member) => (
              <li key={member.id} className="flex items-center justify-between gap-3 p-3.5 bg-surface-gray border border-border-light rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    member.isActive ? 'bg-success/15 text-ok-ink' : 'bg-surface-variant text-on-surface-variant'
                  }`}>
                    {member.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">{member.name}</p>
                    <p className="text-sm text-on-surface-variant truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleUser(member.id)}
                    disabled={toggleUserMut.isLoading}
                    className={`p-2 rounded-lg transition-colors ${
                      member.isActive ? 'text-danger-ink hover:bg-danger/10' : 'text-ok-ink hover:bg-success/10'
                    }`}
                    title={member.isActive ? 'Desactivar' : 'Activar'}
                    aria-label={member.isActive ? 'Desactivar miembro' : 'Activar miembro'}
                  >
                    {member.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>
                  <button
                    onClick={() => handleRemoveUser(member)}
                    disabled={removeUserMut.isLoading}
                    className="p-2 text-danger-ink hover:bg-danger/10 rounded-lg transition-colors"
                    title="Eliminar de la casa"
                    aria-label="Eliminar de la casa"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-on-surface-variant py-8">Esta casa no tiene miembros</p>
        )}
      </Modal>

      {/* Edit Name Modal */}
      <Modal isOpen={editNameModal && !!selectedHouse} onClose={() => setEditNameModal(false)} title="Editar casa" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="house-name">Nombre de la casa</label>
            <input id="house-name" className="input" value={houseName} onChange={(e) => setHouseName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditNameModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveName} disabled={updateHouseMut.isLoading} className="btn-primary">
              {updateHouseMut.isLoading && <Loader2 size={16} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Remove Member */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => removeUserMut.mutate({ userId: memberToRemove!.id })}
        loading={removeUserMut.isLoading}
        title="Eliminar del hogar"
        message={`¿Eliminar a ${memberToRemove?.name ?? ''} de esta casa?`}
      />
    </Layout>
  );
}
