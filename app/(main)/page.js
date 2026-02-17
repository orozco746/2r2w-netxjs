/**
 * @file page.js
 * @description Main dashboard page of the application.
 * Displays user balance, portfolio breakdown (LP, MP, Trading), and quick actions.
 * Fetches user data from Firestore upon authentication.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, TrendingUp, BarChart2, Gamepad2, LogOut } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

/**
 * Home Component (Dashboard)
 * @returns {JSX.Element} The dashboard view
 */
export default function Home() {
    const router = useRouter();
    // State for user authentication data
    const [user, setUser] = useState(null);
    // State for user financial balance
    const [balance, setBalance] = useState({ total: 0, lp: 0, mp: 0, trading: 0 });
    // Loading state for asynchronous data fetching
    const [loading, setLoading] = useState(true);

    /**
     * Handles user logout.
     * Signs out from Firebase and redirects to login page.
     */
    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    /**
     * Effect to handle authentication and data fetching.
     * Checks for developer bypass mode or standard Firebase auth.
     */
    useEffect(() => {
        // CHECK FOR DEV BYPASS
        if (typeof window !== 'undefined' && localStorage.getItem('user') === 'true') {
             console.log("Developer mode detected");
             setUser({ email: 'dev@2r2w.com', uid: 'dev-123' });
             setBalance({ total: 1000000, lp: 500000, mp: 300000, trading: 200000 });
             setLoading(false);
             return;
        }

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log("📋 [Dashboard] onAuthStateChanged fired, user:", currentUser?.uid || "null");
            if (currentUser) {
                setUser(currentUser);
                // Fetch User Data from Firestore
                try {
                    console.log("📋 [Dashboard] Fetching user doc from Firestore...");
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        console.log("✅ [Dashboard] User doc loaded successfully");
                        setBalance(docSnap.data().balance);
                    } else {
                        console.warn("⚠️ [Dashboard] User doc does not exist!");
                    }
                } catch (e) {
                    console.error("❌ [Dashboard] Error fetching user data:", e.code, e.message);
                    console.error("❌ [Dashboard] Full error:", e);
                }
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;
    }

    return (
        <div>
            {/* Header Section with User Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div>
                    <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Hola, {user?.email?.split('@')[0]}</h1>
                    <p style={{ margin: 0, fontSize: '0.8rem' }}>Inversor Pro</p>
                </div>
            </div>

            {/* Total Balance Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--secondary), #0f172a)', textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '5px' }}>Balance Total</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'white' }}>${balance.total.toLocaleString()}</div>
                <div style={{ color: '#4ade80', fontSize: '0.9rem', marginTop: '5px' }}>+0.0% este mes</div>
            </div>

            <h2>Portafolio</h2>

            {/* LP Section (Liquidity Pool / Real Estate) */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '10px' }}>
                    <TrendingUp size={24} color="#3b82f6" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600' }}>Inversión LP</span>
                        <span style={{ fontWeight: 'bold' }}>${balance.lp.toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--background)', borderRadius: '3px' }}>
                        <div style={{ width: `${(balance.lp / balance.total) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }}></div>
                    </div>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem' }}>Real Estate & Proyectos</p>
                </div>
            </div>

            {/* MP Section (Market Portfolio / Stocks) */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '10px', borderRadius: '10px' }}>
                    <BarChart2 size={24} color="#a855f7" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600' }}>Inversión MP</span>
                        <span style={{ fontWeight: 'bold' }}>${balance.mp.toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--background)', borderRadius: '3px' }}>
                        <div style={{ width: `${(balance.mp / balance.total) * 100}%`, height: '100%', background: '#a855f7', borderRadius: '3px' }}></div>
                    </div>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem' }}>Acciones & ETFs</p>
                </div>
            </div>

            {/* Trading Section */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.2)', padding: '10px', borderRadius: '10px' }}>
                    <Gamepad2 size={24} color="#eab308" />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600' }}>Trading Balance</span>
                        <span style={{ fontWeight: 'bold' }}>${balance.trading.toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--background)', borderRadius: '3px' }}>
                        <div style={{ width: `${(balance.trading / balance.total) * 100}%`, height: '100%', background: '#eab308', borderRadius: '3px' }}></div>
                    </div>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem' }}>Disponible para operar</p>
                </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" style={{ flex: 1, background: 'var(--secondary)', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                    <Wallet size={18} style={{ marginRight: '8px' }} /> Depositar
                </button>
                <button
                    onClick={() => {
                        signOut(auth);
                        localStorage.removeItem('user');
                        router.push('/login');
                    }}
                    className="btn"
                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}
                >
                    <LogOut size={18} style={{ marginRight: '8px' }} /> Salir
                </button>
            </div>
        </div>
    );
}
