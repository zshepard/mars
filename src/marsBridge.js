// src/marsBridge.js
// ─────────────────────────────────────────────────────────────
//  MARS Native Bridge
//  Detects whether the web app is running inside the Expo/React
//  Native WebView and routes all alarm/sound/URL calls to the
//  native module via postMessage instead of the Service Worker.
//
//  Import and use marsAction() everywhere instead of calling
//  SW methods directly — it auto-routes to the right layer.
// ─────────────────────────────────────────────────────────────

// ── Detect native WebView context ─────────────────────────────
export const isNative = () =>
  typeof window !== 'undefined' &&
  (window.__MARS_NATIVE__ === true ||
   typeof window.ReactNativeWebView !== 'undefined');

// ── Send a message to the native layer ────────────────────────
function postToNative(data) {
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  } else if (window.__marsNative) {
    // Injected bridge object (fallback)
    const fn = window.__marsNative[data.type];
    if (typeof fn === 'function') fn(data);
  }
}

// ── Listen for messages coming down from native ────────────────
export function onNativeMessage(handler) {
  if (!isNative()) return () => {};

  const listener = (event) => {
    try {
      const data = typeof event.data === 'string'
        ? JSON.parse(event.data)
        : event.data;
      handler(data);
    } catch (e) {
      console.warn('[MARS Bridge] Failed to parse native message:', e);
    }
  };

  // React Native sends messages via window.document 'message' event
  document.addEventListener('message', listener);
  window.addEventListener('message', listener);

  return () => {
    document.removeEventListener('message', listener);
    window.removeEventListener('message', listener);
  };
}

// ── Tell the native app we're ready ───────────────────────────
export function signalWebReady() {
  if (!isNative()) return;
  postToNative({ type: 'MARS_WEB_READY' });
}

// ════════════════════════════════════════════════════════════════
//  ALARM ACTIONS — auto-routes: native bridge OR service worker
// ════════════════════════════════════════════════════════════════

/**
 * Schedule an alarm.
 * In native: routes to AlarmManager (fires even when app closed).
 * In browser: routes to Service Worker setTimeout.
 */
export function marsScheduleAlarm({ alarm_id, fire_at, payload }) {
  if (isNative()) {
    postToNative({
      type:    'MARS_SCHEDULE_ALARM',
      id:      alarm_id,
      time:    fire_at,
      payload: payload,
    });
  } else {
    // Service Worker path (browser / PWA)
    navigator.serviceWorker?.controller?.postMessage({
      type: 'SCHEDULE_ALARM',
      data: { alarm_id, fire_at, payload },
    });
  }
}

/**
 * Cancel a scheduled alarm.
 */
export function marsCancelAlarm(alarm_id) {
  if (isNative()) {
    postToNative({ type: 'MARS_CANCEL_ALARM', id: alarm_id });
  } else {
    navigator.serviceWorker?.controller?.postMessage({
      type: 'CANCEL_ALARM',
      data: { alarm_id },
    });
  }
}

/**
 * Play an alarm sound.
 * In native: plays Android system ringtone via RingtoneManager.
 * In browser: plays MP3 via Web Audio API.
 */
export function marsPlaySound(uri, loop = true) {
  if (isNative()) {
    postToNative({ type: 'MARS_PLAY_SOUND', uri, loop });
  } else {
    // Web Audio fallback
    try {
      const audio = new Audio(uri || '/sounds/alarm-default.mp3');
      audio.loop = loop;
      audio.play().catch(console.warn);
      window.__marsCurrentAudio = audio;
    } catch (e) {
      console.warn('[MARS] Web audio failed:', e);
    }
  }
}

/**
 * Stop the currently playing alarm sound.
 */
export function marsStopSound() {
  if (isNative()) {
    postToNative({ type: 'MARS_STOP_SOUND' });
  } else {
    if (window.__marsCurrentAudio) {
      window.__marsCurrentAudio.pause();
      window.__marsCurrentAudio.currentTime = 0;
      window.__marsCurrentAudio = null;
    }
  }
}

/**
 * Open a URL.
 * In native: uses Linking.openURL (opens in browser/YouTube/etc).
 * In browser: opens in new tab.
 */
export function marsOpenUrl(url) {
  if (!url) return;
  if (isNative()) {
    postToNative({ type: 'MARS_OPEN_URL', url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * Queue a home control action.
 * In native: can route to local smart home SDK.
 * In browser: queues via Service Worker background sync.
 */
export function marsHomeAction(action) {
  if (isNative()) {
    postToNative({ type: 'MARS_HOME_ACTION', action });
  } else {
    navigator.serviceWorker?.controller?.postMessage({
      type: 'HOME_ACTION_OFFLINE',
      data: action,
    });
  }
}
