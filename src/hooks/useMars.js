// src/hooks/useMars.js
import { useState, useEffect, useCallback } from 'react';
import { scheduleAlarm, cancelAlarm, queueHomeAction } from '../serviceWorkerRegistration';

export function useMars() {
  const [isOnline,        setIsOnline]        = useState(navigator.onLine);
  const [swReady,         setSwReady]         = useState(false);
  const [lastDismissed,   setLastDismissed]   = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }
  }, []);

  useEffect(() => {
    const onDismiss = (e) => setLastDismissed(e.detail);
    window.addEventListener('mars:alarm-dismissed', onDismiss);
    return () => window.removeEventListener('mars:alarm-dismissed', onDismiss);
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const r = await Notification.requestPermission();
    setNotifPermission(r);
    return r;
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    swReady,
    notifPermission,
    lastDismissed,
    requestNotifications,
    scheduleAlarm,
    cancelAlarm,
    queueHomeAction,
  };
}
