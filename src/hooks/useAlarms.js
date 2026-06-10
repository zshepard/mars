// src/hooks/useAlarms.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useLocalCollection } from './useLocalStorage';

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

export function scheduleAlarm({ alarm_id, fire_at, payload }) {
  swPostMessage({ type: 'SCHEDULE_ALARM', data: { alarm_id, fire_at, payload } });
}

export function cancelAlarm(alarm_id) {
  swPostMessage({ type: 'CANCEL_ALARM', data: { alarm_id } });
}

export function useAlarms(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-alarms', []);
  const [alarms, setAlarms]   = useState([]);
  const [loading, setLoading] = useState(true);

  // ── BUG FIX #2: Use a ref to always hold the latest alarms array
  // so updateAlarm never reads stale state from a closure capture.
  const alarmsRef = useRef(alarms);
  useEffect(() => { alarmsRef.current = alarms; }, [alarms]);

  // ── BUG FIX #3: Track whether guest alarms have been registered
  // to prevent re-registering on every render of local.items.
  const guestRegistered = useRef(false);

  // ── Firestore mode (logged in) ──────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    // Wait for a real uid before touching Firestore
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
          // Re-register all enabled alarms with SW on every snapshot
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
          // permission-denied fires briefly after reload while auth token restores
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

  // ── BUG FIX #3: Re-register guest alarms only ONCE on mount,
  // not on every render triggered by local.items reference change.
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

  // ── BUG FIX #4: Missed alarm detection — check for alarms that
  // fired while the device was off and show a "missed alarm" banner.
  useEffect(() => {
    const checkMissed = (items) => {
      const now = Date.now();
      const missed = items.filter((alarm) => {
        if (alarm.enabled === false) return false;
        const fireMs = new Date(alarm.lastFiredAt || 0).getTime();
        const expectedMs = lastExpectedFireTime(alarm.time, alarm.days);
        // Alarm was expected to fire in the last 30 minutes but hasn't been dismissed
        return expectedMs && expectedMs < now && (now - expectedMs) < 30 * 60 * 1000
          && fireMs < expectedMs;
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

  useEffect(() => {
    if (isGuest) return;
    if (alarms.length === 0) return;
    const now = Date.now();
    const missed = alarms.filter((alarm) => {
      if (alarm.enabled === false) return false;
      const expectedMs = lastExpectedFireTime(alarm.time, alarm.days);
      if (!expectedMs || expectedMs >= now || (now - expectedMs) >= 30 * 60 * 1000) return false;
      // Only flag as missed if the alarm was NOT already fired at or after the expected time.
      // lastFiredAt is written to Firestore by the app when an alarm is dismissed/snoozed.
      const lastFiredMs = alarm.lastFiredAt
        ? (alarm.lastFiredAt.toMillis ? alarm.lastFiredAt.toMillis() : new Date(alarm.lastFiredAt).getTime())
        : 0;
      return lastFiredMs < expectedMs;
    });
    if (missed.length > 0) {
      window.dispatchEvent(new CustomEvent('mars:missed-alarms', { detail: missed }));
    }
  }, [alarms, isGuest]);

  const currentAlarms = isGuest ? local.items : alarms;
  const isLoading = isGuest ? local.loading : loading;

  // ── BUG FIX #5: addAlarm Firestore path — include alarm id in payload
  const addAlarm = useCallback(async (alarmData) => {
    if (isGuest) {
      const newItem = local.addItem({ ...alarmData, enabled: true });
      scheduleAlarm({
        alarm_id: newItem.id,
        fire_at:  nextFireTime(alarmData.time, alarmData.days),
        payload:  { ...newItem },   // ← full item including id
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
      payload:  { ...alarmData, id: ref.id, enabled: true }, // ← include id
    });
    return ref;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isGuest]);

  // ── BUG FIX #2: updateAlarm uses alarmsRef.current (always fresh)
  const updateAlarm = useCallback(async (id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      if (data.enabled === false) {
        cancelAlarm(id);
      } else {
        // Read from local.items directly (not from closure)
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
      // ← Use alarmsRef.current — always the latest, never stale
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

  return { alarms: currentAlarms, loading: isLoading, addAlarm, updateAlarm, deleteAlarm };
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

// ── BUG FIX #4: Calculate the LAST expected fire time ──────────
// Used to detect missed alarms (fired while device was off).
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
