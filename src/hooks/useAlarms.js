// src/hooks/useAlarms.js
import { useState, useEffect } from 'react';
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
  // If controller is already active, send immediately
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
    return;
  }
  // Otherwise wait for the SW to take control (fires after first install or page reload)
  await new Promise((resolve) => {
    const handler = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handler);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    // Also try ready in case it's already controlled but controller was briefly null
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

  // ── Firestore mode (logged in) ──────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'users', uid, 'alarms'),
      orderBy('time', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAlarms(data);
      setLoading(false);

      // Re-register all enabled alarms with the service worker on every snapshot
      // (This ensures alarms survive page reloads, SW restarts, and app re-opens)
      data.forEach((alarm) => {
        if (alarm.enabled !== false) {
          scheduleAlarm({
            alarm_id: alarm.id,
            fire_at:  nextFireTime(alarm.time, alarm.days),
            payload:  alarm,
          });
        } else {
          cancelAlarm(alarm.id);
        }
      });
    });
    return unsub;
  }, [uid, isGuest]);

  // ── Re-register local (guest) alarms with SW on load ───────────
  useEffect(() => {
    if (!isGuest) return;
    local.items.forEach((alarm) => {
      if (alarm.enabled !== false) {
        scheduleAlarm({
          alarm_id: alarm.id,
          fire_at:  nextFireTime(alarm.time, alarm.days),
          payload:  alarm,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, local.items]);

  const currentAlarms = isGuest ? local.items : alarms;
  const isLoading = isGuest ? local.loading : loading;

  const addAlarm = async (alarmData) => {
    if (isGuest) {
      const newItem = local.addItem({ ...alarmData, enabled: true });
      scheduleAlarm({
        alarm_id: newItem.id,
        fire_at:  nextFireTime(alarmData.time, alarmData.days),
        payload:  alarmData,
      });
      return newItem;
    }
    const ref = await addDoc(collection(db, 'users', uid, 'alarms'), {
      ...alarmData,
      enabled:   true,
      createdAt: serverTimestamp(),
    });
    scheduleAlarm({
      alarm_id:   ref.id,
      fire_at:    nextFireTime(alarmData.time, alarmData.days),
      payload:    alarmData,
    });
    return ref;
  };

  const updateAlarm = async (id, data) => {
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
          payload:  merged,
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
      const alarm = alarms.find((a) => a.id === id);
      const merged = { ...alarm, ...data };
      scheduleAlarm({
        alarm_id: id,
        fire_at:  nextFireTime(merged.time, merged.days),
        payload:  merged,
      });
    }
  };

  const deleteAlarm = async (id) => {
    if (isGuest) {
      local.deleteItem(id);
      cancelAlarm(id);
      return;
    }
    await deleteDoc(doc(db, 'users', uid, 'alarms', id));
    cancelAlarm(id);
  };

  return { alarms: currentAlarms, loading: isLoading, addAlarm, updateAlarm, deleteAlarm };
}

// ── Calculate next fire time from HH:MM string ─────────────────
// Respects the days array — finds the next matching weekday
function nextFireTime(timeStr, days = []) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();

  // Try today first, then up to 7 days ahead
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);

    // Must be in the future
    if (candidate <= now) continue;

    // If days array is empty or not specified, fire on any day
    if (!days || days.length === 0) return candidate.toISOString();

    // Check if this day of week is in the schedule
    const dayName = DAY_NAMES[candidate.getDay()];
    if (days.includes(dayName)) return candidate.toISOString();
  }

  // Fallback: just add 24h (should never reach here)
  const fallback = new Date(now.getTime() + 86400000);
  fallback.setHours(hours, minutes, 0, 0);
  return fallback.toISOString();
}
