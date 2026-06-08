// src/firebase/config.js
//
// Fix 2: authDomain is set to the current hostname (mars-lyart-alpha.vercel.app)
// instead of the default Firebase domain (mars-d3745.firebaseapp.com).
// This prevents Android Chrome storage-partitioning from blocking sign-in.
//
import { initializeApp }               from 'firebase/app';
import { getAuth, GoogleAuthProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore }                from 'firebase/firestore';
import { getMessaging, isSupported }   from 'firebase/messaging';

// Use the current hostname as authDomain so Google OAuth redirect stays on the same
// origin — this prevents Android Chrome's storage partitioning from blocking sign-in.
const resolvedAuthDomain = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Use the live domain for production, fall back to Firebase default for localhost
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  // Localhost fallback — use env var or Firebase default domain
  return process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'mars-d3745.firebaseapp.com';
})();

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || 'offline-mode',
  authDomain:        resolvedAuthDomain,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || 'mars-offline',
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || '1:000:web:000',
};

console.info('[MARS Firebase] authDomain =', resolvedAuthDomain);

const app = initializeApp(firebaseConfig);

export const auth            = getAuth(app);
export const db              = getFirestore(app);
export const googleProvider  = new GoogleAuthProvider();

// Ensure email + profile scopes are always requested
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Force account selection every time (prevents stale account auto-select)
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink };
export const VAPID_KEY       = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

// Check if Firebase is properly configured (not in offline-only mode)
export const isFirebaseConfigured = () => {
  return process.env.REACT_APP_FIREBASE_API_KEY && 
         process.env.REACT_APP_FIREBASE_API_KEY !== 'offline-mode';
};

export const getFirebaseMessaging = async () => {
  if (!isFirebaseConfigured()) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
