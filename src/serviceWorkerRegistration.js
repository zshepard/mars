// src/serviceWorkerRegistration.js
import { isNative } from './marsBridge';
const SW_URL = `${process.env.PUBLIC_URL}/sw.js`;

export function register(config = {}) {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).then((registration) => {
      console.log('[MARS] SW registered');

      registration.onupdatefound = () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              config.onUpdate?.(registration);
            } else {
              config.onSuccess?.(registration);
            }
          }
        };
      };

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Register periodic background sync for Android alarm firing.
      // This wakes the SW every ~15 min so alarms fire even when the app is closed.
      if ('periodicSync' in registration) {
        navigator.permissions.query({ name: 'periodic-background-sync' }).then((status) => {
          if (status.state === 'granted') {
            registration.periodicSync.register('mars-alarm-check', {
              minInterval: 15 * 60 * 1000, // 15 minutes
            }).then(() => {
              console.log('[MARS] Periodic alarm check registered (15 min interval)');
            }).catch((e) => {
              console.warn('[MARS] Could not register periodic alarm check:', e);
            });
          } else {
            console.log('[MARS] Periodic background sync not granted (state:', status.state, ')');
          }
        }).catch(() => {
          // permissions.query may not support periodic-background-sync on all browsers
          registration.periodicSync.register('mars-alarm-check', {
            minInterval: 15 * 60 * 1000,
          }).catch(() => {});
        });
      }

      window.__MARS_SW__ = registration;
    }).catch(console.error);

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, queue } = event.data || {}; // eslint-disable-line no-unused-vars
      const dispatch = (name, detail) =>
        window.dispatchEvent(new CustomEvent(name, { detail }));
      switch (type) {
        case 'MARS_ALARM_DISMISSED': dispatch('mars:alarm-dismissed', event.data); break;
        case 'MARS_ALARM_SNOOZED':   dispatch('mars:alarm-snoozed',   event.data); break;
        case 'MARS_SYNC_QUEUE':      dispatch('mars:sync-queue', { queue });       break;
        case 'MARS_DAILY_REFRESH':   dispatch('mars:daily-refresh', {});           break;
        // Routine player start — triggered by notification click when app is backgrounded
        case 'MARS_START_ROUTINE': {
          const routine = event.data.routine
            ? (typeof event.data.routine === 'string'
                ? JSON.parse(event.data.routine)
                : event.data.routine)
            : null;
          if (routine) dispatch('mars:start-routine', { routine });
          break;
        }
        // Open URL — triggered by scheduled link notification click
        case 'MARS_OPEN_URL':
          dispatch('mars:open-url', { url: event.data.url, device: event.data.device });
          break;
        default: break;
      }
    });
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((r) => r.unregister());
  }
}

export function queueHomeAction(action) {
  navigator.serviceWorker?.controller?.postMessage({
    type: 'HOME_ACTION_OFFLINE',
    data: action,
  });
}

export function scheduleLink({ link_id, time, days, url, device }) {
  if (isNative()) {
    // In native WebView: schedule via native AlarmManager through the bridge
    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type:    'MARS_SCHEDULE_ALARM',
        id:      `link-${link_id}`,
        time:    nextLinkFireTime(time, days),
        payload: { link_id, url, device, type: 'scheduled-link' },
      }));
    }
    return;
  }
  navigator.serviceWorker?.controller?.postMessage({
    type: 'SCHEDULE_LINK',
    data: { link_id, time, days, url, device },
  });
}

export function cancelLink(link_id) {
  if (isNative()) {
    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'MARS_CANCEL_ALARM',
        id:   `link-${link_id}`,
      }));
    }
    return;
  }
  navigator.serviceWorker?.controller?.postMessage({
    type: 'CANCEL_LINK',
    data: { link_id },
  });
}

// Helper: calculate next fire time for a scheduled link
function nextLinkFireTime(timeStr, days = []) {
  if (!timeStr) return new Date(Date.now() + 60000).toISOString();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate <= now) continue;
    if (!days || days.length === 0) return candidate.toISOString();
    const dayName = DAY_NAMES[candidate.getDay()];
    if (days.includes(dayName)) return candidate.toISOString();
  }
  const fallback = new Date(now.getTime() + 86400000);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}
