/**
 * @file page.js (Screen 3 - Trading)
 * @description Trading Quiz Game.
 * Users predict the next movement of a stock (Long/Short).
 * Requires meeting investment ratios (60% LP, 20% MP) to unlock.
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, ShieldAlert, Zap, Lock, History, X } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * TradingQuiz Component
 * @returns {JSX.Element} The trading game interface
 */
export default function TradingQuiz() {
    const [leverage, setLeverage] = useState(1);
    const [ratio, setRatio] = useState(2); // Default 2:1
    const [timeLeft, setTimeLeft] = useState(30); // 30s Timer
    const [timerActive, setTimerActive] = useState(false);
    const [result, setResult] = useState(null);
    const [candles, setCandles] = useState([]);
    const [fullData, setFullData] = useState([]);
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [canTrade, setCanTrade] = useState(false);
    const [ruleStatus, setRuleStatus] = useState({ lp: 0, mp: 0 });
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        // CHECK FOR DEV BYPASS
        if (typeof window !== 'undefined' && localStorage.getItem('user') === 'true') {
             setUser({ email: 'dev@2r2w.com', uid: 'dev-123' });
             setBalance({ total: 1000000, lp: 500000, mp: 300000, trading: 200000 });
             setRuleStatus({ lp: 60, mp: 25 }); // Pass rules automatically
             setCanTrade(true);
             fetchChart();
             setLoading(false);
             return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await checkEligibility(currentUser.uid);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    /**
     * Checks if user meets the portfolio rules to unlock trading.
     * Rule: 60% LP, 20% MP.
     * @param {string} uid - User ID
     */
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

            if (lpPercent >= 50 && mpPercent >= 30) {
                setCanTrade(true);
                fetchChart();
            } else {
                setCanTrade(false);
            }
        }
    };

    /**
     * Fetches trading history from Firestore.
     */
    const fetchHistory = async () => {
        if (!user || user.uid === 'dev-123') return; // Skip for dev bypass for now or mock it

        try {
            const q = query(collection(db, `users/${user.uid}/history`), orderBy("timestamp", "desc"), limit(20));
            const querySnapshot = await getDocs(q);
            const history = [];
            querySnapshot.forEach((doc) => {
                history.push({ id: doc.id, ...doc.data() });
            });
            setHistoryData(history);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    /**
     * Countdown timer logic.
     * Auto-refreshes chart when time is up.
     */
    useEffect(() => {
        let interval;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && timerActive) {
            // Timeout - generate new chart automatically
            fetchChart();
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    /**
     * Fetches a new historical chart candle set from the API.
     */
    const fetchChart = async () => {
        try {
            const res = await fetch('/api/chart');
            const data = await res.json();
            if (data.candles) {
                setSymbol(data.symbol);
                setFullData(data.candles); // Store all 50 candles
                setCandles(data.candles.slice(0, 20)); // Show first 20
                setResult(null);
                setTimeLeft(30);
                setTimerActive(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    /**
     * Executes a trade prediction (Long/Short).
     * Calculates win/loss based on future candles from the dataset.
     * @param {string} type - 'long' or 'short'
     */
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

        // Stop timer
        setTimerActive(false);

        // Calculate PnL (Fixed Odds based on Ratio * Leverage)
        const betSize = 1000;
        // Win: Gain = Bet * Ratio * Leverage
        // Loss: Loss = Bet
        const pnl = isWin ? (betSize * ratio * leverage) : betSize;
        const netPnl = isWin ? pnl : -pnl; // For history display

        // Update Balance
        const newTradingBalance = isWin ? balance.trading + pnl : balance.trading - pnl;

        const newBalance = {
            ...balance,
            trading: newTradingBalance,
            total: balance.lp + balance.mp + newTradingBalance
        };

        // Save to DB
        if (typeof window !== 'undefined' && localStorage.getItem('user') === 'true') {
             // DEV MODE: No DB save
        } else {
             const userRef = doc(db, "users", user.uid);
             await updateDoc(userRef, { balance: newBalance });

             // Save History
             try {
                 await addDoc(collection(db, `users/${user.uid}/history`), {
                     timestamp: serverTimestamp(),
                     symbol: symbol,
                     type: type,
                     leverage: leverage,
                     ratio: ratio,
                     result: isWin ? 'win' : 'loss',
                     pnl: netPnl,
                     balanceAfter: newTradingBalance
                 });
             } catch (error) {
                 console.error("Error saving history:", error);
             }
        }
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
                        Para operar, debes cumplir la regla 50/30 del club.
                    </p>
                    <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Inversión LP (Min 50%)</span>
                            <span style={{ color: ruleStatus.lp >= 50 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{ruleStatus.lp.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(ruleStatus.lp, 100)}%`, height: '100%', background: ruleStatus.lp >= 50 ? '#4ade80' : '#ef4444', borderRadius: '3px' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', marginTop: '15px' }}>
                            <span>Inversión MP (Min 30%)</span>
                            <span style={{ color: ruleStatus.mp >= 30 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{ruleStatus.mp.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(ruleStatus.mp, 100)}%`, height: '100%', background: ruleStatus.mp >= 30 ? '#4ade80' : '#ef4444', borderRadius: '3px' }}></div>
                        </div>
                    </div>
                    <p style={{ marginTop: '20px', fontSize: '0.8rem' }}>Ve a las secciones LP y MP para invertir tu capital.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{symbol}</h1>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>Trading Quiz</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
                         <button 
                            onClick={() => setShowHistory(true)}
                            className="btn"
                            style={{ padding: '6px', width: 'auto', background: 'var(--secondary)', border: '1px solid rgba(255,255,255,0.1)' }}
                         >
                            <History size={18} color="#94a3b8" />
                         </button>
                         <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '5px 10px', borderRadius: '8px', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={14} /> En Vivo
                        </div>
                    </div>
                    
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fbbf24', display: 'block', marginTop: '4px' }}>${balance?.trading.toLocaleString()}</span>
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

            {/* GAME CONTROLS GRID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                
                {/* ROW 1: LEVERAGE */}
                <div style={{ background: 'var(--secondary)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', width: '30%' }}>APALANCAMIENTO</div>
                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                        {[1, 5, 10].map((val) => (
                            <button
                                key={val}
                                onClick={() => setLeverage(val)}
                                style={{
                                    flex: 1,
                                    padding: '5px',
                                    borderRadius: '6px',
                                    border: leverage === val ? '1px solid var(--primary)' : '1px solid transparent',
                                    background: leverage === val ? 'rgba(251, 191, 36, 0.1)' : '#1e293b',
                                    color: leverage === val ? 'var(--primary)' : '#64748b',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem'
                                }}
                            >
                                x{val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ROW 2: RATIO */}
                <div style={{ background: 'var(--secondary)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', width: '30%' }}>RATIO TP:SL</div>
                    <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                        {[
                            { label: '2:1', val: 2 },
                            { label: '3:1', val: 3 },
                            { label: '3:2', val: 1.5 },
                            { label: '5:2', val: 2.5 }
                        ].map((r) => (
                            <button
                                key={r.label}
                                onClick={() => setRatio(r.val)}
                                style={{
                                    flex: 1,
                                    padding: '5px',
                                    borderRadius: '6px',
                                    border: ratio === r.val ? '1px solid var(--primary)' : '1px solid transparent',
                                    background: ratio === r.val ? 'rgba(251, 191, 36, 0.1)' : '#1e293b',
                                    color: ratio === r.val ? 'var(--primary)' : '#64748b',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ROW 3: INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {/* OPERATION SIZE */}
                    <div style={{ background: 'var(--secondary)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>OPERACIÓN</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>$1,000</div>
                    </div>

                    {/* POTENTIAL GAIN */}
                    <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '8px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                         <div style={{ fontSize: '0.65rem', color: '#4ade80' }}>GANANCIA</div>
                         <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4ade80' }}>${(1000 * ratio * leverage).toLocaleString()}</div>
                    </div>
                </div>

            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <button
                    onClick={() => handleTrade('short')}
                    className="btn"
                    style={{ background: '#ef4444', display: 'flex', flexDirection: 'column', gap: '0', height: '70px', flex: 1 }}
                >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>SHORT</span>
                    <TrendingDown size={20} />
                </button>
                <button
                    onClick={() => handleTrade('long')}
                    className="btn"
                    style={{ background: '#4ade80', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: '0', height: '70px', flex: 1 }}
                >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>LONG</span>
                    <TrendingUp size={20} />
                </button>
            </div>

            {/* TIMER BELOW ACTIONS */}
            <div style={{ background: timeLeft <= 5 ? 'rgba(239, 68, 68, 0.2)' : 'var(--secondary)', padding: '10px', borderRadius: '12px', textAlign: 'center', border: timeLeft <= 5 ? '1px solid #ef4444' : 'none', transition: 'all 0.3s ease' }}>
                <div style={{ fontSize: '0.7rem', color: timeLeft <= 5 ? '#ef4444' : '#94a3b8', marginBottom: '2px' }}>CONFIRMAR EN</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft <= 5 ? '#ef4444' : 'white', fontFamily: 'monospace' }}>{timeLeft}s</div>
            </div>

             {/* HISTORY MODAL */}
             {showHistory && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.95)', zIndex: 100, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Historial de Operaciones</h2>
                        <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#94a3b8' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {historyData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px' }}>No hay operaciones recientes</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {historyData.map((trade) => (
                                    <div key={trade.id} className="card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: trade.result === 'win' ? '4px solid #4ade80' : '4px solid #ef4444' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{trade.symbol} <span style={{ fontSize: '0.8rem', color: trade.type === 'long' ? '#4ade80' : '#ef4444', textTransform: 'uppercase' }}>{trade.type}</span></div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                Lev: x{trade.leverage} | Ratio: {trade.ratio}:1
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: trade.result === 'win' ? '#4ade80' : '#ef4444' }}>
                                                {trade.result === 'win' ? '+' : '-'}${Math.abs(trade.pnl).toLocaleString()}
                                            </div>
                                            {trade.timestamp && (
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                    {/* Safe date formatting if timestamp exists */}
                                                    {trade.timestamp.seconds ? new Date(trade.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
