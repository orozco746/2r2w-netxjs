/**
 * @file seed-mp-assets.js
 * @description Seeds the mp_assets Firestore collection with initial stock/ETF data.
 * Run: node scripts/seed-mp-assets.js
 * 
 * Uses the Firebase client SDK with the same config as the app.
 * Requires env vars from .env.local (loaded via dotenv).
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

// Load .env.local
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔧 Initializing Firebase for project:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MP_ASSETS = [
    {
        symbol: 'SPY',
        name: 'S&P 500 ETF',
        price: 478.32,
        change: '+1.2%',
        isPositive: true,
        per: '24.5',
        buy: 478.40,
        sell: 478.25,
        chartColor: '#4ade80',
        active: true,
    },
    {
        symbol: 'TSLA',
        name: 'Tesla Inc',
        price: 215.50,
        change: '-2.4%',
        isPositive: false,
        per: '68.2',
        buy: 215.60,
        sell: 215.40,
        chartColor: '#ef4444',
        active: true,
    },
    {
        symbol: 'NVDA',
        name: 'NVIDIA Corp',
        price: 540.10,
        change: '+5.8%',
        isPositive: true,
        per: '95.1',
        buy: 540.25,
        sell: 540.00,
        chartColor: '#4ade80',
        active: true,
    },
    {
        symbol: 'AAPL',
        name: 'Apple Inc',
        price: 185.90,
        change: '+0.5%',
        isPositive: true,
        per: '29.3',
        buy: 186.00,
        sell: 185.80,
        chartColor: '#4ade80',
        active: true,
    },
];

async function seed() {
    console.log(`📦 Seeding ${MP_ASSETS.length} assets into mp_assets collection...\n`);

    for (const asset of MP_ASSETS) {
        const docRef = doc(db, 'mp_assets', asset.symbol);
        await setDoc(docRef, {
            ...asset,
            updatedAt: Timestamp.now(),
        });
        console.log(`  ✅ ${asset.symbol} — ${asset.name} ($${asset.price})`);
    }

    console.log('\n🎉 Done! All MP assets seeded.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
