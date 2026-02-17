/**
 * @file firebase.js
 * @description Firebase configuration and initialization.
 * Exports authorized 'auth' and 'db' (Firestore) instances for use throughout the app.
 * Includes diagnostic logging and connectivity helpers to debug "client is offline" errors.
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, enableNetwork, disableNetwork, doc, getDoc } from "firebase/firestore";

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

// ── DIAGNOSTIC: log config (masked) ──
console.log("🔧 [Firebase] Config check:", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 8)}...` : "❌ MISSING",
    authDomain: firebaseConfig.authDomain || "❌ MISSING",
    projectId: firebaseConfig.projectId || "❌ MISSING",
    storageBucket: firebaseConfig.storageBucket || "❌ MISSING",
    appId: firebaseConfig.appId ? `${firebaseConfig.appId.slice(0, 10)}...` : "❌ MISSING",
});

// Validate config to prevent crashes during build/SSR if env vars are missing
const isConfigValid = Object.values(firebaseConfig).every(val => val !== undefined);
if (!isConfigValid) {
    console.error("❌ [Firebase] One or more env vars are undefined! Check .env.local");
}

let app;
let auth;
let db;

/**
 * Initialize Firebase only on the client-side or if config is valid.
 * Uses a singleton pattern to prevent multiple initializations during hot-reloading.
 */
if (typeof window !== 'undefined' || isConfigValid) {
    try {
        const existingApps = getApps();
        console.log(`🔧 [Firebase] Existing apps: ${existingApps.length}`);

        app = existingApps.length === 0 ? initializeApp(firebaseConfig) : existingApps[0];
        console.log("✅ [Firebase] App initialized:", app.name);

        auth = getAuth(app);
        console.log("✅ [Firebase] Auth initialized");

        // Initialize Firestore safely to avoid HMR crashes
        try {
            db = initializeFirestore(app, {
                experimentalForceLongPolling: true,
            });
            console.log("✅ [Firebase] Firestore initialized (long polling ON)");
        } catch (e) {
            // If already initialized (common in HMR), fall back to getting the existing instance
            console.warn("⚠️ [Firebase] Firestore reuse:", e.message);
            db = getFirestore(app);
        }

        // Force Firestore online on each load to reset any stuck offline state
        if (typeof window !== 'undefined' && db) {
            enableNetwork(db)
                .then(() => console.log("✅ [Firebase] enableNetwork() OK — Firestore is online"))
                .catch((err) => console.error("❌ [Firebase] enableNetwork() FAILED:", err.code, err.message));
        }

    } catch (e) {
        console.error("❌ [Firebase] Init Error:", e.message, e);
    }
} else {
    console.warn("⚠️ [Firebase] Skipped on server/build due to missing config.");
}

/**
 * Diagnostic helper: tests Firestore connectivity by reading a non-existent doc.
 * Call this from the browser console: `import('/lib/firebase').then(m => m.testFirestoreConnection())`
 * Or call it from any page to verify connectivity.
 */
export async function testFirestoreConnection() {
    console.log("🧪 [Firebase] Testing Firestore connection...");
    console.log("🧪 [Firebase] navigator.onLine:", typeof navigator !== 'undefined' ? navigator.onLine : 'N/A (SSR)');

    if (!db) {
        console.error("🧪 [Firebase] db is null/undefined — Firebase never initialized!");
        return { ok: false, error: "db is null" };
    }

    try {
        const testRef = doc(db, "__connectivity_test__", "ping");
        const start = Date.now();
        const snap = await getDoc(testRef);
        const elapsed = Date.now() - start;
        console.log(`✅ [Firebase] Firestore responded in ${elapsed}ms, doc exists: ${snap.exists()}`);
        return { ok: true, elapsed, exists: snap.exists() };
    } catch (err) {
        console.error("❌ [Firebase] Firestore test FAILED:", err.code, err.message);
        console.error("❌ [Firebase] Full error:", err);
        return { ok: false, code: err.code, message: err.message };
    }
}

/**
 * Force Firestore to go online. Useful after recovering from offline state.
 */
export async function ensureFirestoreOnline() {
    if (!db) {
        console.error("❌ [Firebase] Cannot ensureOnline — db is null");
        return false;
    }
    try {
        await enableNetwork(db);
        console.log("✅ [Firebase] Firestore forced online");
        return true;
    } catch (err) {
        console.error("❌ [Firebase] ensureOnline failed:", err.code, err.message);
        return false;
    }
}

export { auth, db };
