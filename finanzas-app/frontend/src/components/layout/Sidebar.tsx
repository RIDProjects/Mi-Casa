import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Users, ShieldCheck, CreditCard, Package, ShoppingCart, PiggyBank, LogOut, Moon, Sun, Home, Building2, Cookie, UserPlus, Calculator, Receipt, Target, Landmark, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import clsx from 'clsx';

// Menú para admin global (admin, usuarios, roles, casas)
const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, module: 'admin' },
  { href: '/admin/users', label: 'Usuarios', icon: Users, module: 'users' },
  { href: '/admin/roles', label: 'Roles', icon: ShieldCheck, module: 'roles' },
  { href: '/admin/houses', label: 'Casas', icon: Building2, module: 'houses' },
];

// Menú para usuarios normales (módulos de casa)
const houseNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
  { href: '/debts', label: 'Deudas', icon: CreditCard, module: 'debts' },
  { href: '/inventory', label: 'Inventario', icon: Package, module: 'inventory' },
  { href: '/purchases', label: 'Compras', icon: ShoppingCart, module: 'purchases' },
  { href: '/candy', label: 'Chuches', icon: Cookie, module: 'purchases' },
  { href: '/presupuesto', label: 'Presupuesto', icon: Calculator, module: null },
  { href: '/transacciones', label: 'Transacciones', icon: Receipt, module: null },
  { href: '/metas', label: 'Metas de Ahorro', icon: Target, module: null },
  { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard, module: null },
  { href: '/creditos', label: 'Créditos', icon: Landmark, module: null },
  { href: '/patrimonio', label: 'Patrimonio', icon: TrendingUp, module: null },
  { href: '/simulador', label: 'Simulador', icon: Calculator, module: null },
  { href: '/emergency-fund', label: 'Fondo Emergencia', icon: PiggyBank, module: 'emergency_fund' },
  { href: '/house-members', label: 'Miembros', icon: UserPlus, module: 'house_members' },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, logout, hasPermission, isAdminGlobal } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isGlobalAdmin = isAdminGlobal();
  const userHasAdminRole = user?.roles?.some((r: any) => r.name === 'admin') ?? false;
  const userHasHouseAdminRole = user?.roles?.some((r: any) => r.name === 'house_admin') ?? false;
  const isActuallyAdmin = isGlobalAdmin || userHasAdminRole;
  
  const houseName = (user as any)?.house?.name;

  // Determinar si es ruta de admin
  const isAdminRoute = router.pathname.startsWith('/admin');
  
  // Si es admin global O está en ruta de admin, usar menú de admin
  const showAdminMenu = isActuallyAdmin || isAdminRoute;
  const navItems = showAdminMenu ? adminNavItems : houseNavItems;

  const visibleItems = navItems.filter(item => {
    if (item.href === '/house-members' && !userHasHouseAdminRole) return false;
    return !item.module || hasPermission(item.module, 'view');
  });

  return (
    <aside className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col min-h-screen border-r border-gray-800">
      <div className="p-4 border-b border-gray-700 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <Home size={20} className="text-primary-400" />
          <h1 className="text-lg font-bold text-primary-400">🏠 Mi Casa Pro</h1>
        </div>
        
        {/* House name display for regular users */}
        {!showAdminMenu && houseName && (
          <p className="text-xs text-gray-400 mt-1">Casa: <span className="text-white font-medium">{houseName}</span></p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          // Exact match only - each route is independent
          const isActive = router.pathname === href;
          
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white'
              )}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700 dark:border-gray-800">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 mb-3 text-sm text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </span>
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-white hover:bg-gray-800 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
