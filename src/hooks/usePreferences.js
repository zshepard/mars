// src/hooks/usePreferences.js
//
// Syncs user preferences to Firestore users/{uid} document under a
// `preferences` map field. Falls back to localStorage for guests.
//
// Synced preferences:
//   clockFormat    — '12' | '24'
//   snoozeDuration — number (minutes, 1–60)
//   heyMars        — boolean
//   backgroundPack — string (pack id)
//
// Usage:
//   const { prefs, updatePref } = usePreferences(user);
//
//   prefs.clockFormat    → '12' or '24'
//   prefs.snoozeDuration → 5
//   updatePref('clockFormat', '24')  → writes to Firestore + localStorage
//
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const GUEST_ID = 'mars-local-user';

// Default preferences
const DEFAULTS = {
  clockFormat:    '12',
  snoozeDuration: 5,
  heyMars:        true,
  backgroundPack: 'default-dark',
};

// Read all prefs from localStorage (used as initial state + guest fallback)
function readLocalPrefs() {
  try {
    return {
      clockFormat:    localStorage.getItem('mars-clock-24hr') === 'true' ? '24' : '12',
      snoozeDuration: parseInt(localStorage.getItem('mars-snooze-duration') || '5', 10),
      heyMars:        localStorage.getItem('mars-hey-mars') !== 'false',
      backgroundPack: localStorage.getItem('mars-background-pack') || 'default-dark',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

// Mirror a single pref to localStorage so existing hooks that read
// localStorage directly (Topbar clock, useWakeWord, useAlarmTimer) still work.
function mirrorToLocal(key, value) {
  try {
    switch (key) {
      case 'clockFormat':
        localStorage.setItem('mars-clock-24hr', value === '24' ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('mars:clock-format-changed'));
        break;
      case 'snoozeDuration':
        localStorage.setItem('mars-snooze-duration', String(value));
        break;
      case 'heyMars':
        localStorage.setItem('mars-hey-mars', value ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('mars:hey-mars-toggle', { detail: value }));
        break;
      case 'backgroundPack':
        localStorage.setItem('mars-background-pack', value);
        window.dispatchEvent(new CustomEvent('mars:background-pack-changed', { detail: value }));
        break;
      default:
        break;
    }
  } catch (_) {}
}

export function usePreferences(user) {
  const isGuest = !user || user.isGuest || user.uid === GUEST_ID;
  const [prefs, setPrefs] = useState(() => readLocalPrefs());
  const unsubRef = useRef(null);
  const pendingWrite = useRef(null);

  // ── Firestore listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (isGuest || !user?.uid) {
      // Guest: just use localStorage, no Firestore
      setPrefs(readLocalPrefs());
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsub = onSnapshot(userRef, { includeMetadataChanges: false }, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remote = data.preferences;
      if (!remote) return;

      // Merge remote prefs with defaults (remote wins)
      const merged = { ...DEFAULTS, ...remote };
      setPrefs(merged);

      // Mirror to localStorage so other hooks stay in sync
      Object.entries(merged).forEach(([k, v]) => mirrorToLocal(k, v));
    });

    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [user?.uid, isGuest]);

  // ── updatePref — write a single preference ────────────────────────────────
  const updatePref = useCallback(async (key, value) => {
    // Optimistic local update
    setPrefs((prev) => ({ ...prev, [key]: value }));
    mirrorToLocal(key, value);

    if (isGuest || !user?.uid) return; // guest: localStorage only

    // Debounce rapid writes (e.g. snooze duration slider)
    if (pendingWrite.current) clearTimeout(pendingWrite.current);
    pendingWrite.current = setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { [`preferences.${key}`]: value });
      } catch (e) {
        console.warn('[MARS Prefs] Failed to write preference:', key, e);
      }
    }, 400);
  }, [user?.uid, isGuest]);

  return { prefs, updatePref };
}
