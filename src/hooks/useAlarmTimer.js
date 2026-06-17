// src/hooks/useAlarmTimer.js
// ─────────────────────────────────────────────────────────────────────────────
//  Client-side alarm timer — uses setInterval (same pattern as the scheduled
//  redirect snippet) to check every second and fire alarms when the time hits.
//  Works even when browser notification permission is denied.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';
import { msUntilNextFire as msUntilNextFireUtil, formatCountdown } from '../utils/timeUtils';

// Opens a URL safely in both browser and Android WebView contexts.
// window.open() is silently blocked inside WebViews — use the native bridge instead.
function openExternalUrl(url) {
  if (!url) return;
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_URL', url }));
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const WAV_IDS = new Set([
  'alarm-default','alarm-gentle','alarm-military','chime',
  'Argon','Carbon','Helium','Krypton','Neon','Osmium','Oxygen','Platinum',
]);

function soundExt(soundId) {
  return WAV_IDS.has(soundId) ? 'wav' : 'mp3';
}

// Returns true if the URL attached to this alarm should open on this device.
// The alarm SOUND always fires on every device — only the URL is device-targeted.
// Uses linkDevice (new field) with fallback to openDevice (legacy field).
function shouldOpenUrlOnThisDevice(alarm) {
  const target = alarm.linkDevice || alarm.openDevice || 'all';
  if (target === 'all') return true;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (target === 'phone')    return isMobile;
  if (target === 'computer') return !isMobile;
  return true;
}

// Returns true if the alarm should fire right now.
// NOTE: the alarm SOUND always fires on every device — device targeting
// only controls where the URL opens, not whether the alarm sounds.
function shouldFireNow(alarm) {
  if (!alarm.enabled) return false;
  const now = new Date();
  const [h, m] = (alarm.time || '').split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  if (now.getHours() !== h || now.getMinutes() !== m) return false;
  const days = alarm.days || [];
  if (days.length === 0) return true;
  return days.includes(DAY_NAMES[now.getDay()]);
}

// Wraps shared util: accepts an alarm object, extracts time+days
function msUntilNextFire(alarm) {
  if (!alarm.enabled) return null;
  return msUntilNextFireUtil(alarm.time, alarm.days || []);
}

// Optional `onAlarmFired(alarmId)` callback — called on dismiss or snooze so the
// caller (e.g. Alarms page) can write lastFiredAt to Firestore, which prevents
// the missed-alarm check from re-triggering for an alarm that already fired.
export function useAlarmTimer(alarms = [], { onAlarmFired } = {}) {
  const [firingAlarm, setFiringAlarm] = useState(null);
  // countdowns: { [alarmId]: "Xh Ym" | null }
  const [countdowns, setCountdowns]   = useState({});
  const audioRef          = useRef(null);
  const firedRef          = useRef(new Set());
  // Stable ref for the auto-dismiss timeout — survives re-renders
  const autoDismissTimer  = useRef(null);

  // ── Clear the auto-dismiss timer (called on manual dismiss / snooze) ──
  const clearAutoDismiss = useCallback(() => {
    if (autoDismissTimer.current !== null) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  // ── Stop audio helper ─────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Tell Android TWA to stop any native ringtone started via MARS_PLAY_SOUND bridge
    if (window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARS_STOP_SOUND' }));
      } catch {}
    }
  }, []);

  // ── Dismiss ────────────────────────────────────────────────────────
  const dismissAlarm = useCallback((alarm) => {
    clearAutoDismiss();
    stopAudio();
    setFiringAlarm(null);
    if (alarm?.id) {
      // Write lastFiredAt to localStorage (guest) and call onAlarmFired so the
      // caller can persist it to Firestore (signed-in). This prevents the
      // missed-alarm check from re-triggering on every Firestore snapshot.
      try {
        localStorage.setItem(`mars-alarm-lastfired-${alarm.id}`, new Date().toISOString());
      } catch {}
      if (typeof onAlarmFired === 'function') onAlarmFired(alarm.id);
    }
    if (alarm?.openUrl && shouldOpenUrlOnThisDevice(alarm)) {
      openExternalUrl(alarm.openUrl);
    }
  }, [clearAutoDismiss, stopAudio, onAlarmFired]);

  // ── Snooze (configurable duration from localStorage) ─────────────
  const snoozeAlarm = useCallback((alarm) => {
    clearAutoDismiss();
    stopAudio();
    setFiringAlarm(null);
    if (alarm?.id) {
      try {
        localStorage.setItem(`mars-alarm-lastfired-${alarm.id}`, new Date().toISOString());
      } catch {}
      if (typeof onAlarmFired === 'function') onAlarmFired(alarm.id);
    }
    // Read user-configured snooze duration (default 5 min)
    const snoozeMins = parseInt(localStorage.getItem('mars-snooze-duration') || '5', 10);
    const snoozeMs = Math.max(1, snoozeMins) * 60 * 1000;
    setTimeout(() => fireAlarmFn(alarm), snoozeMs); // eslint-disable-line no-use-before-define
  }, [clearAutoDismiss, stopAudio, onAlarmFired]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fire ───────────────────────────────────────────────────────────
  const fireAlarmFn = useCallback((alarm) => {
    // Clear any lingering auto-dismiss from a previous fire
    clearAutoDismiss();

    // Close any existing SW notification for this alarm so it doesn't
    // stack on top of the in-page overlay when the app is in the foreground.
    if (alarm?.id) {
      navigator.serviceWorker?.ready.then((reg) => {
        reg.getNotifications({ tag: alarm.id }).then((notifs) => {
          notifs.forEach((n) => n.close());
        }).catch(() => {});
      }).catch(() => {});
    }

    setFiringAlarm(alarm);

    // Determine which sound to play.
    const rawSound = alarm.sound || 'alarm-default';
    const isNativeUri = rawSound.startsWith('content://');
    const webSound = isNativeUri ? 'alarm-default' : rawSound;
    const ext = soundExt(webSound);
    const soundUrl = `/sounds/${webSound}.${ext}`;

    // Always notify the Android bridge so AlarmSoundService can play the
    // system ringtone. This is the only reliable path when the screen is off
    // because Chrome blocks Web Audio on hidden pages.
    if (window.ReactNativeWebView) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MARS_PLAY_SOUND',
          uri: isNativeUri ? rawSound : soundUrl,
          useSystemAlarm: !isNativeUri,
          loop: true,
        }));
      } catch {}
    }
    // Also start the web Audio element for when the page IS visible
    // (screen on, app in foreground). Will be silently blocked if hidden.
    const audio = new Audio(soundUrl);
    audio.loop = true;
    audio.volume = 1.0;
    audio.play().catch(() => {});
    audioRef.current = audio;

    // ── Auto-dismiss: schedule a real timeout stored in a stable ref ──
    if (alarm.autoDismiss && alarm.dismissAfter > 0) {
      const delayMs = alarm.dismissAfter * 1000;
      // Store the alarm snapshot so the timeout always dismisses the right alarm
      const alarmSnapshot = { ...alarm };
      autoDismissTimer.current = setTimeout(() => {
        autoDismissTimer.current = null;
        // Only dismiss if this alarm is still the one firing
        setFiringAlarm(current => {
          if (current && current.id === alarmSnapshot.id) {
            // Stop audio
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current = null;
            }
            // Open URL only if this device is the target
            if (alarmSnapshot.openUrl && shouldOpenUrlOnThisDevice(alarmSnapshot)) {
              openExternalUrl(alarmSnapshot.openUrl);
            }
            return null; // clear the firing alarm
          }
          return current; // another alarm fired in the meantime — leave it
        });
      }, delayMs);
    }

    // If the page is hidden (background tab, minimized TWA, screen off) the
    // in-page overlay won't be seen. Fire a SW notification so the user gets
    // an audible + visible alert even when the app isn't in view.
    if (document.visibilityState === 'hidden') {
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then((reg) => {
          const snoozeMins = parseInt(localStorage.getItem('mars-snooze-duration') || '5', 10);
          reg.showNotification(alarm.label || 'MARS Alarm', {
            body: alarm.openUrl ? `Tap to open: ${alarm.openUrl}` : 'Time to start your routine.',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            vibrate: [300, 100, 300, 100, 500],
            requireInteraction: !alarm.autoDismiss,
            tag: alarm.id,
            renotify: true,
            data: { alarm_id: alarm.id, ...alarm },
            actions: [
              { action: 'dismiss', title: '\u2713 Dismiss' },
              { action: 'snooze',  title: `\u23f1 Snooze ${snoozeMins}m` },
            ],
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [clearAutoDismiss, dismissAlarm]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main interval: every second ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minuteKey = `${now.getHours()}:${now.getMinutes()}`;

      if (now.getSeconds() === 0) firedRef.current.clear();

      // Fire check
      alarms.forEach((alarm) => {
        const key = `${alarm.id}-${minuteKey}`;
        if (firedRef.current.has(key)) return;
        if (shouldFireNow(alarm)) {
          firedRef.current.add(key);
          fireAlarmFn(alarm);
        }
      });

      // Update countdowns every second
      const newCountdowns = {};
      alarms.forEach((alarm) => {
        const ms = msUntilNextFire(alarm);
        newCountdowns[alarm.id] = formatCountdown(ms);
      });
      setCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, fireAlarmFn]);

  // Clean up auto-dismiss timer on unmount
  useEffect(() => {
    return () => clearAutoDismiss();
  }, [clearAutoDismiss]);

  // ── SW message listener: show overlay when SW fires alarm in background ──
  // The SW timer fires precisely via setTimeout even when the tab is hidden.
  // When it fires, it sends MARS_SHOW_ALARM_OVERLAY to all clients. We listen
  // here and immediately show the in-page overlay + play sound, so the user
  // sees the alarm UI as soon as they look at the screen — without needing
  // to tap the notification.
  useEffect(() => {
    const alarmsRef = { current: alarms };
    alarmsRef.current = alarms;

    const onSwMessage = (event) => {
      const { type, alarm_id } = event.data || {};
      if (type === 'MARS_SHOW_ALARM_OVERLAY' && alarm_id) {
        const alarm = alarmsRef.current.find(a => a.id === alarm_id);
        if (alarm) {
          // Close the SW notification so it doesn't stack on the overlay
          navigator.serviceWorker?.ready.then((reg) => {
            reg.getNotifications({ tag: alarm_id }).then((notifs) => {
              notifs.forEach((n) => n.close());
            }).catch(() => {});
          }).catch(() => {});
          setFiringAlarm((current) => current ?? alarm);
          // Play sound via the fire function (handles bridge + web audio)
          fireAlarmFn(alarm);
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage);
  }, [alarms, fireAlarmFn]);

  // ── Visibility change: when user brings the app back into view ────
  // If a SW notification fired while the page was hidden and the user taps
  // the notification to open the app, close the notification and show the
  // in-page overlay so they can dismiss/snooze from the UI.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // Check if any alarm is currently in its fire window (within 2 min of fire time)
      const now = new Date();
      for (const alarm of alarms) {
        if (!shouldFireNow(alarm)) {
          // Also check if we're within 2 minutes past the fire time
          const [h, m] = (alarm.time || '').split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;
          const fireMs = new Date(now);
          fireMs.setHours(h, m, 0, 0);
          const diff = now.getTime() - fireMs.getTime();
          if (diff < 0 || diff > 2 * 60 * 1000) continue;
          if (!alarm.enabled) continue;
        }
        // Close SW notification and show in-page overlay
        navigator.serviceWorker?.ready.then((reg) => {
          reg.getNotifications({ tag: alarm.id }).then((notifs) => {
            if (notifs.length > 0) {
              notifs.forEach((n) => n.close());
              // Only fire in-page overlay if nothing is already firing
              setFiringAlarm((current) => current ?? alarm);
            }
          }).catch(() => {});
        }).catch(() => {});
        break; // only handle one at a time
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [alarms]); // eslint-disable-line react-hooks/exhaustive-deps

  return { firingAlarm, dismissAlarm, snoozeAlarm, countdowns };
}
