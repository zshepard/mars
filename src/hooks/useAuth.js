// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from '../firebase/config';

const AuthContext = createContext(null);

const GUEST_KEY = 'mars-guest-mode';
const GUEST_ID  = 'mars-local-user';

// Write/update user profile in Firestore in the background (non-blocking)
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
    console.warn('Firestore user doc sync (non-fatal):', err);
  }
}

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

    // Safety timeout — never hang on loading screen longer than 5 seconds
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    // Handle mobile redirect result — fires after Google redirects back to the app.
    // With authDomain set to the current hostname, sessionStorage is accessible.
    getRedirectResult(auth).catch((err) => {
      console.warn('getRedirectResult error (non-fatal):', err);
    });

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
        // Set user IMMEDIATELY — don't wait for Firestore
        setUser({ ...firebaseUser, isGuest: false });
        // Sync profile to Firestore in the background (non-blocking)
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

  const loginWithGoogle = async () => {
    // On mobile (Android/iOS) use redirect — popup fails due to storage partitioning.
    // authDomain is set to the current hostname so the redirect stays same-origin.
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    if (isMobile) {
      return signInWithRedirect(auth, googleProvider);
    }
    // Desktop browser — popup works fine
    return signInWithPopup(auth, googleProvider);
  };

  const sendMagicLink = async (email) => {
    const actionCodeSettings = {
      url: window.location.origin + '/login?emailLink=1',
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
    <AuthContext.Provider value={{ user, guest, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, continueAsGuest, logout, sendMagicLink, completeMagicLinkSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
