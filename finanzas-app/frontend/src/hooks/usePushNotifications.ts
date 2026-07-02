import { useEffect, useState } from 'react';
import { pushAPI } from '../services/api';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const { data } = await pushAPI.getPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as unknown as BufferSource,
      });
      await pushAPI.subscribe(sub.toJSON());
      setSubscribed(true);
      setPermission('granted');
    } catch (e) {
      console.warn('Push subscription failed:', e);
    }
  };

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await subscribe();
  };

  return { permission, subscribed, requestPermission };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}
