// src/hooks/useAlarms.js
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { scheduleAlarm, cancelAlarm } from '../serviceWorkerRegistration';
import { useLocalCollection } from './useLocalStorage';

const GUEST_ID = 'mars-local-user';

export function useAlarms(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-alarms', []);
  const [alarms, setAlarms]   = useState([]);
  const [loading, setLoading] = useState(true);

  // Firestore mode (logged in)
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
      setAlarms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid, isGuest]);

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
      } else if (data.time || data.enabled) {
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
    } else if (data.time || data.enabled) {
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

// Calculate next fire time from HH:MM string
function nextFireTime(timeStr, days = []) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now  = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}
