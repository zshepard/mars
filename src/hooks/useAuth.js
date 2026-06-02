// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

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

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User signed in — upgrade from guest if applicable
        localStorage.removeItem(GUEST_KEY);
        setGuest(false);
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
        setUser({ ...firebaseUser, isGuest: false });
      } else if (!wasGuest) {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

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
    <AuthContext.Provider value={{ user, guest, loading, loginWithGoogle, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
