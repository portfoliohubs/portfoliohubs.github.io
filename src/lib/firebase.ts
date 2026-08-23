import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : ({} as any);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyPortfolioHubsDefaultFallbackApiKey',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'portfoliohubs-8d806.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'portfoliohubs-8d806',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'portfoliohubs-8d806.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '825482910482',
  appId: env.VITE_FIREBASE_APP_ID || '1:825482910482:web:9b32a10e428cfa10'
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Prevent Firebase SDK from retrying failed uploads for minutes
try {
  storage.maxUploadRetryTime = 6000;
  storage.maxOperationRetryTime = 6000;
} catch {
  // Ignore in environments where storage properties are read-only
}

export { app, auth, db, storage };

