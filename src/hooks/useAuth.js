// src/hooks/useAuth.js
//
// Firebase Auth — 3 fixes applied:
//   Fix 1: Always use signInWithPopup() — never signInWithRedirect on mobile.
//           Redirect fails in Android WebView due to storage partitioning.
//           GSI (Google Identity Services) handles the native picker instead.
//   Fix 2: authDomain is set to the current hostname (mars-lyart-alpha.vercel.app)
//           so the OAuth redirect stays same-origin and sessionStorage is preserved.
//   Fix 3: /__/auth/* is proxied through Vercel (vercel.json) so Firebase's
//           cross-origin redirect handler works on the custom domain.
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from '../firebase/config';

const AuthContext = createContext(null);

const GUEST_KEY     = 'mars-guest-mode';
const GUEST_ID      = 'mars-local-user';
const GSI_CLIENT_ID = '656617062123-v0o86sbetu6hblb5cm0vs0sejs3dg3h9.apps.googleusercontent.com';

// ---------------------------------------------------------------------------
// Fix 2 (reinforced): Log the authDomain being used so it is visible in
// DevTools / Logcat — helps confirm the custom domain is active.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  console.info('[MARS Auth] authDomain =', auth.config?.authDomain ?? window.location.hostname);
}

// ---------------------------------------------------------------------------
// Initialize Google Identity Services (GSI)
// GSI opens a native Google account picker (Chrome Custom Tab on Android)
// instead of a WebView popup — this is the recommended approach for WebView apps.
// ---------------------------------------------------------------------------
export function initGSI(onCredential) {
  if (typeof window === 'undefined') return;

  const tryInit = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id:             GSI_CLIENT_ID,
        callback:              onCredential,
        auto_select:           false,
        cancel_on_tap_outside: true,
        // Fix 2: tell GSI which domain is hosting the sign-in page
        login_uri: window.location.origin + '/login',
      });
    }
  };

  // GSI script loads async — try immediately then wait for load event
  if (window.google?.accounts?.id) {
    tryInit();
  } else {
    window.addEventListener('load', tryInit, { once: true });
    // Extra retry in case the load event already fired
    setTimeout(tryInit, 1000);
  }
}

// ---------------------------------------------------------------------------
// Write/update user profile in Firestore (non-blocking background task)
// ---------------------------------------------------------------------------
async function syncUserProfile(firebaseUser) {
  try {
    const ref  = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:         firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email:       firebaseUser.email,
        photoURL:    firebaseUser.photoURL,
        createdAt:   serverTimestamp(),
      });
    }
  } catch (err) {
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

    // NOTE: getRedirectResult() is intentionally NOT called here.
    // Fix 1 removes all signInWithRedirect() usage, so there is never a
    // pending redirect result to consume.  Calling it anyway can throw
    // "auth/unauthorized-domain" on custom domains and block the loading state.

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
        setUser({ ...firebaseUser, isGuest: false });
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
  // Fix 1: loginWithGSI — primary sign-in path for ALL platforms.
  // GSI returns a credential JWT directly; no redirect or popup window needed.
  // -------------------------------------------------------------------------
  const loginWithGSI = async (idToken) => {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(auth, credential);
  };

  // -------------------------------------------------------------------------
  // Fix 1: loginWithGoogle — fallback popup for browsers where GSI is blocked.
  // Always uses signInWithPopup(); signInWithRedirect is never used.
  // -------------------------------------------------------------------------
  const loginWithGoogle = async () => {
    // signInWithPopup works on desktop and modern Android Chrome.
    // In a WebView the GSI button (loginWithGSI) is the preferred path.
    return signInWithPopup(auth, googleProvider);
  };

  // -------------------------------------------------------------------------
  // Email / magic-link auth
  // -------------------------------------------------------------------------
  const sendMagicLink = async (email) => {
    const actionCodeSettings = {
      url:            window.location.origin + '/login?emailLink=1',
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

  const loginWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signUpWithEmail = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    return cred;
  };

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, 'true');
    setGuest(true);
    setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
  };

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
