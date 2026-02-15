import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

/**
 * Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook to manage push notification subscriptions
 */
export function usePushNotifications(branchId = null) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState('default');
  const [error, setError] = useState(null);
  const [registration, setRegistration] = useState(null);

  // Check browser support
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);

    if (!supported) {
      setIsLoading(false);
      if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID public key not configured');
      }
    }
  }, []);

  // Register service worker and check existing subscription
  useEffect(() => {
    if (!isSupported) return;

    async function init() {
      try {
        // Register the service worker
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        console.log('✅ Service Worker registered');

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

        // Check current permission
        setPermission(Notification.permission);

        // Check if already subscribed
        const existingSub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!existingSub);

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing push notifications:', err);
        setError('Error al inicializar notificaciones');
        setIsLoading(false);
      }
    }

    init();
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!registration || !VAPID_PUBLIC_KEY) return;

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Permiso de notificaciones denegado');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
        branchId
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError('Error al activar notificaciones');
      setIsLoading(false);
      return false;
    }
  }, [registration, branchId]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify backend
        await api.post('/push/unsubscribe', {
          endpoint: subscription.endpoint
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      setError('Error al desactivar notificaciones');
      setIsLoading(false);
      return false;
    }
  }, [registration]);

  // Toggle subscription
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  // Send a test notification
  const sendTest = useCallback(async () => {
    try {
      const response = await api.post('/push/test');
      return response.data;
    } catch (err) {
      console.error('Error sending test push:', err);
      setError('Error al enviar notificación de prueba');
      return null;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    toggleSubscription,
    sendTest
  };
}
