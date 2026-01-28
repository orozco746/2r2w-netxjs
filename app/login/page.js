'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Lock, Mail, UserPlus, LogIn, Globe } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const initializeUser = async (user) => {
        // Check if user exists first to avoid overwriting existing balance
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
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
        }
    };

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

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);
        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase: ', ''));
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                // Register Logic
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await initializeUser(userCredential.user);
            } else {
                // Login Logic
                await signInWithEmailAndPassword(auth, email, password);
            }

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
