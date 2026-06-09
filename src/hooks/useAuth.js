// src/hooks/useAuth.js
//
// Google OAuth 2.0 Sign-In — secure implementation
//
// Environment variables required (set in .env or Vercel dashboard):
//   REACT_APP_GOOGLE_CLIENT_ID     — Your Google OAuth 2.0 Client ID
//                                    (from Google Cloud Console → APIs & Services → Credentials)
//   REACT_APP_GOOGLE_CLIENT_SECRET — Your Google OAuth 2.0 Client Secret
//                                    (NOTE: never expose this in client-side code in production;
//                                     for a full server-side flow, move token exchange to a
//                                     backend API route / Vercel serverless function)
//   REACT_APP_FIREBASE_API_KEY     — Firebase project API key
//   REACT_APP_FIREBASE_PROJECT_ID  — Firebase project ID
//   REACT_APP_FIREBASE_APP_ID      — Firebase app ID
//
// OAuth 2.0 flow implemented here:
//   1. User taps "Sign in with Google"
//   2. On Android WebView:
//        native bridge (window.__nativeGoogleSignIn) calls
//        GoogleSignin.signIn() → AndroidX Credential Manager bottom sheet
//        → idToken returned via marsGoogleSignIn CustomEvent
//        → signInWithCredential(GoogleAuthProvider.credential(idToken))
//      On desktop browser:
//        Firebase signInWithPopup() → Google account picker popup
//        → id_token returned directly
//      GSI button (desktop fallback):
//        Google Identity Services renders a native button → id_token
//        → loginWithGSI(idToken)
//   3. signInWithCredential() exchanges the token with Firebase Auth
//   4. Firebase returns a verified user object with name, email, photoURL
//   5. syncUserProfile() saves/updates the user record in Firestore:
//        users/{uid} → { uid, displayName, email, photoURL, provider,
//                        createdAt, lastLoginAt, loginCount }
//
import { useState, useEffect, createContext, useContext } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from '../firebase/config';

const AuthContext = createContext(null);

const GUEST_KEY = 'mars-guest-mode';
const GUEST_ID  = 'mars-local-user';

// ---------------------------------------------------------------------------
// Google OAuth 2.0 Client ID
// Replace the placeholder below with your actual Client ID, or set the
// REACT_APP_GOOGLE_CLIENT_ID environment variable in Vercel / .env
// ---------------------------------------------------------------------------
const GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID ||
  '656617062123-v0o86sbetu6hblb5cm0vs0sejs3dg3h9.apps.googleusercontent.com';
  // ↑ PLACEHOLDER — set REACT_APP_GOOGLE_CLIENT_ID in your environment

// NOTE: The Google Client Secret (REACT_APP_GOOGLE_CLIENT_SECRET) is only
// needed for server-side token exchange (authorization code flow).
// The current implementation uses the implicit/token flow via Firebase Auth,
// which does NOT require the client secret on the frontend.
// If you move to a server-side flow, add a Vercel serverless function at
// /api/auth/google and use process.env.REACT_APP_GOOGLE_CLIENT_SECRET there.

// Log the auth domain on startup for debugging
if (typeof window !== 'undefined') {
  console.info('[MARS Auth] authDomain =', auth.config?.authDomain ?? window.location.hostname);
  console.info('[MARS Auth] Google Client ID =', GOOGLE_CLIENT_ID.slice(0, 20) + '...');
}

// ---------------------------------------------------------------------------
// Initialize Google Identity Services (GSI) button renderer
// GSI is used on desktop browsers — it renders a native Google button that
// opens an account picker and returns an id_token directly (no redirect).
// ---------------------------------------------------------------------------
export function initGSI(onCredential) {
  if (typeof window === 'undefined') return;

  const tryInit = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id:             GOOGLE_CLIENT_ID,
        callback:              onCredential,
        auto_select:           false,
        cancel_on_tap_outside: true,
        login_uri:             window.location.origin + '/login',
      });
    }
  };

  if (window.google?.accounts?.id) {
    tryInit();
  } else {
    window.addEventListener('load', tryInit, { once: true });
    setTimeout(tryInit, 1000);
  }
}

