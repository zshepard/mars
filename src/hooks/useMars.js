// src/hooks/useMars.js
import { useState, useEffect, useCallback } from 'react';
import { scheduleAlarm, cancelAlarm } from './useAlarms';
import { queueHomeAction } from '../serviceWorkerRegistration';

// ── Permission status helpers ─────────────────────────────────────────────────
// Returns 'granted' | 'denied' | 'prompt' | 'unsupported'
async function queryPermission(name) {
  if (!navigator.permissions) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unsupported';
  }
}

export function useMars() {
  const [isOnline,        setIsOnline]        = useState(navigator.onLine);
  const [swReady,         setSwReady]         = useState(false);
  const [lastDismissed,   setLastDismissed]   = useState(null);

  // ── Permission states ───────────────────────────────────────────
  const [notifPermission,   setNotifPermission]   = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [micPermission,     setMicPermission]     = useState('prompt');
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive,    setWakeLockActive]    = useState(false);
  const [storagePermission, setStoragePermission] = useState('prompt');

  // ── Online / offline ────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Service worker ──────────────────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true));
    }
  }, []);

  // ── Alarm dismissed event ───────────────────────────────────────
  useEffect(() => {
    const onDismiss = (e) => setLastDismissed(e.detail);
    window.addEventListener('mars:alarm-dismissed', onDismiss);
    return () => window.removeEventListener('mars:alarm-dismissed', onDismiss);
  }, []);

  // ── Query current permission states on mount ────────────────────
  useEffect(() => {
    // Wake lock support
    setWakeLockSupported('wakeLock' in navigator);

    // Persistent storage
    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then((persisted) => {
        setStoragePermission(persisted ? 'granted' : 'prompt');
      });
    } else {
      setStoragePermission('unsupported');
    }

    // Live-watch mic + notification permission changes (Chrome supports this)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        setMicPermission(status.state);
        status.onchange = () => setMicPermission(status.state);
      }).catch(() => {});

      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        setNotifPermission(status.state);
        status.onchange = () => setNotifPermission(status.state);
      }).catch(() => {});
    }
  }, []);

  // ── Request: Notifications ──────────────────────────────────────
  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    const r = await Notification.requestPermission();
    setNotifPermission(r);
    return r;
  }, []);

  // ── Request: Microphone ─────────────────────────────────────────
  const requestMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('granted');
      return 'granted';
    } catch (err) {
      const state = err.name === 'NotAllowedError' ? 'denied' : 'prompt';
      setMicPermission(state);
      return state;
    }
  }, []);

  // ── Request: Wake Lock (screen stays on during alarms) ──────────
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;
    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
      lock.addEventListener('release', () => setWakeLockActive(false));
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Request: Persistent Storage ─────────────────────────────────
  const requestPersistentStorage = useCallback(async () => {
    if (!navigator.storage?.persist) return 'unsupported';
    const granted = await navigator.storage.persist();
    setStoragePermission(granted ? 'granted' : 'denied');
    return granted ? 'granted' : 'denied';
  }, []);

  return {
    // Online
    isOnline,
    isOffline: !isOnline,
    swReady,
    lastDismissed,

    // Permissions
    notifPermission,
    micPermission,
    wakeLockSupported,
    wakeLockActive,
    storagePermission,

    // Permission requesters
    requestNotifications,
    requestMicrophone,
    requestWakeLock,
    requestPersistentStorage,

    // Alarm helpers
    scheduleAlarm,
    cancelAlarm,
    queueHomeAction,
  };
}
