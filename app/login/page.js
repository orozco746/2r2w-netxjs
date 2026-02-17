/**
 * @file page.js
 * @description Login and Registration page.
 * Supports Email/Password auth and Google Auth via Firebase.
 * Initializes user data in Firestore upon first login.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Lock, Mail, UserPlus, LogIn, Globe } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { testFirestoreConnection, ensureFirestoreOnline } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * LoginPage Component
 * Handles user authentication and redirection to the main app.
 * @returns {JSX.Element} The login form
 */
export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    /**
     * Initializes user document in Firestore if it doesn't exist.
     * Sets initial balance for new users.
     * @param {Object} user - Firebase user object
     */
    const initializeUser = async (user) => {
        console.log("📋 [Login] initializeUser called with uid:", user?.uid);
        console.log("📋 [Login] navigator.onLine:", navigator.onLine);
        
        if (!user || !user.uid) {
            console.error("❌ [Login] No valid user object provided to initializeUser");
            return;
        }

        // Test Firestore connectivity first
        console.log("📋 [Login] Testing Firestore connectivity before DB access...");
        const connTest = await testFirestoreConnection();
        console.log("📋 [Login] Connectivity test result:", connTest);

        if (!connTest.ok) {
            console.warn("⚠️ [Login] Firestore appears offline, attempting enableNetwork...");
            await ensureFirestoreOnline();
        }

        console.log("📋 [Login] Attempting getDoc for users/" + user.uid);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        console.log("✅ [Login] getDoc succeeded, exists:", docSnap.exists());

        if (!docSnap.exists()) {
            console.log("📋 [Login] Creating new user doc...");
            await setDoc(docRef, {
                email: user.email,
                balance: {
                    total: 100000,
                    lp: 0,
                    mp: 0,
                    trading: 100000
                },
                createdAt: new Date()
            });
            console.log("✅ [Login] User doc created");
        }
    };

    /* 
    // Redirect logic removed in favor of Popup to avoid 404 errors on localhost
    useEffect(() => {
        const handleGoogleResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    setLoading(true);
                    await initializeUser(result.user);
                    localStorage.setItem('user', 'true');
                    router.push('/');
                }
            } catch (err) {
                console.error(err);
                setError(err.message.replace('Firebase: ', ''));
            }
        };
        handleGoogleResult();
    }, [router]);
    */

    /**
     * Handles Google Sign-In via Popup.
     */
    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            // Switch to Popup
            const result = await signInWithPopup(auth, provider);
            
            if (result.user) {
                await initializeUser(result.user);
                localStorage.setItem('user', 'true');
                router.push('/');
            }
        } catch (err) {
            if (err.code === 'auth/cancelled-popup-request') {
                console.log('Login popup cancelled by user');
                setLoading(false);
                return;
            }
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
            setLoading(false);
        }
    };

    /**
     * Handles Email/Password Login and Registration.
     * @param {Event} e - Form submission event
     */
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                // Register Logic
                console.log("Starting registration...");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Registration success, initializing user...", userCredential.user.uid);
                await initializeUser(userCredential.user);
                console.log("User initialized.");
            } else {
                // Login Logic
                console.log("Starting login...");
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                 console.log("Login success, initializing user logic...", userCredential.user.uid);
                 // Note: initializeUser usually checks if doc exists, so safe to call on login too if needed
                 // But typically login just redirects. If you need to ensure doc exists on login:
                await initializeUser(userCredential.user);
            }

            console.log("Redirecting...");
            localStorage.setItem('user', 'true');
            router.push('/');

        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '30px', background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)' }}>
            {/* Logo and Title */}
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '50px' }}>
                <div style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto 30px auto',
                    position: 'relative'
                }}>
                    <img src="/logo.png" alt="2R2W Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))' }} />
                </div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>2R2W</h1>
                <p style={{ color: '#fbbf24', fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}>Too Rich To Work</p>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleAuth} style={{ width: '100%' }}>
                <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '18px', color: '#fbbf24' }} />
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        className="input-field"
                        style={{ paddingLeft: '48px' }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '18px', color: '#fbbf24' }} />
                    <input
                        type="password"
                        placeholder="Contraseña"
                        className="input-field"
                        style={{ paddingLeft: '48px' }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>

                <button type="submit" className="btn" disabled={loading} style={{ marginTop: '10px' }}>
                    {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Entrar al Club')}
                </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '25px 0', gap: '10px' }}>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></div>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>O CONTINÚA CON</span>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></div>
            </div>

            <button
                onClick={handleGoogleLogin}
                className="btn"
                style={{ background: 'white', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'none' }}
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" width="20" height="20" alt="Google" />
                Google
            </button>

             <button
                onClick={() => {
                    localStorage.setItem('user', 'true');
                    router.push('/');
                }}
                className="btn"
                style={{ marginTop: '15px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px dashed #fbbf24' }}
            >
                🛠️ Entrar como Desarrollador
            </button>

            <p style={{ marginTop: '30px', fontSize: '0.85rem' }}>
                {isRegistering ? '¿Ya eres miembro?' : '¿Nuevo aquí?'}
                <span
                    onClick={() => setIsRegistering(!isRegistering)}
                    style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', marginLeft: '8px', textDecoration: 'underline' }}
                >
                    {isRegistering ? 'Inicia Sesión' : 'Solicitar Acceso'}
                </span>
            </p>
        </div>
    );
}
