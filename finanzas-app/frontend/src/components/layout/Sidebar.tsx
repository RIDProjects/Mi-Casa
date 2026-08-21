import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Wallet, Receipt, PiggyBank, TrendingUp,
  CreditCard, DollarSign, Calculator, ShoppingCart, BookOpen,
  BarChart2, Settings, LogOut, Moon, Sun, Users,
  ShieldCheck, Building2, X,
  Landmark, Layers, TrendingDown, Shield, CalendarClock,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import clsx from 'clsx';
import MiCasaProLogo from '../ui/MiCasaProLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  module?: string;
  adminOnly?: boolean;
}

const houseNavItems: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/presupuesto',   label: 'Presupuesto',    icon: Wallet },
  { href: '/transacciones', label: 'Transacciones',  icon: Receipt },
  { href: '/vencimientos',  label: 'Vencimientos',   icon: CalendarClock },
  { href: '/metas',         label: 'Ahorros',        icon: PiggyBank },
  { href: '/emergency-fund',label: 'Fondo Emergencia', icon: Shield },
  { href: '/inversiones',   label: 'Inversiones',    icon: TrendingUp },
  { href: '/debts',         label: 'Deudas',         icon: DollarSign,  module: 'debts' },
  { href: '/creditos',      label: 'Créditos',       icon: Landmark },
  { href: '/cuotas',        label: 'Cuotas',         icon: Layers },
  { href: '/payoff',        label: 'Liquidar Deudas', icon: TrendingDown },
  { href: '/simulador',     label: 'Simulador',      icon: Calculator },
  { href: '/tarjetas',      label: 'Tarjetas',       icon: CreditCard },
  { href: '/patrimonio',    label: 'Patrimonio',     icon: Calculator },
  { href: '/purchases',     label: 'Lista Compra',   icon: ShoppingCart, module: 'purchases' },
  { href: '/registro-gastos',label: 'Reg. Gastos',   icon: BookOpen,    module: 'purchases' },
  { href: '/analytics',     label: 'Reportes',       icon: BarChart2 },
];

const adminNavItems: NavItem[] = [
  { href: '/admin',         label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/users',   label: 'Usuarios',   icon: Users },
  { href: '/admin/roles',   label: 'Roles',      icon: ShieldCheck },
  { href: '/admin/houses',  label: 'Casas',      icon: Building2 },
];

interface SidebarProps { isOpen?: boolean; onClose?: () => void; }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { logout, hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const isAdminRoute = router.pathname.startsWith('/admin');
  const navItems     = isAdminRoute ? adminNavItems : houseNavItems;

  const handleLinkClick = () => onClose?.();

  const NavLink = ({ item }: { item: NavItem }) => {
    if (item.module && !hasPermission(item.module, 'view')) return null;

    const isActive = router.pathname === item.href ||
      (item.href !== '/dashboard' && router.pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={handleLinkClick}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 active:scale-[0.98]',
          /* Light active */
          isActive
            ? 'bg-primary-container text-on-primary-container font-semibold'
            : 'text-on-surface-variant hover:bg-surface-variant',
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="text-label-upper font-label-upper">{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <aside className={clsx(
      'w-64 flex flex-col h-full border-r border-outline-variant',
      'bg-surface-container-low',   /* #f0f3ff light / #131b2e dark — via CSS var */
    )}>
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 border-b border-outline-variant flex items-center justify-between">
        <MiCasaProLogo size={36} />
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-outline-variant pt-4 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 text-label-upper font-label-upper text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <Link
          href="/house-members"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 text-label-upper font-label-upper text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <Users size={16} />
          Miembros del Hogar
        </Link>

        <Link
          href="/configuracion/monedas"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2 text-label-upper font-label-upper text-on-surface-variant hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <Settings size={16} />
          Configuración
        </Link>

        <Link
          href="/guia"
          onClick={handleLinkClick}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 text-label-upper font-label-upper rounded-lg transition-all duration-150',
            router.pathname === '/guia'
              ? 'bg-primary-container text-on-primary-container font-semibold'
              : 'text-on-surface-variant hover:bg-surface-variant',
          )}
        >
          <BookOpen size={16} />
          Guía de uso
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 text-label-upper font-label-upper text-on-surface-variant hover:text-danger hover:bg-surface-variant rounded-lg transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex w-64 min-h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 animate-backdrop-in"
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
