import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/auth.store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isAdminGlobal } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(isAdminGlobal() ? '/admin' : '/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isAdminGlobal]);
  return null;
}