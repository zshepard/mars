// src/firebase/config.js
//
// authDomain MUST be the Firebase default domain (mars-d3745.firebaseapp.com).
// Using the Vercel hostname (mars-lyart-alpha.vercel.app) breaks Google OAuth
// because it is not registered as an authorized redirect URI in Google Cloud Console,
// causing the popup to complete but the auth session to never be written back.
//
import { initializeApp }               from 'firebase/app';
import { getAuth, GoogleAuthProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getMessaging, isSupported }   from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || 'offline-mode',
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || 'mars-d3745.firebaseapp.com',
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || 'mars-offline',
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || '1:000:web:000',
};


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

// ---------------------------------------------------------------------------
// reconnectFirestore — force Firestore to re-establish its WebSocket/gRPC
// connection. Call this when the app detects a stale "client offline" state.
//
// How it works:
//   1. disableNetwork() tears down the existing transport layer
//   2. enableNetwork() creates a fresh connection with the current auth token
//
// This resolves the common case where the Firestore connection was opened
// before the auth token was ready, or a stale service worker blocked the
// initial handshake.
// ---------------------------------------------------------------------------
export async function reconnectFirestore() {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    return true;
  } catch (err) {
    console.warn('[MARS Firestore] Reconnect failed:', err);
    return false;
  }
}

export const getFirebaseMessaging = async () => {
  if (!isFirebaseConfigured()) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
