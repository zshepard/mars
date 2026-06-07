// src/hooks/useAlarmTimer.js
// ─────────────────────────────────────────────────────────────────────────────
//  Client-side alarm timer — uses setInterval (same pattern as the scheduled
//  redirect snippet) to check every second and fire alarms when the time hits.
//  Works even when browser notification permission is denied.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from 'react';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function soundExt(soundId) {
  return ['alarm-default','alarm-gentle','alarm-military','chime'].includes(soundId) ? 'wav' : 'mp3';
}

// Returns true if the alarm should fire right now
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

// Returns milliseconds until the next fire time for an alarm
function msUntilNextFire(alarm) {
  if (!alarm.enabled) return null;
  const now = new Date();
  const [h, m] = (alarm.time || '').split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const days = alarm.days || [];
  const todayIdx = now.getDay(); // 0=Sun

  // Find the next matching day (today counts if alarm hasn't fired yet today)
  for (let offset = 0; offset < 8; offset++) {
    const dayIdx = (todayIdx + offset) % 7;
    const dayName = DAY_NAMES[dayIdx];
    if (days.length > 0 && !days.includes(dayName)) continue;

    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(h, m, 0, 0);

    if (candidate.getTime() > now.getTime()) {
      return candidate.getTime() - now.getTime();
    }
  }
  return null;
}

// Format ms into "Xh Ym" or "Xm Ys" countdown string
function formatCountdown(ms) {
  if (ms === null || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function useAlarmTimer(alarms = []) {
  const [firingAlarm, setFiringAlarm] = useState(null);
  // countdowns: { [alarmId]: "Xh Ym" | null }
  const [countdowns, setCountdowns]   = useState({});
  const audioRef  = useRef(null);
  const firedRef  = useRef(new Set());

  // ── Dismiss ────────────────────────────────────────────────────
  const dismissAlarm = useCallback((alarm) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setFiringAlarm(null);
    if (alarm?.openUrl) {
      window.open(alarm.openUrl, '_blank', 'noopener');
    }
  }, []);

  // ── Snooze 5 min ───────────────────────────────────────────────
  const snoozeAlarm = useCallback((alarm) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setFiringAlarm(null);
    setTimeout(() => fireAlarmFn(alarm), 5 * 60 * 1000); // eslint-disable-line no-use-before-define
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fire ───────────────────────────────────────────────────────
  const fireAlarmFn = useCallback((alarm) => {
    setFiringAlarm(alarm);
    const ext = soundExt(alarm.sound || 'alarm-default');
    const audio = new Audio(`/sounds/${alarm.sound || 'alarm-default'}.${ext}`);
    audio.loop = true;
    audio.volume = 1.0;
    audio.play().catch(() => {});
    audioRef.current = audio;

    if (alarm.autoDismiss && alarm.dismissAfter > 0) {
      setTimeout(() => dismissAlarm(alarm), alarm.dismissAfter * 1000);
    }

    // Bonus: SW notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((reg) => {
        reg.showNotification(alarm.label || 'MARS Alarm', {
          body: alarm.openUrl ? `Tap to open: ${alarm.openUrl}` : 'Time to start your routine.',
          icon: '/icons/icon-192.png',
          vibrate: [300, 100, 300, 100, 500],
          requireInteraction: !alarm.autoDismiss,
          tag: alarm.id,
          renotify: true,
          actions: [
            { action: 'dismiss', title: '✓ Dismiss' },
            { action: 'snooze',  title: '⏱ Snooze 5m' },
          ],
        }).catch(() => {});
      });
    }
  }, [dismissAlarm]);

  // ── Main interval: every second ────────────────────────────────
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

  return { firingAlarm, dismissAlarm, snoozeAlarm, countdowns };
}
