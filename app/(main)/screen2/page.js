'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MP() {
    const [charts, setCharts] = useState({});
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);

    const assets = [
        {
            symbol: 'SPY',
            name: 'S&P 500 ETF',
            price: 478.32,
            change: '+1.2%',
            isPositive: true,
            per: '24.5',
            buy: 478.40,
            sell: 478.25,
            chartColor: '#4ade80'
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
            chartColor: '#ef4444'
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
            chartColor: '#4ade80'
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
            chartColor: '#4ade80'
        }
    ];

    useEffect(() => {
        // Generate hydration-safe random charts
        const newCharts = {};
        assets.forEach(asset => {
            newCharts[asset.symbol] = Array.from({ length: 20 }).map(() => Math.floor(Math.random() * 50) + 10);
        });
        setCharts(newCharts);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchBalance(currentUser.uid);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchBalance = async (uid) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setBalance(docSnap.data().balance);
        }
    };

    const handleBuy = async (asset) => {
        // Logic: Buy 1 unit of the asset (simplified)
        const cost = asset.buy;

        if (!balance || balance.trading < cost) {
            alert("Fondos insuficientes en Balance de Trading");
            return;
        }

        setProcessing(asset.symbol);

        try {
            const newBalance = {
                ...balance,
                trading: balance.trading - cost,
                mp: balance.mp + cost
            };

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                balance: newBalance
            });

            setBalance(newBalance);
            alert(`Compra exitosa de 1 acción de ${asset.symbol}`);
        } catch (error) {
            console.error("Error Buying:", error);
            alert("Error al procesar la compra");
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Mercado (MP)</h1>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '5px 10px', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid var(--primary)', display: 'inline-block', marginBottom: '4px' }}>
                        • En vivo
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Disp: <span style={{ color: '#fff', fontWeight: 'bold' }}>${balance?.trading.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {assets.map((asset) => (
                <div key={asset.symbol} className="card" style={{ padding: '20px' }}>
                    {/* Header: Symbol and Name */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'var(--secondary)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {asset.symbol[0]}
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#f1f5f9' }}>{asset.symbol}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{asset.name}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc' }}>${asset.price}</div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: asset.isPositive ? '#4ade80' : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '4px'
                            }}>
                                {asset.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {asset.change}
                            </div>
                        </div>
                    </div>

                    {/* Fake Graph Visual */}
                    <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '20px', opacity: 0.8 }}>
                        {charts[asset.symbol] ? charts[asset.symbol].map((height, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1,
                                    background: asset.isPositive
                                        ? `linear-gradient(to top, transparent, ${asset.chartColor})`
                                        : `linear-gradient(to top, transparent, ${asset.chartColor})`,
                                    height: `${height}%`,
                                    borderRadius: '2px'
                                }}
                            />
                        )) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748b' }}>Cargando gráfica...</div>}
                    </div>

                    {/* Actions */}
                    <button
                        className="btn"
                        onClick={() => handleBuy(asset)}
                        disabled={processing === asset.symbol || balance?.trading < asset.buy}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary), #d97706)',
                            color: '#0f172a',
                            height: '48px',
                            fontSize: '0.9rem'
                        }}
                    >
                        {processing === asset.symbol ? 'Procesando...' : `Comprar 1 Acción ($${asset.buy})`}
                    </button>
                </div>
            ))}
        </div>
    );
}
