// src/firebase/config.js
import { initializeApp }               from 'firebase/app';
import { getAuth, GoogleAuthProvider, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore }                from 'firebase/firestore';
import { getMessaging, isSupported }   from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || 'offline-mode',
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || 'localhost',
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || 'mars-offline',
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || '1:000:web:000',
};

// Firebase will initialize even with placeholder values
// Guest/offline mode won't make any Firestore calls
const app = initializeApp(firebaseConfig);

export const auth            = getAuth(app);
export const db              = getFirestore(app);
export const googleProvider  = new GoogleAuthProvider();
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
