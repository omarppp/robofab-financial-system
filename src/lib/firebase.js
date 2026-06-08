/**
 * Firebase client SDK – Vite project.
 * Config is read from import.meta.env (VITE_ prefix).
 * Single-instance init; analytics is lazy and browser-only.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate required keys – logs the exact missing variable names
const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = REQUIRED_KEYS.filter((k) => !import.meta.env[k]);
if (missing.length > 0) {
  console.error(
    '[Firebase] Missing required environment variables:\n' +
    missing.map((k) => `  • ${k}`).join('\n') +
    '\nMake sure .env.local is in the project root and contains these variables.'
  );
  // Throw so the app fails fast with a clear message instead of a cryptic
  // "auth/invalid-api-key" or silent undefined behaviour.
  throw new Error(`[Firebase] Missing env vars: ${missing.join(', ')}`);
}

// Initialize exactly once (safe for HMR / React Strict Mode double-invocation)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Analytics: lazy + browser-only (avoids window-is-not-defined and SSR issues)
let _analytics = null;
export const getAnalyticsLazy = async () => {
  if (_analytics) return _analytics;
  if (!firebaseConfig.measurementId) return null;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (!(await isSupported())) return null;
    _analytics = getAnalytics(app);
    return _analytics;
  } catch (e) {
    console.warn('[Firebase] Analytics skipped:', e.message);
    return null;
  }
};

export default app;
