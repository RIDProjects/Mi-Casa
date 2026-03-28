import Layout from '../../components/layout/Layout';
import { useQuery } from 'react-query';
import { usersAPI } from '../../services/api';
import { housesAPI } from '../../services/api';
import { Users, Home, ShieldCheck, UserCheck, UserX } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0 }).format(Number(n) || 0);

export default function AdminDashboard() {
  const { data: users = [] } = useQuery('adminUsers', () => usersAPI.getAll().then(r => r.data));
  const { data: houses = [] } = useQuery('adminHouses', () => housesAPI.getAll().then(r => r.data));

  const totalUsers = users.length;
  const totalHouses = houses.length;
  const activeUsers = users.filter((u: any) => u.isActive).length;
  const inactiveUsers = users.filter((u: any) => !u.isActive).length;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(totalUsers)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(activeUsers)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Usuarios Inactivos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(inactiveUsers)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Home className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Casas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(totalHouses)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Houses List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Home size={20} className="text-purple-600" />
              Casas ({totalHouses})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {houses.map((house: any) => (
              <div key={house.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <p className="font-medium text-gray-900 dark:text-white">{house.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {house.members?.length || 0} miembros
                </p>
              </div>
            ))}
            {houses.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No hay casas todavía
              </div>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              Usuarios ({totalUsers})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
            {users.map((user: any) => (
              <div key={user.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${user.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {user.house && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Casa: {user.house.name}
                  </p>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No hay usuarios todavía
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
