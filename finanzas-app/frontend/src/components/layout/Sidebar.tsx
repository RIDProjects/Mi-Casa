import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import {
  LayoutDashboard, Wallet, Receipt, PiggyBank, TrendingUp,
  CreditCard, DollarSign, Calculator, ShoppingCart, BookOpen,
  BarChart2, Settings, LogOut, Moon, Sun, Users,
  ShieldCheck, Building2, X, Bell,
  Landmark, Layers, TrendingDown, Shield, CalendarClock,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import MiCasaProLogo from '../ui/MiCasaProLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  module?: string;
  adminOnly?: boolean;
  group?: string;
}

const houseNavItems: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard, group: 'General' },
  { href: '/presupuesto',   label: 'Presupuesto',    icon: Wallet, group: 'Día a día' },
  { href: '/transacciones', label: 'Transacciones',  icon: Receipt, group: 'Día a día' },
  { href: '/vencimientos',  label: 'Vencimientos',   icon: CalendarClock, group: 'Día a día' },
  { href: '/metas',         label: 'Ahorros',        icon: PiggyBank, group: 'Ahorro e inversión' },
  { href: '/emergency-fund',label: 'Fondo Emergencia', icon: Shield, group: 'Ahorro e inversión' },
  { href: '/inversiones',   label: 'Inversiones',    icon: TrendingUp, group: 'Ahorro e inversión' },
  { href: '/debts',         label: 'Deudas',         icon: DollarSign,  module: 'debts', group: 'Deudas y crédito' },
  { href: '/creditos',      label: 'Créditos',       icon: Landmark, group: 'Deudas y crédito' },
  { href: '/cuotas',        label: 'Cuotas',         icon: Layers, group: 'Deudas y crédito' },
  { href: '/payoff',        label: 'Liquidar Deudas', icon: TrendingDown, group: 'Deudas y crédito' },
  { href: '/simulador',     label: 'Simulador',      icon: Calculator, group: 'Deudas y crédito' },
  { href: '/tarjetas',      label: 'Tarjetas',       icon: CreditCard, group: 'Deudas y crédito' },
  { href: '/patrimonio',    label: 'Patrimonio',     icon: Calculator, group: 'Ahorro e inversión' },
  { href: '/purchases',     label: 'Lista Compra',   icon: ShoppingCart, module: 'purchases', group: 'Hogar' },
  { href: '/registro-gastos',label: 'Reg. Gastos',   icon: BookOpen,    module: 'purchases', group: 'Hogar' },
  { href: '/analytics',     label: 'Reportes',       icon: BarChart2, group: 'Análisis' },
  { href: '/notificaciones',label: 'Notificaciones', icon: Bell, group: 'Análisis' },
];

const adminNavItems: NavItem[] = [
  { href: '/admin',         label: 'Dashboard',  icon: LayoutDashboard, group: 'Administración' },
  { href: '/admin/users',   label: 'Usuarios',   icon: Users, group: 'Administración' },
  { href: '/admin/roles',   label: 'Roles',      icon: ShieldCheck, group: 'Administración' },
  { href: '/admin/houses',  label: 'Casas',      icon: Building2, group: 'Administración' },
];

interface SidebarProps { isOpen?: boolean; onClose?: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { logout, logoutAll, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleLogoutAll = async () => {
    const revoked = await logoutAll();
    if (!revoked) toast.error('No se pudieron cerrar las demás sesiones. Intenta de nuevo.');
  };

  const isAdminRoute = router.pathname.startsWith('/admin');
  const navItems     = isAdminRoute ? adminNavItems : houseNavItems;

  // Polling liviano (60s) en vez de websockets/push: alcanza para que el
  // numerito de no leídas en el nav no quede pegado toda la sesión sin
  // agregar infraestructura nueva.
  const { data: notifications = [] } = useQuery(
    'notifications',
    () => notificationsAPI.getAll().then(r => r.data),
    { enabled: !isAdminRoute, refetchInterval: 60_000, staleTime: 30_000 },
  );
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: any) => !n.isRead).length
    : 0;

  const groupedNav = Array.from(
    navItems.reduce((acc, item) => {
      const key = item.group ?? 'General';
      acc.set(key, [...(acc.get(key) ?? []), item]);
      return acc;
    }, new Map<string, NavItem[]>()),
  );

  const handleLinkClick = () => onClose?.();

  const NavLink = ({ item }: { item: NavItem }) => {
    if (item.module && !hasPermission(item.module, 'view')) return null;

    const isActive = router.pathname === item.href ||
      (item.href !== '/dashboard' && router.pathname.startsWith(item.href));
    const Icon = item.icon;
    const badgeCount = item.href === '/notificaciones' ? unreadCount : 0;

    return (
      <Link
        href={item.href}
        onClick={handleLinkClick}
        className={clsx(
          'group flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all duration-150 active:scale-[0.98]',
          isActive
            ? 'bg-primary-container/10 text-primary font-semibold ring-1 ring-primary-container/20'
            : 'text-on-surface-variant hover:bg-surface-variant/70 hover:text-on-surface',
        )}
      >
        <span className="relative shrink-0">
          <Icon size={17} className={isActive ? 'text-primary-container dark:text-primary' : 'text-outline group-hover:text-on-surface-variant'} />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <aside className={clsx(
      'w-64 flex flex-col h-full border-r border-border-light',
      'bg-surface-container-lowest dark:bg-surface-container-low',
    )}>
      {/* Logo */}
      <div className="px-5 h-16 border-b border-border-light flex items-center justify-between">
        <MiCasaProLogo size={32} />
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 overflow-y-auto flex-1 space-y-5" aria-label="Principal">
        {groupedNav.map(([group, items]) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-outline">{group}</p>
            <div className="space-y-0.5">
              {items.map(item => <NavLink key={item.href} item={item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-border-light pt-3 space-y-0.5 bg-surface-gray/60 dark:bg-transparent">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <Link
          href="/house-members"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <Users size={16} />
          Miembros del Hogar
        </Link>

        <Link
          href="/configuracion/monedas"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <Settings size={16} />
          Configuración
        </Link>

        <Link
          href="/guia"
          onClick={handleLinkClick}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 text-[12px] font-medium rounded-lg transition-all duration-150',
            router.pathname === '/guia'
              ? 'bg-primary-container/10 text-primary font-semibold'
              : 'text-on-surface-variant hover:bg-surface-variant',
          )}
        >
          <BookOpen size={16} />
          Guía de uso
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:text-danger hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>

        <button
          onClick={handleLogoutAll}
          className="flex items-center gap-3 w-full px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:text-danger hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex relative z-[1] w-64 min-h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/50 animate-backdrop-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-64 flex-col animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
