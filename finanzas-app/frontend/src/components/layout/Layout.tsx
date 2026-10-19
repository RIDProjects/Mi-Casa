import React from 'react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdminGlobal } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdminRoute = router.pathname.startsWith('/admin');
  const isAdmin = isAdminGlobal();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && isAdminRoute && !isAdmin) {
      toast.error('No tienes permisos para acceder a esa sección');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAdminRoute, isAdmin, router]);

  if (!isAuthenticated || (isAdminRoute && !isAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-on-surface-variant text-body-small font-body-small">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="app-bg flex min-h-screen text-on-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-[1] flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-surface-container-lowest/90 dark:bg-surface-container-low/90 backdrop-blur border-b border-border-light flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="text-[16px] font-extrabold text-primary tracking-tight leading-none">
            Mi Casa Pro
          </span>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
