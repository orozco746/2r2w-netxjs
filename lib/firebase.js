/**
 * @file firebase.js
 * @description Firebase configuration and initialization.
 * Exports authorized 'auth' and 'db' (Firestore) instances for use throughout the app.
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

/**
 * Firebase configuration object using environment variables.
 * Ensure these variables are set in .env.local
 */
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate config to prevent crashes during build/SSR if env vars are missing
const isConfigValid = Object.values(firebaseConfig).every(val => val !== undefined);

let app;
let auth;
let db;

/**
 * Initialize Firebase only on the client-side or if config is valid.
 * Uses a singleton pattern to prevent multiple initializations during hot-reloading.
 */
if (typeof window !== 'undefined' || isConfigValid) {
    try {
        // Initialize app if one doesn't already exist
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        auth = getAuth(app);
        
        // Initialize Firestore safely to avoid HMR crashes
        try {
             // experimentalForceLongPolling is often needed for reliable connections in some environments
             db = initializeFirestore(app, {
                experimentalForceLongPolling: true, 
            });
        } catch (e) {
            // If already initialized (common in HMR), fall back to getting the existing instance
            console.warn("Firestore already initialized, reusing instance:", e.message);
            db = getFirestore(app);
        }
        
    } catch (e) {
        console.warn("Firebase Init Error:", e.message);
    }
} else {
    console.warn("Firebase skipped on server/build due to missing config.");
}

export { auth, db };
