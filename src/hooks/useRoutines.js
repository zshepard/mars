// src/hooks/useRoutines.js
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { scheduleAlarm, cancelAlarm } from './useAlarms';
import { useLocalCollection } from './useLocalStorage';

const GUEST_ID = 'mars-local-user';

export const DEFAULT_STEPS = [
  { id: 's1', label: 'Alarm fires',    icon: 'ti-alarm',        done: false },
  { id: 's2', label: 'Lights fade in', icon: 'ti-sun',          done: false },
  { id: 's3', label: 'Music plays',    icon: 'ti-music',        done: false },
  { id: 's4', label: 'Dismiss alarm',  icon: 'ti-hand-stop',    done: false },
  { id: 's5', label: 'URL opens',      icon: 'ti-external-link',done: false },
  { id: 's6', label: 'Health check',   icon: 'ti-heart-rate',   done: false },
  { id: 's7', label: 'House adjusts',  icon: 'ti-home',         done: false },
];

// ── Calculate next fire time for a routine ─────────────────────
function nextRoutineFireTime(timeStr, days = []) {
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

// ── Register a routine's trigger alarm with the SW ─────────────
function scheduleRoutineTrigger(routine) {
  if (!routine.triggerTime || routine.active === false) return;
  scheduleAlarm({
    alarm_id: `routine-${routine.id}`,
    fire_at:  nextRoutineFireTime(routine.triggerTime, routine.days),
    payload:  {
      label:       routine.name,
      body:        `Time to start: ${routine.name}`,
      sound:       routine.sound || 'alarm-default',
      routine_id:  routine.id,
      routine_step: routine.steps?.[0]?.id || null,
      open_url:    routine.openUrl || null,
      open_device: routine.openDevice || 'phone',
    },
  });
}

function cancelRoutineTrigger(routineId) {
  cancelAlarm(`routine-${routineId}`);
}

export function useRoutines(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-routines', []);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading]   = useState(true);

  // ── Firestore mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'users', uid, 'routines'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRoutines(data);
      setLoading(false);

      // Re-register all active routines with trigger times
      data.forEach((r) => {
        if (r.active !== false && r.triggerTime) {
          scheduleRoutineTrigger(r);
        } else {
          cancelRoutineTrigger(r.id);
        }
      });
    });
    return unsub;
  }, [uid, isGuest]);

  // ── Re-register local (guest) routines on load ─────────────────
  useEffect(() => {
    if (!isGuest) return;
    local.items.forEach((r) => {
      if (r.active !== false && r.triggerTime) {
        scheduleRoutineTrigger(r);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, local.items]);

  const currentRoutines = isGuest ? local.items : routines;
  const isLoading = isGuest ? local.loading : loading;

  const addRoutine = async (data) => {
    const routineData = {
      name:        data.name || 'New Routine',
      type:        data.type || 'morning',
      days:        data.days || ['Mon','Tue','Wed','Thu','Fri'],
      steps:       data.steps || DEFAULT_STEPS,
      active:      true,
      triggerTime: data.triggerTime || '',   // HH:MM string, empty = no auto-trigger
      sound:       data.sound || 'alarm-default',
      openUrl:     data.openUrl || '',
      openDevice:  data.openDevice || 'phone',
    };
    if (isGuest) {
      const newItem = local.addItem(routineData);
      if (routineData.triggerTime) scheduleRoutineTrigger({ ...routineData, id: newItem.id });
      return newItem;
    }
    const ref = await addDoc(collection(db, 'users', uid, 'routines'), {
      ...routineData,
      createdAt: serverTimestamp(),
    });
    if (routineData.triggerTime) scheduleRoutineTrigger({ ...routineData, id: ref.id });
    return ref;
  };

  const updateRoutine = async (id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      const routine = local.items.find((r) => r.id === id);
      const merged = { ...routine, ...data };
      if (merged.active === false || !merged.triggerTime) {
        cancelRoutineTrigger(id);
      } else {
        scheduleRoutineTrigger(merged);
      }
      return;
    }
    await updateDoc(doc(db, 'users', uid, 'routines', id), {
      ...data, updatedAt: serverTimestamp(),
    });
    const routine = routines.find((r) => r.id === id);
    const merged = { ...routine, ...data };
    if (merged.active === false || !merged.triggerTime) {
      cancelRoutineTrigger(id);
    } else {
      scheduleRoutineTrigger(merged);
    }
  };

  const deleteRoutine = async (id) => {
    cancelRoutineTrigger(id);
    if (isGuest) {
      local.deleteItem(id);
      return;
    }
    await deleteDoc(doc(db, 'users', uid, 'routines', id));
  };

  return {
    routines: currentRoutines,
    loading: isLoading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    DEFAULT_STEPS,
  };
}
