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
// Schema: users/{uid}
//   uid          string   — Firebase user ID
//   displayName  string   — Full name from Google account
//   email        string   — Email address from Google account
//   photoURL     string   — Profile photo URL from Google account
//   provider     string   — "google.com" | "password" | "emailLink"
//   createdAt    timestamp — First sign-in time (set once, never overwritten)
//   lastLoginAt  timestamp — Updated on every sign-in
//   loginCount   number   — Incremented on every sign-in
// ---------------------------------------------------------------------------
async function syncUserProfile(firebaseUser) {
  try {
    const ref  = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);

    // Determine the sign-in provider
    const provider =
      firebaseUser.providerData?.[0]?.providerId || 'unknown';

    if (!snap.exists()) {
      // First-time sign-in — create the full user record
      await setDoc(ref, {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName  || '',
        email:       firebaseUser.email        || '',
        photoURL:    firebaseUser.photoURL     || '',
        provider,
        createdAt:   serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        loginCount:  1,
      });
      console.info('[MARS Auth] New user record created for', firebaseUser.email);
    } else {
      // Returning user — update mutable fields only
      await updateDoc(ref, {
        displayName: firebaseUser.displayName  || snap.data().displayName || '',
        email:       firebaseUser.email        || snap.data().email       || '',
        photoURL:    firebaseUser.photoURL     || snap.data().photoURL    || '',
        lastLoginAt: serverTimestamp(),
        loginCount:  increment(1),
      });
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
    if (wasGuest) {
      setGuest(true);
      setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
      setLoading(false);
    }

    // Safety timeout — never hang on the loading screen longer than 5 seconds
    const safetyTimer = setTimeout(() => {
      console.warn('[MARS Auth] Safety timeout — forcing loading=false');
      setLoading(false);
    }, 5000);

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
        // Expose user immediately — don't block on Firestore
        setUser({ ...firebaseUser, isGuest: false });
        // Save/update user record in Firestore in the background
        syncUserProfile(firebaseUser);
      } else {
        if (!wasGuest) setUser(null);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
