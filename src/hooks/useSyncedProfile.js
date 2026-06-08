// src/hooks/useSyncedProfile.js
//
// Real-time cross-platform profile sync
//
// How it works:
//   1. When a user is authenticated, this hook opens a Firestore onSnapshot()
//      listener on users/{uid}. Firebase's real-time transport delivers any
//      change to this document within milliseconds to ALL connected clients —
//      web browser AND Android WebView — simultaneously.
//
//   2. On each snapshot update, the hook:
//        a. Updates local React state with the latest profile data
//        b. Writes a syncState record (users/{uid}/syncState/web) so the
//           Android app can see when the web session last changed data
//        c. Dispatches a 'marsProfileSync' CustomEvent on the document so
//           any component can react to profile changes without prop drilling
//
//   3. The Android WebView bridge in index.tsx listens for the
//      'marsProfileSync' event and injects the updated profile into the
//      native layer via injectJavaScript(), keeping both sessions in sync.
//
// Identity guarantee:
//   The Firestore document path is users/{uid} where uid === Google sub ID.
//   Firebase enforces this via security rules — no other user can read or
//   write this document. The onSnapshot listener is only opened when
//   request.auth.uid matches the document owner.
//
// Usage:
//   const { profile, syncing, lastSyncAt } = useSyncedProfile(user);
//
//   profile     — latest Firestore user document (null if not loaded yet)
//   syncing     — true while the initial snapshot is loading
//   lastSyncAt  — JS Date of the most recent Firestore update
//
import { useState, useEffect, useRef } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Platform identifier — used in syncState to track which platform last wrote
const PLATFORM = 'web';

export function useSyncedProfile(user) {
  const [profile, setProfile]       = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const unsubRef                    = useRef(null);
  const isFirstSnapshotRef          = useRef(true);

  useEffect(() => {
    // Only open the listener for real authenticated (non-guest) users
    if (!user || user.isGuest || !user.uid) {
      setProfile(null);
      setSyncing(false);
      return;
    }

    setSyncing(true);
    isFirstSnapshotRef.current = true;

    const userRef = doc(db, 'users', user.uid);

    // ── Open the real-time Firestore listener ─────────────────────────────────
    // This single onSnapshot call delivers updates to ALL connected clients
    // (web tab + Android WebView) within ~100–300ms of any write.
    const unsub = onSnapshot(
      userRef,
      { includeMetadataChanges: false }, // only fire on server-confirmed writes
      (snapshot) => {
        if (!snapshot.exists()) {
          setSyncing(false);
          return;
        }

        const data = snapshot.data();
        const now  = new Date();

        // Update local state
        setProfile(data);
        setLastSyncAt(now);
        setSyncing(false);

        // ── Dispatch CustomEvent for components and the WebView bridge ────────
        // The Android WebView bridge listens for this event and injects the
        // updated profile into the native layer.
        if (typeof document !== 'undefined') {
          document.dispatchEvent(
            new CustomEvent('marsProfileSync', {
              detail: {
                profile:    data,
                syncedAt:   now.toISOString(),
                platform:   PLATFORM,
                isFirst:    isFirstSnapshotRef.current,
              },
            })
          );
        }

        // ── Write sync heartbeat (skip on first snapshot to avoid write loop) ─
        // Records that the web session is alive and when it last received data.
        // The Android app reads this to know if the web session is active.
        if (!isFirstSnapshotRef.current) {
          writeSyncState(user.uid, PLATFORM, now).catch((e) =>
            console.warn('[MARS Sync] syncState write (non-fatal):', e)
          );
        }

        isFirstSnapshotRef.current = false;
      },
      (error) => {
        console.warn('[MARS Sync] onSnapshot error:', error.code, error.message);
        setSyncing(false);
      }
    );

    unsubRef.current = unsub;

    // ── Write initial sync state on session start ─────────────────────────────
    writeSyncState(user.uid, PLATFORM, new Date()).catch((e) =>
      console.warn('[MARS Sync] initial syncState write (non-fatal):', e)
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [user?.uid]); // re-run only when the user's uid changes (i.e. sign in/out)

  return { profile, syncing, lastSyncAt };
}

// ---------------------------------------------------------------------------
// writeSyncState — records the last-seen timestamp for this platform
//
// Path: users/{uid}/syncState/{platform}
// Fields:
//   platform   string    — "web" | "android"
//   lastSeenAt timestamp — when this platform last received a Firestore update
//   userAgent  string    — browser/app user agent for debugging
// ---------------------------------------------------------------------------
async function writeSyncState(uid, platform, date) {
  const ref = doc(db, 'users', uid, 'syncState', platform);
  await setDoc(
    ref,
    {
      platform,
      lastSeenAt: serverTimestamp(),
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
    { merge: true }
  );
}
