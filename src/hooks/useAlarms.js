// src/hooks/useAlarms.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useLocalCollection } from './useLocalStorage';
import {
  isNative,
  marsScheduleAlarm as bridgeScheduleAlarm,
  marsCancelAlarm  as bridgeCancelAlarm,
  marsOpenUrl,
  onNativeMessage,
  signalWebReady,
} from '../marsBridge';

const GUEST_ID = 'mars-local-user';

// ─────────────────────────────────────────────────────────────────
//  Reliable SW message helper — waits for controller to be ready
// ─────────────────────────────────────────────────────────────────
async function swPostMessage(msg) {
  if (!('serviceWorker' in navigator)) return;
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
    return;
  }
  await new Promise((resolve) => {
    const handler = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handler);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.removeEventListener('controllerchange', handler);
        resolve();
      }
    });
  });
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

// ── Public scheduling helpers — auto-route: native bridge OR SW ──
export function scheduleAlarm({ alarm_id, fire_at, payload }) {
  if (isNative()) {
    bridgeScheduleAlarm({ alarm_id, fire_at, payload });
  } else {
    swPostMessage({ type: 'SCHEDULE_ALARM', data: { alarm_id, fire_at, payload } });
  }
}

export function cancelAlarm(alarm_id) {
  if (isNative()) {
    bridgeCancelAlarm(alarm_id);
  } else {
    swPostMessage({ type: 'CANCEL_ALARM', data: { alarm_id } });
  }
}

