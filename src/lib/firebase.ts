import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

/**
 * Check if Firebase environment variables are configured
 */
function hasFirebaseConfig(): boolean {
  return (
    !!import.meta.env.VITE_FIREBASE_API_KEY &&
    !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    !!import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

/**
 * Firebase configuration from environment variables
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase app (singleton)
 */
const app = hasFirebaseConfig()
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

/**
 * Firebase services (null when in demo mode)
 */
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;

/**
 * Whether the app is running in demo mode (no Firebase configured)
 */
export const isDemoMode = !hasFirebaseConfig();

/**
 * Connect to Firebase emulators in development
 */
export function connectEmulators() {
  if (app && import.meta.env.DEV) {
    try {
      if (auth) connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      if (db) connectFirestoreEmulator(db, "localhost", 8080);
      if (storage) connectStorageEmulator(storage, "localhost", 9199);
    } catch {
      // Emulators not running — ignore
    }
  }
}

export default app;