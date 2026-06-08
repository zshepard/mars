// src/hooks/useHome.js
//
// Dynamic room management hook.
// Rooms are stored per-user in Firestore: users/{uid}/homeRooms/{roomId}
// Each room document contains: name, icon, temp, light, aroma, customSettings[]
// Custom settings are stored as an array inside the room document.
//
// For unauthenticated users, all state is kept in localStorage only.

import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc,
  setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const GUEST_ID = 'mars-local-user';

/* ── Default room shape ─────────────────────────────────────────────── */
function makeRoom(name, icon) {
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    icon,
    temp: 70,
    light: 80,
    aroma: false,
    customSettings: [],
    createdAt: Date.now(),
  };
}

/* ── Local storage helpers (guest / offline fallback) ───────────────── */
function getLocalRooms() {
  try {
    const raw = localStorage.getItem('mars-home-rooms-v2');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRooms(rooms) {
  localStorage.setItem('mars-home-rooms-v2', JSON.stringify(rooms));
}

/* ── Hook ───────────────────────────────────────────────────────────── */
export function useHome(uid) {
  const isGuest = !uid || uid === GUEST_ID;

  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);

  /* Subscribe to Firestore or load from localStorage */
  useEffect(() => {
    if (isGuest) {
      setRooms(getLocalRooms());
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users', uid, 'homeRooms'),
      (snap) => {
        const fromDB = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setRooms(fromDB);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [uid, isGuest]);

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const persist = async (room) => {
    if (isGuest) return;
    const { id, ...data } = room;
    await setDoc(
      doc(db, 'users', uid, 'homeRooms', id),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /* ── Add room ─────────────────────────────────────────────────────── */
  const addRoom = async ({ name, icon }) => {
    const room = makeRoom(name, icon);
    const updated = [...rooms, room];
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }
    await persist(room);
  };

  /* ── Delete room ──────────────────────────────────────────────────── */
  const deleteRoom = async (roomId) => {
    const updated = rooms.filter((r) => r.id !== roomId);
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }
    await deleteDoc(doc(db, 'users', uid, 'homeRooms', roomId));
  };

  /* ── Update a field on a room (temp, light, aroma, …) ─────────────── */
  const updateRoom = async (roomId, field, value) => {
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, [field]: value } : r
    );
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }

    await setDoc(
      doc(db, 'users', uid, 'homeRooms', roomId),
      { [field]: value, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /* ── Add a custom setting to a room ──────────────────────────────── */
  const addCustomSetting = async (roomId) => {
    const newSetting = {
      id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: '',
      value: '',
    };
    const updated = rooms.map((r) =>
      r.id === roomId
        ? { ...r, customSettings: [...(r.customSettings || []), newSetting] }
        : r
    );
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }

    const room = updated.find((r) => r.id === roomId);
    await setDoc(
      doc(db, 'users', uid, 'homeRooms', roomId),
      { customSettings: room.customSettings, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /* ── Update a custom setting field ──────────────────────────────── */
  const updateCustomSetting = async (roomId, settingId, field, value) => {
    const updated = rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        customSettings: (r.customSettings || []).map((s) =>
          s.id === settingId ? { ...s, [field]: value } : s
        ),
      };
    });
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }

    const room = updated.find((r) => r.id === roomId);
    await setDoc(
      doc(db, 'users', uid, 'homeRooms', roomId),
      { customSettings: room.customSettings, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /* ── Delete a custom setting ─────────────────────────────────────── */
  const deleteCustomSetting = async (roomId, settingId) => {
    const updated = rooms.map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        customSettings: (r.customSettings || []).filter((s) => s.id !== settingId),
      };
    });
    setRooms(updated);
    if (isGuest) { saveLocalRooms(updated); return; }

    const room = updated.find((r) => r.id === roomId);
    await setDoc(
      doc(db, 'users', uid, 'homeRooms', roomId),
      { customSettings: room.customSettings, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  return {
    rooms,
    loading,
    addRoom,
    deleteRoom,
    updateRoom,
    addCustomSetting,
    updateCustomSetting,
    deleteCustomSetting,
  };
}