export function useAlarms(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-alarms', []);
  const [alarms, setAlarms]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Always hold the latest alarms array so updateAlarm never reads stale state
  const alarmsRef = useRef(alarms);
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);

  // Track whether guest alarms have been registered to prevent re-registering
  const guestRegistered = useRef(false);

  // ── Signal native bridge that web is ready ─────────────────────
  useEffect(() => {
    signalWebReady();
  }, []);

  // ── Listen for events coming down from native AlarmRingActivity ─
  useEffect(() => {
    const cleanup = onNativeMessage((data) => {
      switch (data.type) {

        case 'MARS_NATIVE_READY':
          console.log('[MARS] Native alarm module ready — rescheduling all alarms');
          // Re-schedule all enabled alarms into native AlarmManager
          alarmsRef.current.filter((a) => a.enabled !== false).forEach((alarm) => {
            scheduleAlarm({
              alarm_id: alarm.id,
              fire_at:  nextFireTime(alarm.time, alarm.days),
              payload:  alarm,
            });
          });
          break;

        case 'MARS_ALARM_FIRED':
          // Native alarm fired while app was closed, now re-opened
          window.dispatchEvent(new CustomEvent('mars:alarm-fired', {
            detail: { alarm_id: data.id, payload: data.payload },
          }));
          break;

        case 'MARS_ALARM_DISMISSED':
          // User dismissed alarm on native AlarmRingActivity
          handleNativeDismiss(data.id, data.openUrl);
          break;

        case 'MARS_ALARM_SNOOZED':
          window.dispatchEvent(new CustomEvent('mars:alarm-snoozed', {
            detail: { alarm_id: data.id, minutes: data.minutes },
          }));
          break;

        case 'MARS_ALARM_SCHEDULED_ACK':
          console.log('[MARS] Native confirmed alarm scheduled:', data.id);
          break;

        case 'MARS_ALARM_SCHEDULE_FALLBACK':
          // Native scheduling failed — fall back to SW
          console.warn('[MARS] Native scheduling failed, falling back to SW:', data.id);
          const alarm = alarmsRef.current.find((a) => a.id === data.id);
          if (alarm) {
            swPostMessage({
              type: 'SCHEDULE_ALARM',
              data: {
                alarm_id: alarm.id,
                fire_at:  nextFireTime(alarm.time, alarm.days),
                payload:  alarm,
              },
            });
          }
          break;

        case 'MARS_APP_FOREGROUND':
          // App came back to foreground — nothing to do here, Firestore listener handles it
          break;

        default:
          break;
      }
    });
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle dismiss from native AlarmRingActivity
  async function handleNativeDismiss(alarm_id, openUrl) {
    // Write lastFiredAt to localStorage immediately (missed-alarm guard)
    localStorage.setItem(`mars-alarm-lastfired-${alarm_id}`, new Date().toISOString());
    window.dispatchEvent(new CustomEvent('mars:alarm-dismissed', {
      detail: { alarm_id, openUrl, native: true },
    }));
    // Open the alarm's URL
    if (openUrl) marsOpenUrl(openUrl);
    // Sync to Firestore
    if (uid) {
      await updateDoc(doc(db, 'users', uid, 'alarms', alarm_id), {
        lastFiredAt:     serverTimestamp(),
        lastDismissedAt: serverTimestamp(),
      }).catch(console.warn);
    }
  }

  // ── Firestore mode (logged in) ──────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    if (!uid || uid === GUEST_ID) return;
    guestRegistered.current = false;

    let unsub = null;
    let retryTimer = null;

    const subscribe = (attempt = 0) => {
      const q = query(
        collection(db, 'users', uid, 'alarms'),
        orderBy('time', 'asc')
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAlarms(data);
          setLoading(false);
          // Re-register all enabled alarms on every snapshot
          data.forEach((alarm) => {
            if (alarm.enabled !== false) {
              scheduleAlarm({
                alarm_id: alarm.id,
                fire_at:  nextFireTime(alarm.time, alarm.days),
                payload:  { ...alarm },
              });
            } else {
              cancelAlarm(alarm.id);
            }
          });
        },
        (err) => {
          console.warn('[useAlarms] onSnapshot error (attempt', attempt, '):', err.code);
          if (err.code === 'permission-denied' && attempt < 6) {
            const delay = Math.min(800 * Math.pow(2, attempt), 20000);
            retryTimer = setTimeout(() => subscribe(attempt + 1), delay);
          } else {
            setLoading(false);
          }
        }
      );
    };

    subscribe();
    return () => {
      if (unsub) unsub();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [uid, isGuest]);

  // ── Guest mode — register alarms once on mount ─────────────────
  useEffect(() => {
    if (!isGuest) return;
    if (guestRegistered.current) return;
    guestRegistered.current = true;
    local.items.forEach((alarm) => {
      if (alarm.enabled !== false) {
        scheduleAlarm({
          alarm_id: alarm.id,
          fire_at:  nextFireTime(alarm.time, alarm.days),
          payload:  { ...alarm },
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  // ── Missed alarm detection — guest mode ────────────────────────
  useEffect(() => {
    const checkMissed = (items) => {
      const now = Date.now();
      const missed = items.filter((alarm) => {
        if (alarm.enabled === false) return false;
        const expectedMs = lastExpectedFireTime(alarm.time, alarm.days);
        if (!expectedMs || expectedMs >= now || (now - expectedMs) >= 30 * 60 * 1000) return false;
        const storedFired = localStorage.getItem(`mars-alarm-lastfired-${alarm.id}`);
        const fireMs = storedFired
          ? new Date(storedFired).getTime()
          : (alarm.lastFiredAt ? new Date(alarm.lastFiredAt).getTime() : 0);
        return fireMs < expectedMs;
      });
      if (missed.length > 0) {
        window.dispatchEvent(new CustomEvent('mars:missed-alarms', { detail: missed }));
      }
    };
    if (isGuest) {
      checkMissed(local.items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  // ── Missed alarm detection — signed-in mode ────────────────────
  useEffect(() => {
    if (isGuest) return;
    if (alarms.length === 0) return;
    const now = Date.now();
    const missed = alarms.filter((alarm) => {
      if (alarm.enabled === false) return false;
      const expectedMs = lastExpectedFireTime(alarm.time, alarm.days);
      if (!expectedMs || expectedMs >= now || (now - expectedMs) >= 30 * 60 * 1000) return false;
      const firestoreMs = alarm.lastFiredAt
        ? (alarm.lastFiredAt.toMillis ? alarm.lastFiredAt.toMillis() : new Date(alarm.lastFiredAt).getTime())
        : 0;
      const storedFired = localStorage.getItem(`mars-alarm-lastfired-${alarm.id}`);
      const localMs = storedFired ? new Date(storedFired).getTime() : 0;
      const lastFiredMs = Math.max(firestoreMs, localMs);
      return lastFiredMs < expectedMs;
    });
    if (missed.length > 0) {
      window.dispatchEvent(new CustomEvent('mars:missed-alarms', { detail: missed }));
    }
  }, [alarms, isGuest]);

  const currentAlarms = isGuest ? local.items : alarms;
  const isLoading = isGuest ? local.loading : loading;

  // ── CRUD ───────────────────────────────────────────────────────

  const addAlarm = useCallback(async (alarmData) => {
    if (isGuest) {
      const newItem = local.addItem({ ...alarmData, enabled: true });
      scheduleAlarm({
        alarm_id: newItem.id,
        fire_at:  nextFireTime(alarmData.time, alarmData.days),
        payload:  { ...newItem },
      });
      return newItem;
    }
    const ref = await addDoc(collection(db, 'users', uid, 'alarms'), {
      ...alarmData,
      enabled:   true,
      createdAt: serverTimestamp(),
    });
    scheduleAlarm({
      alarm_id: ref.id,
      fire_at:  nextFireTime(alarmData.time, alarmData.days),
      payload:  { ...alarmData, id: ref.id, enabled: true },
    });
    return ref;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  const updateAlarm = useCallback(async (id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      if (data.enabled === false) {
        cancelAlarm(id);
      } else {
        const alarm = local.items.find((a) => a.id === id);
        const merged = { ...alarm, ...data };
        scheduleAlarm({
          alarm_id: id,
          fire_at:  nextFireTime(merged.time, merged.days),
          payload:  { ...merged },
        });
      }
      return;
    }
    await updateDoc(doc(db, 'users', uid, 'alarms', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    if (data.enabled === false) {
      cancelAlarm(id);
    } else {
      const alarm = alarmsRef.current.find((a) => a.id === id);
      const merged = { ...alarm, ...data };
      scheduleAlarm({
        alarm_id: id,
        fire_at:  nextFireTime(merged.time, merged.days),
        payload:  { ...merged },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  const deleteAlarm = useCallback(async (id) => {
    if (isGuest) {
      local.deleteItem(id);
      cancelAlarm(id);
      return;
    }
    await deleteDoc(doc(db, 'users', uid, 'alarms', id));
    cancelAlarm(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  return {
    alarms: currentAlarms,
    loading: isLoading,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    isNative: isNative(),
  };
}

// ── Calculate NEXT fire time from HH:MM string ─────────────────
export function nextFireTime(timeStr, days = []) {
  if (!timeStr) return null;
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

// ── Calculate the LAST expected fire time (for missed-alarm check) ─
function lastExpectedFireTime(timeStr, days = []) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() - offset);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate >= now) continue;
    if (!days || days.length === 0) return candidate.getTime();
    const dayName = DAY_NAMES[candidate.getDay()];
    if (days.includes(dayName)) return candidate.getTime();
  }
  return null;
}
