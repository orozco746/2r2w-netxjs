/**
 * @file seed-lp-projects.js
 * @description Seeds the projects Firestore collection with initial LP (real estate) projects.
 * Run: node scripts/seed-lp-projects.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

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

const LP_PROJECTS = [
    {
        id: 'torre-lux',
        title: 'Torre Lux',
        profitability: '18% E.A.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
        slots: 12,
        totalSlots: 20,
        price: 5000,
    },
    {
        id: 'residencias-aurora',
        title: 'Residencias Aurora',
        profitability: '15% E.A.',
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
        slots: 8,
        totalSlots: 15,
        price: 3500,
    },
    {
        id: 'plaza-central',
        title: 'Plaza Central',
        profitability: '22% E.A.',
        image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400',
        slots: 5,
        totalSlots: 10,
        price: 8000,
    },
    {
        id: 'parque-verde',
        title: 'Parque Verde',
        profitability: '12% E.A.',
        image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=400',
        slots: 0,
        totalSlots: 25,
        price: 2000,
    },
];

async function seed() {
    console.log(`📦 Seeding ${LP_PROJECTS.length} projects into projects collection...\n`);

    for (const project of LP_PROJECTS) {
        const { id, ...data } = project;
        const docRef = doc(db, 'projects', id);
        await setDoc(docRef, {
            ...data,
            createdAt: Timestamp.now(),
        });
        console.log(`  ✅ ${project.title} — $${project.price}/slot (${project.profitability})`);
    }

    console.log('\n🎉 Done! All LP projects seeded.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
