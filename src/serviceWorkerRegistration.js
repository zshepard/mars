// src/serviceWorkerRegistration.js
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
  navigator.serviceWorker?.controller?.postMessage({
    type: 'SCHEDULE_LINK',
    data: { link_id, time, days, url, device },
  });
}

export function cancelLink(link_id) {
  navigator.serviceWorker?.controller?.postMessage({
    type: 'CANCEL_LINK',
    data: { link_id },
  });
}
