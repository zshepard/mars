// src/components/ProtectedRoute.jsx
//
// Route guard + real-time cross-platform sync bridge
//
// Route guard rules:
//   1. Auth state still loading  → show loading splash (no flash of /login)
//   2. user is null              → redirect to /login
//   3. user.isGuest === true     → allow through (guest mode enabled for testing)
//   4. real authenticated user   → render children
//
// Real-time sync bridge:
//   Once a real user is authenticated, this component opens a Firestore
//   onSnapshot() listener via useSyncedProfile(). Any change to the user's
//   profile document in Firestore is delivered to ALL connected sessions
//   (web + Android WebView) within ~100–300ms.
//
//   When a profile update arrives, the 'marsProfileSync' CustomEvent is
//   dispatched. The Android WebView bridge listens for this event and
//   injects the updated profile into the native layer via injectJavaScript().
//
// Identity:
//   The Firestore listener path is users/{uid} where uid === Google sub ID.
//   Firebase security rules ensure only the owning user can read this path.
//
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSyncedProfile } from '../hooks/useSyncedProfile';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Open the real-time Firestore listener for the authenticated user.
  // useSyncedProfile is a no-op when user is null or guest.
  useSyncedProfile(user); // starts the Firestore listener; profile/sync state handled internally

  // ── Android WebView sync bridge ─────────────────────────────────────────────
  // When the Firestore profile updates, inject the new profile into the
  // Android native layer so both sessions stay in sync without a page reload.
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleProfileSync = (event) => {
      const { profile: updatedProfile, syncedAt, isFirst } = event.detail;

      // Only push to native layer if we are running inside the MARS Android app
      if (!window.ReactNativeWebView) return;

      // Skip the initial snapshot (it is just the current state, not a change)
      if (isFirst) return;

      // Inject the updated profile into the native layer
      // The Expo app can use this to update any native UI or AsyncStorage cache
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type:      'PROFILE_SYNC',
          profile:   updatedProfile,
          syncedAt,
          platform:  'web',
        })
      );
    };

    document.addEventListener('marsProfileSync', handleProfileSync);
    return () => document.removeEventListener('marsProfileSync', handleProfileSync);
  }, []);

  // ── Route guard ─────────────────────────────────────────────────────────────

  // 1. Still resolving Firebase auth state
  if (loading) {
    return (
      <div className="full-screen-center">
        <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          <span style={{ color: '#1D9E75' }}>M</span>ARS
        </div>
        <span style={{ fontSize: 13, opacity: 0.5, marginTop: 8 }}>Loading…</span>
      </div>
    );
  }

  // 2. Not signed in — redirect to login
  // Preserve the attempted URL so Login can redirect back after sign-in
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3 & 4. Guest or authenticated real user — allow through
  // Guest data is local-only; Firestore hooks guard against guest uid automatically
  return children;
}
