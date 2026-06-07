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
