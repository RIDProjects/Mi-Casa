import React from 'react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/auth.store';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="text-on-surface-variant text-body-small font-body-small">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-surface-container-low border-b border-outline-variant flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-[18px] font-black text-primary uppercase tracking-tight leading-none">
            Mi Casa Pro
          </h1>
        </div>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
