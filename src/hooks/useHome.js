// src/hooks/useHome.js
import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { queueHomeAction } from '../serviceWorkerRegistration';

const GUEST_ID = 'mars-local-user';

const DEFAULT_ROOMS = [
  { id: 'master',    name: 'Master Bedroom', icon: 'ti-bed',            light: 80, temp: 70, volume: 45, aroma: false },
  { id: 'living',    name: 'Living Room',    icon: 'ti-sofa',           light: 90, temp: 72, volume: 60, aroma: false },
  { id: 'kids',      name: "Kids Room",      icon: 'ti-ball-basketball', light: 70, temp: 71, volume: 35, aroma: false },
  { id: 'office',    name: 'Office',         icon: 'ti-briefcase',      light: 95, temp: 70, volume: 40, aroma: false },
  { id: 'vehicle',   name: 'Vehicle',        icon: 'ti-car',            light: 50, temp: 69, volume: 55, aroma: false },
];

const MOOD_PRESETS = {
  energized: { light: 100, temp: 70, volume: 70 },
  focused:   { light: 90,  temp: 68, volume: 30 },
  calm:      { light: 40,  temp: 72, volume: 20 },
  tired:     { light: 20,  temp: 74, volume: 15 },
  anxious:   { light: 60,  temp: 71, volume: 25 },
};

function getLocalRooms() {
  try {
    const raw = localStorage.getItem('mars-home-rooms');
    return raw ? JSON.parse(raw) : DEFAULT_ROOMS;
  } catch {
    return DEFAULT_ROOMS;
  }
}

function saveLocalRooms(rooms) {
  localStorage.setItem('mars-home-rooms', JSON.stringify(rooms));
}

export function useHome(uid) {
  const isGuest = !uid || uid === GUEST_ID;
  const [rooms, setRooms]     = useState(isGuest ? getLocalRooms() : DEFAULT_ROOMS);
  const [mood, setMoodState]  = useState('energized');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isGuest) {
      setRooms(getLocalRooms());
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'homeRooms'),
      (snap) => {
        if (!snap.empty) {
          const fromDB = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setRooms(fromDB);
        }
        setLoading(false);
      }
    );
    return unsub;
  }, [uid, isGuest]);

  const updateRoom = async (roomId, field, value) => {
    const updated = rooms.map((r) => (r.id === roomId ? { ...r, [field]: value } : r));
    setRooms(updated);

    if (isGuest) {
      saveLocalRooms(updated);
      return;
    }

    const action = { type: 'ROOM_UPDATE', roomId, field, value, timestamp: Date.now() };
    if (navigator.onLine) {
      await setDoc(
        doc(db, 'users', uid, 'homeRooms', roomId),
        { [field]: value, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } else {
      queueHomeAction(action);
    }
  };

  const applyMood = async (moodKey) => {
    setMoodState(moodKey);
    const preset = MOOD_PRESETS[moodKey];
    if (!preset) return;
    const updated = rooms.map((r) => ({ ...r, ...preset }));
    setRooms(updated);

    if (isGuest) {
      saveLocalRooms(updated);
      return;
    }

    for (const room of updated) {
      if (navigator.onLine) {
        await setDoc(
          doc(db, 'users', uid, 'homeRooms', room.id),
          { ...preset, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } else {
        queueHomeAction({ type: 'MOOD_APPLY', roomId: room.id, preset, moodKey });
      }
    }
  };

  return { rooms, mood, loading, updateRoom, applyMood, MOOD_PRESETS };
}
