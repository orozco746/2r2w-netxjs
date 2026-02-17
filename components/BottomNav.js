/**
 * @file BottomNav.js
 * @description Bottom navigation component for mobile view.
 * Displays navigation links with icons and highlights the active route.
 * Shows a lock icon on Trading if the user hasn't met investment rules.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, BarChart2, Gamepad2, Lock, X } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * BottomNav Component
 * @returns {JSX.Element} The bottom navigation bar
 */
export default function BottomNav() {
    const pathname = usePathname();
    const [tradingLocked, setTradingLocked] = useState(true);
    const [showLockPopup, setShowLockPopup] = useState(false);
    const [ruleStatus, setRuleStatus] = useState({ lp: 0, mp: 0 });

    useEffect(() => {
        // DEV BYPASS
        if (typeof window !== 'undefined' && localStorage.getItem('user') === 'true') {
            // Check if we have a real Firebase user too
            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    await checkTradingEligibility(currentUser.uid);
                } else {
                    // Pure dev mode — keep locked
                    setTradingLocked(true);
                    setRuleStatus({ lp: 0, mp: 0 });
                }
            });
            return () => unsubscribe();
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                await checkTradingEligibility(currentUser.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    /**
     * Checks if LP >= 50% and MP >= 30% of total capital.
     * @param {string} uid - User ID
     */
    const checkTradingEligibility = async (uid) => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const bal = docSnap.data().balance;
                const trueTotal = bal.lp + bal.mp + bal.trading;
                if (trueTotal <= 0) {
                    setTradingLocked(true);
                    setRuleStatus({ lp: 0, mp: 0 });
                    return;
                }
                const lpPercent = (bal.lp / trueTotal) * 100;
                const mpPercent = (bal.mp / trueTotal) * 100;
                setRuleStatus({ lp: lpPercent, mp: mpPercent });
                setTradingLocked(!(lpPercent >= 50 && mpPercent >= 30));
            }
        } catch (e) {
            console.error("BottomNav eligibility check error:", e.code, e.message);
        }
    };

    /**
     * Array of navigation items.
     * @type {Array<{name: string, href: string, icon: Component}>}
     */
    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Data', href: '/data', icon: BarChart2 },
        { name: 'LP', href: '/screen1', icon: TrendingUp },
        { name: 'MP', href: '/screen2', icon: BarChart2 },
        { name: 'Trading', href: '/screen3', icon: Gamepad2, lockable: true },
    ];

    return (
        <>
            <nav className="bottom-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const isLocked = item.lockable && tradingLocked;

                    if (isLocked) {
                        return (
                            <button
                                key={item.href}
                                onClick={() => setShowLockPopup(true)}
                                className={`nav-item`}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    opacity: 0.4,
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <Icon size={24} />
                                    <Lock
                                        size={12}
                                        style={{
                                            position: 'absolute',
                                            bottom: -2,
                                            right: -6,
                                            color: '#ef4444',
                                            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                                        }}
                                    />
                                </div>
                                <span>{item.name}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={24} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Lock Popup Modal */}
            {showLockPopup && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2, 6, 23, 0.95)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setShowLockPopup(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                            borderRadius: '20px',
                            padding: '30px 25px',
                            maxWidth: '360px',
                            width: '100%',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            position: 'relative',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowLockPopup(false)}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Icon */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div
                                style={{
                                    width: '70px',
                                    height: '70px',
                                    borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                }}
                            >
                                <Lock size={32} color="#ef4444" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 style={{
                            textAlign: 'center',
                            fontSize: '1.3rem',
                            color: '#f8fafc',
                            marginBottom: '10px',
                        }}>
                            Trading Bloqueado
                        </h2>

                        {/* Description */}
                        <p style={{
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: '0.85rem',
                            marginBottom: '25px',
                            lineHeight: '1.5',
                        }}>
                            Para operar en Trading, primero debes diversificar tu portafolio según la regla del club:
                        </p>

                        {/* Rules Progress */}
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '15px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                        }}>
                            {/* LP Rule */}
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px',
                                    fontSize: '0.8rem',
                                }}>
                                    <span style={{ color: '#94a3b8' }}>Inversión LP (Mín 50%)</span>
                                    <span style={{
                                        color: ruleStatus.lp >= 50 ? '#4ade80' : '#ef4444',
                                        fontWeight: 'bold',
                                    }}>
                                        {ruleStatus.lp.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#1e293b',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${Math.min(ruleStatus.lp, 100)}%`,
                                        height: '100%',
                                        background: ruleStatus.lp >= 50
                                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                            : 'linear-gradient(90deg, #dc2626, #ef4444)',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>

                            {/* MP Rule */}
                            <div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px',
                                    fontSize: '0.8rem',
                                }}>
                                    <span style={{ color: '#94a3b8' }}>Inversión MP (Mín 30%)</span>
                                    <span style={{
                                        color: ruleStatus.mp >= 30 ? '#4ade80' : '#ef4444',
                                        fontWeight: 'bold',
                                    }}>
                                        {ruleStatus.mp.toFixed(1)}%
                                    </span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#1e293b',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${Math.min(ruleStatus.mp, 100)}%`,
                                        height: '100%',
                                        background: ruleStatus.mp >= 30
                                            ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                            : 'linear-gradient(90deg, #dc2626, #ef4444)',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <p style={{
                            textAlign: 'center',
                            color: '#fbbf24',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                        }}>
                            💡 Ve a las secciones LP y MP para invertir tu capital
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

