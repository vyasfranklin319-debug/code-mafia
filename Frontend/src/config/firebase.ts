// Code Mafia Live Firebase Client Config & Singleton Initializer
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export interface FirebaseUserAccount {
  uid: string;
  email: string;
  displayName?: string;
}

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || process.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyB8AaU5HFJE7VJRuxXvs9kotYOq74cREWA",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "codemafia-54284.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://codemafia-54284-default-rtdb.firebaseio.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "codemafia-54284",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "codemafia-54284.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "113127636776",
  appId: env.VITE_FIREBASE_APP_ID || "1:113127636776:web:3cbd588e4f0d65d2649a1d",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-JNCSJV32ZV"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const db = getFirestore(app);

export function getFirebaseAppConfig() {
  return {
    ...firebaseConfig,
    status: 'ACTIVE',
    service: 'Firebase Auth & Cloud Firestore Client'
  };
}
