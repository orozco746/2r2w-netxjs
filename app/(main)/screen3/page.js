/**
 * @file page.js (Screen 3 - Trading)
 * @description Trading Quiz Game.
 * Users predict the next movement of a stock (Long/Short).
 * Requires meeting investment ratio (LP + MP >= 90% of total) to unlock.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
    const [ruleStatus, setRuleStatus] = useState({ combined: 0 });
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [tradeInfo, setTradeInfo] = useState(null); // { entryPrice, sl, tp, type }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Re-check eligibility every time the component mounts or user changes
    useEffect(() => {
        if (user) {
            checkEligibility(user.uid);
        }
    }, [user]);

    /**
     * Checks if user meets the portfolio rules to unlock trading.
     * Rule: LP + MP must be >= 90% of total capital.
     * @param {string} uid - User ID
     */
    const checkEligibility = async (uid) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const bal = docSnap.data().balance;
            setBalance(bal);

            const trueTotal = bal.lp + bal.mp + bal.trading;
            const combinedPercent = trueTotal > 0 ? ((bal.lp + bal.mp) / trueTotal) * 100 : 0;

            setRuleStatus({ combined: combinedPercent });

            if (combinedPercent >= 90) {
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
        if (!user) return;

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
                setTradeInfo(null);
                setTimeLeft(30);
                setTimerActive(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    /**
     * Computes MA50 (or as many as available) for all visible candles.
     * Uses fullData to have enough historical context.
     */
    const ma50Data = useMemo(() => {
        if (fullData.length === 0) return [];
        const visibleCount = candles.length;
        const result = [];
        for (let i = 0; i < visibleCount; i++) {
            // For each visible candle, calculate MA using up to 50 previous candles from fullData
            const endIdx = i + 1;
            const startIdx = Math.max(0, endIdx - 20); // MA20 for this chart scale
            const slice = fullData.slice(startIdx, endIdx);
            const avg = slice.reduce((sum, c) => sum + c.close, 0) / slice.length;
            result.push(avg);
        }
        return result;
    }, [candles, fullData]);

    /**
     * Executes a trade prediction (Long/Short).
     * Calculates win/loss based on future candles from the dataset.
     * @param {string} type - 'long' or 'short'
     */
    const handleTrade = async (type) => {
        if (!canTrade) return;

        // Entry price = last visible candle close
        const currentPrice = candles[candles.length - 1].close;
        const futureCandles = fullData.slice(20, 30); // Take next 10
        if (futureCandles.length === 0) return;

        const futurePrice = futureCandles[futureCandles.length - 1].close;
        const percentChange = ((futurePrice - currentPrice) / currentPrice) * 100;

        let isWin = false;
        if (type === 'long' && percentChange > 0) isWin = true;
        if (type === 'short' && percentChange < 0) isWin = true;

        // Stop timer
        setTimerActive(false);

        // Calculate SL/TP levels based on a realistic % move
        const riskPercent = 0.02; // 2% risk per trade
        const slDistance = currentPrice * riskPercent;
        const tpDistance = slDistance * ratio;

        let sl, tp;
        if (type === 'long') {
            sl = currentPrice - slDistance;
            tp = currentPrice + tpDistance;
        } else {
            sl = currentPrice + slDistance;
            tp = currentPrice - tpDistance;
        }

        setTradeInfo({ entryPrice: currentPrice, sl, tp, type });

        // Calculate PnL (Fixed Odds based on Ratio * Leverage)
        const betSize = 1000;
        const pnl = isWin ? (betSize * ratio * leverage) : betSize;
        const netPnl = isWin ? pnl : -pnl;

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

        setBalance(newBalance);

        setResult({
            win: isWin,
            amount: pnl.toFixed(2),
            percent: percentChange.toFixed(2)
        });

        // Reveal future candles on chart
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
                        Para operar, la suma de tus inversiones en LP y MP debe ser al menos el <strong>90%</strong> de tu capital total.
                    </p>
                    <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>LP + MP (Mín 90%)</span>
                            <span style={{ color: ruleStatus.combined >= 90 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{ruleStatus.combined.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px' }}>
                            <div style={{ width: `${Math.min(ruleStatus.combined, 100)}%`, height: '100%', background: ruleStatus.combined >= 90 ? '#4ade80' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                        </div>
                        {balance && (
                            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                LP: ${balance.lp.toLocaleString()} + MP: ${balance.mp.toLocaleString()} = <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>${(balance.lp + balance.mp).toLocaleString()}</span> de ${(balance.lp + balance.mp + balance.trading).toLocaleString()}
                            </div>
                        )}
                    </div>
                    <p style={{ marginTop: '20px', fontSize: '0.8rem' }}>Ve a las secciones LP y MP para invertir tu capital.</p>
                    <button
                        onClick={() => user && checkEligibility(user.uid)}
                        className="btn"
                        style={{ marginTop: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: '1px solid #fbbf24' }}
                    >
                        🔄 Verificar de nuevo
                    </button>
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
            {(() => {
                const chartHeight = 280;
                const padding = { top: 15, bottom: 15, left: 0, right: 0 };
                const innerH = chartHeight - padding.top - padding.bottom;
                const allPrices = candles.flatMap(c => [c.high, c.low]);
                if (tradeInfo) {
                    allPrices.push(tradeInfo.sl, tradeInfo.tp, tradeInfo.entryPrice);
                }
                const priceMin = Math.min(...allPrices) * 0.999;
                const priceMax = Math.max(...allPrices) * 1.001;
                const priceRange = priceMax - priceMin || 1;
                const yFromPrice = (price) => padding.top + innerH - ((price - priceMin) / priceRange) * innerH;
                const candleCount = candles.length;
                const entryIndex = 20; // divider line position

                return (
                    <div className="card" style={{ height: `${chartHeight}px`, padding: '0', position: 'relative', overflow: 'hidden' }}>
                        {/* SVG Chart */}
                        <svg width="100%" height={chartHeight} viewBox={`0 0 ${candleCount * 14} ${chartHeight}`} preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map(pct => (
                                <line key={pct} x1="0" y1={padding.top + innerH * pct} x2={candleCount * 14} y2={padding.top + innerH * pct} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                            ))}

                            {/* MA20 Line */}
                            {ma50Data.length > 1 && (
                                <polyline
                                    fill="none"
                                    stroke="#a78bfa"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.7"
                                    points={ma50Data.map((val, i) => `${i * 14 + 7},${yFromPrice(val)}`).join(' ')}
                                />
                            )}

                            {/* Entry Price Line */}
                            {tradeInfo && (
                                <>
                                    <line x1="0" y1={yFromPrice(tradeInfo.entryPrice)} x2={candleCount * 14} y2={yFromPrice(tradeInfo.entryPrice)} stroke="#fbbf24" strokeWidth="1" strokeDasharray="6,3" opacity="0.8" />
                                    <rect x="0" y={yFromPrice(tradeInfo.entryPrice) - 8} width="42" height="14" rx="2" fill="#fbbf24" opacity="0.9" />
                                    <text x="21" y={yFromPrice(tradeInfo.entryPrice) + 2} textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">ENTRY</text>
                                </>
                            )}

                            {/* TP Line */}
                            {tradeInfo && (
                                <>
                                    <line x1="0" y1={yFromPrice(tradeInfo.tp)} x2={candleCount * 14} y2={yFromPrice(tradeInfo.tp)} stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.9" />
                                    <rect x="0" y={yFromPrice(tradeInfo.tp) - 8} width="24" height="14" rx="2" fill="#4ade80" opacity="0.9" />
                                    <text x="12" y={yFromPrice(tradeInfo.tp) + 2} textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">TP</text>
                                </>
                            )}

                            {/* SL Line */}
                            {tradeInfo && (
                                <>
                                    <line x1="0" y1={yFromPrice(tradeInfo.sl)} x2={candleCount * 14} y2={yFromPrice(tradeInfo.sl)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.9" />
                                    <rect x="0" y={yFromPrice(tradeInfo.sl) - 8} width="22" height="14" rx="2" fill="#ef4444" opacity="0.9" />
                                    <text x="11" y={yFromPrice(tradeInfo.sl) + 2} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">SL</text>
                                </>
                            )}

                            {/* Vertical Divider at entry */}
                            {result && entryIndex < candleCount && (
                                <line x1={entryIndex * 14} y1="0" x2={entryIndex * 14} y2={chartHeight} stroke="rgba(251,191,36,0.4)" strokeWidth="1" strokeDasharray="4,4" />
                            )}

                            {/* Candles */}
                            {candles.map((candle, i) => {
                                const isGreen = candle.close >= candle.open;
                                const color = isGreen ? '#4ade80' : '#ef4444';
                                const bodyTop = yFromPrice(Math.max(candle.open, candle.close));
                                const bodyBot = yFromPrice(Math.min(candle.open, candle.close));
                                const bodyH = Math.max(bodyBot - bodyTop, 0.5);
                                const wickTop = yFromPrice(candle.high);
                                const wickBot = yFromPrice(candle.low);
                                const cx = i * 14 + 7;
                                const isRevealed = i >= entryIndex && result;
                                const opacity = isRevealed ? 0.95 : 0.85;

                                return (
                                    <g key={i} opacity={opacity}>
                                        {/* Revealed candle background tint */}
                                        {isRevealed && (
                                            <rect x={i * 14} y={0} width={14} height={chartHeight} fill="rgba(251,191,36,0.03)" />
                                        )}
                                        {/* Wick */}
                                        <line x1={cx} y1={wickTop} x2={cx} y2={wickBot} stroke={color} strokeWidth="1" />
                                        {/* Body */}
                                        <rect x={i * 14 + 3} y={bodyTop} width={8} height={bodyH} fill={color} rx="0.5" />
                                    </g>
                                );
                            })}
                        </svg>

                        {/* MA Legend */}
                        <div style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '0.6rem', color: '#a78bfa', fontWeight: '600', opacity: 0.8 }}>
                            MA20
                        </div>
                    </div>
                );
            })()}

            {/* Result Banner (below chart, doesn't hide candles) */}
            {result && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: '12px', marginBottom: '10px',
                    background: result.win ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${result.win ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{result.win ? '🤑' : '📉'}</span>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: result.win ? '#4ade80' : '#ef4444' }}>
                                {result.win ? `+$${result.amount}` : `-$${Math.abs(result.amount)}`}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Precio se movió {result.percent > 0 ? '+' : ''}{result.percent}%
                            </div>
                        </div>
                    </div>
                    <button onClick={fetchChart} className="btn" style={{ width: 'auto', padding: '8px 20px', fontSize: '0.8rem' }}>
                        Siguiente →
                    </button>
                </div>
            )}

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
