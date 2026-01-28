'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, ShieldAlert, Zap, Lock } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function TradingQuiz() {
    const [leverage, setLeverage] = useState(1);
    const [result, setResult] = useState(null);
    const [candles, setCandles] = useState([]);
    const [fullData, setFullData] = useState([]);
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [canTrade, setCanTrade] = useState(false);
    const [ruleStatus, setRuleStatus] = useState({ lp: 0, mp: 0 });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await checkEligibility(currentUser.uid);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const checkEligibility = async (uid) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const bal = docSnap.data().balance;
            setBalance(bal);

            const totalCapital = bal.total; // Assumes total is updated dynamically or we calc it: lp + mp + trading
            // Or calculate total distinct from 'total' field if that's just initial.
            // Let's assume balance.total is the tracked Net Worth.
            // Recalculate true Total for accurate percentages
            const trueTotal = bal.lp + bal.mp + bal.trading;

            const lpPercent = (bal.lp / trueTotal) * 100;
            const mpPercent = (bal.mp / trueTotal) * 100;

            setRuleStatus({ lp: lpPercent, mp: mpPercent });

            if (lpPercent >= 60 && mpPercent >= 20) {
                setCanTrade(true);
                fetchChart();
            } else {
                setCanTrade(false);
            }
        }
    };

    const fetchChart = async () => {
        try {
            const res = await fetch('/api/chart');
            const data = await res.json();
            if (data.candles) {
                setSymbol(data.symbol);
                setFullData(data.candles); // Store all 50 candles
                setCandles(data.candles.slice(0, 20)); // Show first 20
                setResult(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleTrade = async (type) => {
        if (!canTrade) return;

        // Bet logic: Win/Loss based on next 10 candles average vs current Close
        const currentPrice = candles[candles.length - 1].close;
        const futureCandles = fullData.slice(20, 30); // Take next 10
        if (futureCandles.length === 0) return; // Error safety

        const futurePrice = futureCandles[futureCandles.length - 1].close;
        const percentChange = ((futurePrice - currentPrice) / currentPrice) * 100;

        let isWin = false;
        if (type === 'long' && percentChange > 0) isWin = true;
        if (type === 'short' && percentChange < 0) isWin = true;

        // Calculate PnL (Simplified: 1% bet of trading balance * leverage * change)
        // Actually simplicity: Flat win/loss for game feel or real math?
        // Let's do Real Math: Bet Size * Leverage * %Change
        const betSize = 1000; // Fixed bet size for quiz simplicity or calculate based on input
        const pnl = betSize * leverage * (Math.abs(percentChange) / 100);

        // Update Balance
        const newTradingBalance = isWin ? balance.trading + pnl : balance.trading - pnl;

        const newBalance = {
            ...balance,
            trading: newTradingBalance,
            total: balance.lp + balance.mp + newTradingBalance
        };

        // Save to DB
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { balance: newBalance });
        setBalance(newBalance);

        setResult({
            win: isWin,
            amount: pnl.toFixed(2),
            percent: percentChange.toFixed(2)
        });

        // Reveal chart
        setCandles(fullData.slice(0, 30));
    };

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    if (!canTrade) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '16px', border: '1px solid #ef4444' }}>
                    <Lock size={48} color="#ef4444" style={{ marginBottom: '15px' }} />
                    <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Trading Bloqueado</h2>
                    <p style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
                        Para operar, debes cumplir la regla 60/20 del club.
                    </p>
                    <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Inversión LP (Min 60%)</span>
                            <span style={{ color: ruleStatus.lp >= 60 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{ruleStatus.lp.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(ruleStatus.lp, 100)}%`, height: '100%', background: ruleStatus.lp >= 60 ? '#4ade80' : '#ef4444', borderRadius: '3px' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', marginTop: '15px' }}>
                            <span>Inversión MP (Min 20%)</span>
                            <span style={{ color: ruleStatus.mp >= 20 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{ruleStatus.mp.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(ruleStatus.mp, 100)}%`, height: '100%', background: ruleStatus.mp >= 20 ? '#4ade80' : '#ef4444', borderRadius: '3px' }}></div>
                        </div>
                    </div>
                    <p style={{ marginTop: '20px', fontSize: '0.8rem' }}>Ve a las secciones LP y MP para invertir tu capital.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{symbol}</h1>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>Trading Quiz</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '5px 10px', borderRadius: '8px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Zap size={14} /> En Vivo
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fbbf24' }}>${balance?.trading.toFixed(2)}</span>
                </div>
            </div>

            {/* Chart Simulation */}
            <div className="card" style={{ height: '250px', padding: '10px 0', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                {/* Grid lines */}
                <div style={{ position: 'absolute', top: '25%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', top: '75%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

                {/* Candles */}
                {candles.map((candle, i) => {
                    // Normalize for display (rough scaling)
                    const min = Math.min(...candles.map(c => c.low));
                    const max = Math.max(...candles.map(c => c.high));
                    const range = max - min || 1;

                    const heightPercent = ((Math.abs(candle.open - candle.close)) / range) * 80;
                    const bottomPercent = ((Math.min(candle.open, candle.close) - min) / range) * 80 + 10;
                    const isGreen = candle.close >= candle.open;

                    return (
                        <div key={i} style={{
                            flex: 1,
                            height: '100%',
                            position: 'relative'
                        }}>
                            {/* Wick */}
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: `${((candle.low - min) / range) * 80 + 10}%`,
                                height: `${((candle.high - candle.low) / range) * 80}%`,
                                width: '1px',
                                background: isGreen ? '#4ade80' : '#ef4444',
                                opacity: 0.7
                            }}></div>
                            {/* Body */}
                            <div style={{
                                position: 'absolute',
                                left: '10%',
                                right: '10%',
                                bottom: `${bottomPercent}%`,
                                height: `${Math.max(heightPercent, 1)}%`,
                                background: isGreen ? '#4ade80' : '#ef4444',
                                opacity: 0.9,
                                borderRadius: '1px'
                            }}></div>
                        </div>
                    );
                })}

                {/* Result Overlay */}
                {result && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                            {result.win ? '🤑' : '📉'}
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
                            El precio se movió <span style={{ color: 'white' }}>{result.percent > 0 ? '+' : ''}{result.percent}%</span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: result.win ? '#4ade80' : '#ef4444', margin: '15px 0' }}>
                            {result.win ? `+$${result.amount}` : `-$${Math.abs(result.amount)}`}
                        </div>
                        <button onClick={fetchChart} className="btn" style={{ width: 'auto', padding: '10px 30px' }}>
                            Siguiente Gráfico
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--secondary)', padding: '10px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '5px' }}>APALANCAMIENTO</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {[1, 5, 10].map((val) => (
                            <button
                                key={val}
                                onClick={() => setLeverage(val)}
                                style={{
                                    flex: 1,
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: leverage === val ? '1px solid var(--primary)' : '1px solid transparent',
                                    background: leverage === val ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                                    color: leverage === val ? 'var(--primary)' : '#64748b',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                x{val}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ background: 'var(--secondary)', padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TAMAÑO APUESTA</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>$1,000</div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '15px' }}>
                <button
                    onClick={() => handleTrade('short')}
                    className="btn"
                    style={{ background: '#ef4444', display: 'flex', flexDirection: 'column', gap: '0', height: '70px' }}
                >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>SHORT</span>
                    <TrendingDown size={20} />
                </button>
                <button
                    onClick={() => handleTrade('long')}
                    className="btn"
                    style={{ background: '#4ade80', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: '0', height: '70px' }}
                >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>LONG</span>
                    <TrendingUp size={20} />
                </button>
            </div>
        </div>
    );
}
