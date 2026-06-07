// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from '../firebase/config';

const AuthContext = createContext(null);

const GUEST_KEY = 'mars-guest-mode';
const GUEST_ID  = 'mars-local-user';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [guest, setGuest]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user previously chose guest mode
    const wasGuest = localStorage.getItem(GUEST_KEY) === 'true';
    if (wasGuest) {
      setGuest(true);
      setUser({ uid: GUEST_ID, displayName: 'Guest', isGuest: true });
      setLoading(false);
    }

    // Safety timeout — if loading is still true after 8 seconds, force it false.
    // Prevents infinite loading screen if Firebase/Firestore is slow or misconfigured.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    // Handle redirect result from Google Sign-In
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        // User signed in — upgrade from guest if applicable
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
        // Wrap Firestore in try/catch so a DB error never blocks the auth flow
        try {
          const ref = doc(db, 'users', firebaseUser.uid);
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
          console.warn('Firestore user doc error (non-fatal):', err);
        }
        setUser({ ...firebaseUser, isGuest: false });
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

  const loginWithGoogle = async () => {
    // Use popup for browser (works on any domain), redirect only for Android WebView
    const ua = navigator.userAgent || '';
    const inWebView = ua.includes('MARS-App') || ua.includes('wv') || ua.includes('WebView');
    if (inWebView) {
      return signInWithRedirect(auth, googleProvider);
    }
    // Popup flow — resolves immediately, no domain redirect issues
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  };

  const sendMagicLink = async (email) => {
    const actionCodeSettings = {
      url: window.location.origin + '/login?emailLink=1',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email to localStorage so we can complete sign-in when they return
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
    <AuthContext.Provider value={{ user, guest, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, continueAsGuest, logout, sendMagicLink, completeMagicLinkSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
