import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Users, ShieldCheck, CreditCard, ShoppingCart,
  PiggyBank, LogOut, Moon, Sun, Home, Building2, UserPlus,
  Calculator, Receipt, Target, Landmark, TrendingUp, TrendingDown, BookOpen,
  BarChart2, Bell, RefreshCw, Calendar, X, Coins,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import clsx from 'clsx';

const adminNavItems = [
  { href: '/admin',        label: 'Dashboard', icon: LayoutDashboard, module: 'admin' },
  { href: '/admin/users',  label: 'Usuarios',  icon: Users,           module: 'users' },
  { href: '/admin/roles',  label: 'Roles',     icon: ShieldCheck,     module: 'roles' },
  { href: '/admin/houses', label: 'Casas',     icon: Building2,       module: 'houses' },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  module: string | null;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const houseNavGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: null },
    ],
  },
  {
    label: 'Planificación',
    items: [
      { href: '/presupuesto',   label: 'Presupuesto',    icon: Calculator, module: null },
      { href: '/transacciones', label: 'Transacciones',  icon: Receipt,    module: null },
      { href: '/recurrentes',   label: 'Recurrentes',    icon: RefreshCw,  module: null },
      { href: '/metas',         label: 'Metas de Ahorro',icon: Target,     module: null },
      { href: '/analytics',     label: 'Analíticas',     icon: BarChart2,  module: null },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/cuotas',      label: 'Cuotas',           icon: Receipt,      module: null },
      { href: '/vencimientos',label: 'Vencimientos',     icon: Calendar,     module: null },
      { href: '/payoff',      label: 'Estrategia Deuda', icon: TrendingDown, module: null },
    ],
  },
  {
    label: 'Deuda',
    items: [
      { href: '/debts',    label: 'Deudas',   icon: CreditCard, module: 'debts' },
      { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard, module: null },
      { href: '/creditos', label: 'Créditos', icon: Landmark,   module: null },
    ],
  },
  {
    label: 'Patrimonio',
    items: [
      { href: '/patrimonio',     label: 'Patrimonio',      icon: TrendingUp, module: null },
      { href: '/inversiones',    label: 'Inversiones',     icon: TrendingUp, module: null },
      { href: '/simulador',      label: 'Simulador',       icon: Calculator, module: null },
      { href: '/emergency-fund', label: 'Fondo Emergencia',icon: PiggyBank,  module: 'emergency_fund' },
    ],
  },
  {
    label: 'Hogar',
    items: [
      { href: '/purchases',       label: 'Lista Compra',  icon: ShoppingCart, module: 'purchases' },
      { href: '/registro-gastos', label: 'Reg. Gastos',   icon: BookOpen,     module: 'purchases' },
      { href: '/house-members',   label: 'Miembros',      icon: UserPlus,     module: 'house_members' },
    ],
  },
  {
    label: 'Notificaciones',
    items: [
      { href: '/notificaciones', label: 'Notificaciones', icon: Bell, module: null },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { href: '/configuracion/monedas', label: 'Monedas', icon: Coins, module: null },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { user, logout, hasPermission, isAdminGlobal } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isGlobalAdmin = isAdminGlobal();
  const userHasAdminRole = user?.roles?.some((r: any) => r.name === 'admin') ?? false;
  const userHasHouseAdminRole = user?.roles?.some((r: any) => r.name === 'house_admin') ?? false;

  const houseName = user?.house?.name;
  const isAdminRoute = router.pathname.startsWith('/admin');
  const showAdminMenu = isAdminRoute;

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className="w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Home size={20} className="text-primary-400" />
            <h1 className="text-lg font-bold text-primary-400">Mi Casa Pro</h1>
          </div>
          {!showAdminMenu && houseName && (
            <p className="text-xs text-gray-400 mt-1">
              Casa: <span className="text-white font-medium">{houseName}</span>
            </p>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {showAdminMenu ? (
          <div className="space-y-0.5">
            {adminNavItems.map(({ href, label, icon: Icon, module }) => {
              if (module && !hasPermission(module, 'view')) return null;
              const isActive = router.pathname === href;
              return (
                <Link key={href} href={href} onClick={handleLinkClick}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}>
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        ) : (
          houseNavGroups.map((group, gi) => {
            const visibleItems = group.items.filter(item => {
              if (item.href === '/house-members' && !userHasHouseAdminRole) return false;
              return !item.module || hasPermission(item.module, 'view');
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={gi}>
                {group.label && (
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map(({ href, label, icon: Icon }) => {
                    const isActive = router.pathname === href;
                    return (
                      <Link key={href} href={href} onClick={handleLinkClick}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 hover:text-white'
                        )}>
                        <Icon size={16} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-gray-700 dark:border-gray-800">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 mb-3 text-sm text-gray-300 dark:text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
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
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 min-h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-64 flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