// ---------------------------------------------------------------------------
// syncUserProfile — saves/updates the user record in Firestore
//
// Identity model:
//   The Firestore document key is firebaseUser.uid which Firebase sets to
//   the Google OAuth "sub" claim from the ID token. This means:
//     - users are identified by their immutable Google sub ID, NOT by email
//     - email changes on Google do NOT create a new user record
//     - the same Google account always maps to the same Firestore document
//
// Schema: users/{uid}   (uid === Google sub ID for Google sign-in)
//   uid             string    — Firebase UID = Google sub (immutable)
//   googleSub       string    — Explicit copy of Google sub for queryability
//   displayName     string    — Full name (from Google, updated on each login)
//   email           string    — Email (from Google, updated on each login)
//   emailVerified   boolean   — Whether Google has verified this email
//   photoURL        string    — Profile photo URL
//   primaryProvider string    — "google.com" | "password" | "emailLink"
//   providerData    array     — Snapshot of all linked providers:
//                               [{ providerId, uid, email, displayName, photoURL }]
//   createdAt       timestamp — First sign-in (set once, never overwritten)
//   lastLoginAt     timestamp — Updated on every sign-in
//   lastSeenAt      timestamp — Updated on every sign-in (alias for sync)
//   loginCount      number    — Incremented on every sign-in
//   platform        string    — "web" | "android" (last platform used)
// ---------------------------------------------------------------------------
async function syncUserProfile(firebaseUser, platform = 'web') {
  try {
    const ref  = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);

    // Primary provider (first linked provider)
    const primaryProvider =
      firebaseUser.providerData?.[0]?.providerId || 'unknown';

    // Google sub ID — for Google sign-in, providerData[0].uid === Google sub
    // Firebase also sets firebaseUser.uid === Google sub for Google-primary accounts
    const googleProvider = firebaseUser.providerData?.find(
      (p) => p.providerId === 'google.com'
    );
    const googleSub = googleProvider?.uid || firebaseUser.uid;

    // Snapshot of all linked providers (safe to store — no secrets)
    const providerData = (firebaseUser.providerData || []).map((p) => ({
      providerId:  p.providerId,
      uid:         p.uid,          // provider-specific user ID (Google sub for google.com)
      email:       p.email  || '',
      displayName: p.displayName || '',
      photoURL:    p.photoURL    || '',
    }));

    const now = serverTimestamp();

    if (!snap.exists()) {
      // ── First-time sign-in: create the full user record ──────────────────
      await setDoc(ref, {
        // Identity (immutable after creation)
        uid:             firebaseUser.uid,
        googleSub,                           // Google sub ID — the canonical identity key

        // Profile (mutable — updated on each login)
        displayName:     firebaseUser.displayName   || '',
        email:           firebaseUser.email         || '',
        emailVerified:   firebaseUser.emailVerified ?? false,
        photoURL:        firebaseUser.photoURL      || '',

        // Provider data
        primaryProvider,
        providerData,

        // Timestamps
        createdAt:       now,
        lastLoginAt:     now,
        lastSeenAt:      now,
        loginCount:      1,

        // Platform tracking
        platform,
        platforms:       [platform],         // list of all platforms ever used
      });
      console.info('[MARS Auth] New user record created — sub:', googleSub, 'email:', firebaseUser.email);
    } else {
      // ── Returning user: update mutable fields only ────────────────────────
      // IMPORTANT: uid and googleSub are NEVER overwritten — they are the
      // immutable identity anchors. Email changes on Google do not change
      // which Firestore document this user owns.
      //
      // Use setDoc with merge instead of updateDoc — this is safe even if the
      // document was never properly created (e.g. first sign-in failed silently
      // during the broken authDomain period). updateDoc would throw on a missing doc.
      const existing = snap.data();
      const existingPlatforms = existing.platforms || [];
      const updatedPlatforms = existingPlatforms.includes(platform)
        ? existingPlatforms
        : [...existingPlatforms, platform];

      await setDoc(ref, {
        // Profile — always refresh from the authoritative Google token
        displayName:     firebaseUser.displayName   || existing.displayName || '',
        email:           firebaseUser.email         || existing.email       || '',
        emailVerified:   firebaseUser.emailVerified ?? existing.emailVerified ?? false,
        photoURL:        firebaseUser.photoURL      || existing.photoURL    || '',

        // Provider data snapshot
        providerData,

        // Timestamps
        lastLoginAt:     now,
        lastSeenAt:      now,
        loginCount:      increment(1),

        // Platform tracking
        platform,
        platforms:       updatedPlatforms,
      }, { merge: true }); // merge: true preserves uid, googleSub, createdAt, alarms, etc.
    }
  } catch (err) {
    // Non-fatal — user is still signed in even if Firestore write fails
    console.warn('[MARS Auth] Firestore user doc sync (non-fatal):', err);
  }
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [guest, setGuest]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wasGuest = localStorage.getItem(GUEST_KEY) === 'true';
    // NOTE: Do NOT commit to guest mode here — wait for onAuthStateChanged first.
    // If Firebase returns a real user, it overrides the guest flag.
    // Only fall back to guest if Firebase returns null (truly signed out).

    // Safety timeout — never hang on the loading screen longer than 5 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('[MARS Auth] Safety timeout — forcing guest mode');
      if (wasGuest) {
        setGuest(true);
        setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
      } else {
        setUser(null);
      }
      setLoading(false);
    }, 5000);

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        // Real Firebase user — always override guest mode
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
        setUser({ ...firebaseUser, isGuest: false });
        syncUserProfile(firebaseUser);
      } else {
        // Firebase returned null — no active session
        if (wasGuest) {
          // Restore guest mode only if user explicitly chose it
          setGuest(true);
          setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsub();
      clearTimeout(safetyTimer);
    };
  }, []);

  // -------------------------------------------------------------------------
  // loginWithGSI
  // Called when the GSI button returns an id_token credential JWT.
  // Firebase exchanges this for a session — no redirect needed.
  // -------------------------------------------------------------------------
  const loginWithGSI = async (idToken) => {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  };

  // -------------------------------------------------------------------------
  // loginWithAccessToken
  // Called when the native Android bridge returns a Google access_token.
  // Kept for backward compatibility; idToken path is preferred.
  // -------------------------------------------------------------------------
  const loginWithAccessToken = async (accessToken) => {
    const credential = GoogleAuthProvider.credential(null, accessToken);
    return signInWithCredential(auth, credential);
  };

  // -------------------------------------------------------------------------
  // loginWithGoogle — primary Google sign-in entry point
  //
  // Platform routing:
  //   Android WebView  → native bridge (window.__nativeGoogleSignIn)
  //                       → AndroidX Credential Manager single-tap bottom sheet
  //                       → idToken returned via marsGoogleSignIn CustomEvent
  //                       → signInWithCredential(GoogleAuthProvider.credential(idToken))
  //
  //   Desktop browser  → signInWithPopup() with GoogleAuthProvider
  //                       → Google account picker popup
  //                       → id_token returned directly
  //
  // signInWithRedirect() is intentionally NOT used — it fails in WebView
  // due to Android Chrome's storage partitioning (third-party cookie block).
  // -------------------------------------------------------------------------
  const loginWithGoogle = async () => {
    // Android WebView: AndroidX Credential Manager bridge is available
    if (window.__marsNativeGoogleSignIn && window.__nativeGoogleSignIn) {
      window.__nativeGoogleSignIn();
      return new Promise((resolve, reject) => {
        const onSuccess = async (e) => {
          document.removeEventListener('marsGoogleSignIn', onSuccess);
          document.removeEventListener('marsGoogleSignInError', onError);
          try {
            let cred;
            if (e.detail.idToken) {
              // Credential Manager path — idToken from GoogleSignin.signIn()
              const credential = GoogleAuthProvider.credential(e.detail.idToken);
              cred = await signInWithCredential(auth, credential);
            } else if (e.detail.accessToken) {
              // Legacy access_token path (fallback)
              cred = await loginWithAccessToken(e.detail.accessToken);
            } else {
              throw new Error('No token returned from native Google Sign-In');
            }
            resolve(cred);
          } catch (err) {
            reject(err);
          }
        };
        const onError = (e) => {
          document.removeEventListener('marsGoogleSignIn', onSuccess);
          document.removeEventListener('marsGoogleSignInError', onError);
          reject(new Error(e.detail?.error || 'Google sign-in cancelled'));
        };
        document.addEventListener('marsGoogleSignIn', onSuccess, { once: true });
        document.addEventListener('marsGoogleSignInError', onError, { once: true });
      });
    }
    // Desktop browser: use popup
    return signInWithPopup(auth, googleProvider);
  };

  // -------------------------------------------------------------------------
  // Email / password auth
  // -------------------------------------------------------------------------
  const loginWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUpWithEmail = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    return cred;
  };

  // -------------------------------------------------------------------------
  // Magic link (passwordless email) auth
  // -------------------------------------------------------------------------
  const sendMagicLink = async (email) => {
    const actionCodeSettings = {
      url:             window.location.origin + '/login?emailLink=1',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('mars-email-link-pending', email);
  };

  const completeMagicLinkSignIn = async (email, link) => {
    if (!isSignInWithEmailLink(auth, link)) throw new Error('Invalid sign-in link');
    const cred = await signInWithEmailLink(auth, email, link);
    localStorage.removeItem('mars-email-link-pending');
    return cred;
  };

  // -------------------------------------------------------------------------
  // Guest mode — local only, no Firebase account
  // -------------------------------------------------------------------------
  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, 'true');
    setGuest(true);
    setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
  };

  // -------------------------------------------------------------------------
  // Profile management
  // -------------------------------------------------------------------------

  // Update display name in Firebase Auth + Firestore
  const updateUsername = async (newDisplayName) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updateProfile(auth.currentUser, { displayName: newDisplayName });
    // Sync to Firestore
    const ref = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(ref, { displayName: newDisplayName });
    // Update local state so UI reflects immediately
    setUser((prev) => prev ? { ...prev, displayName: newDisplayName } : prev);
  };

  // Set a password on a Google-only account (links email+password provider)
  // OR update the existing password (requires recent sign-in)
  const setOrUpdatePassword = async (newPassword, currentPassword = null) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not signed in');

    const hasPasswordProvider = firebaseUser.providerData.some(
      (p) => p.providerId === 'password'
    );

    if (hasPasswordProvider) {
      // Already has a password — re-authenticate first, then update
      if (!currentPassword) throw new Error('current_password_required');
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
    } else {
      // Google-only account — link email+password provider
      const credential = EmailAuthProvider.credential(firebaseUser.email, newPassword);
      await linkWithCredential(firebaseUser, credential);
    }
  };

  // Send a password reset email (works for both email+password and Google accounts)
  const sendPasswordReset = async (email) => {
    const targetEmail = email || auth.currentUser?.email;
    if (!targetEmail) throw new Error('No email address available');
    await sendPasswordResetEmail(auth, targetEmail);
  };

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------
  const logout = async () => {
    localStorage.removeItem(GUEST_KEY);
    setGuest(false);
    setUser(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        guest,
        loading,
        loginWithGoogle,
        loginWithGSI,
        loginWithAccessToken,
        loginWithEmail,
        signUpWithEmail,
        continueAsGuest,
        logout,
        sendMagicLink,
        completeMagicLinkSignIn,
        updateUsername,
        setOrUpdatePassword,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
