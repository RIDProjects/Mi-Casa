import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/auth.store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated]);
  return null;
}