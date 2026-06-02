// src/hooks/useRoutines.js
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useLocalCollection } from './useLocalStorage';

const GUEST_ID = 'mars-local-user';

const DEFAULT_STEPS = [
  { id: 's1', label: 'Alarm fires',   icon: 'ti-alarm',       done: false },
  { id: 's2', label: 'Lights fade in',icon: 'ti-sun',         done: false },
  { id: 's3', label: 'Music plays',   icon: 'ti-music',       done: false },
  { id: 's4', label: 'Dismiss alarm', icon: 'ti-hand-stop',   done: false },
  { id: 's5', label: 'URL opens',     icon: 'ti-external-link',done: false },
  { id: 's6', label: 'Health check',  icon: 'ti-heart-rate',  done: false },
  { id: 's7', label: 'House adjusts', icon: 'ti-home',        done: false },
];

export function useRoutines(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const local = useLocalCollection('mars-routines', []);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading]   = useState(true);

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
      setRoutines(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid, isGuest]);

  const currentRoutines = isGuest ? local.items : routines;
  const isLoading = isGuest ? local.loading : loading;

  const addRoutine = (data) => {
    const routineData = {
      name:   data.name || 'New Routine',
      type:   data.type || 'morning',
      days:   data.days || ['Mon','Tue','Wed','Thu','Fri'],
      steps:  data.steps || DEFAULT_STEPS,
      active: true,
    };
    if (isGuest) {
      return local.addItem(routineData);
    }
    return addDoc(collection(db, 'users', uid, 'routines'), {
      ...routineData,
      createdAt: serverTimestamp(),
    });
  };

  const updateRoutine = (id, data) => {
    if (isGuest) {
      local.updateItem(id, data);
      return;
    }
    return updateDoc(doc(db, 'users', uid, 'routines', id), {
      ...data, updatedAt: serverTimestamp(),
    });
  };

  const deleteRoutine = (id) => {
    if (isGuest) {
      local.deleteItem(id);
      return;
    }
    return deleteDoc(doc(db, 'users', uid, 'routines', id));
  };

  return { routines: currentRoutines, loading: isLoading, addRoutine, updateRoutine, deleteRoutine, DEFAULT_STEPS };
}
