/**
 * @file page.js (Screen 2 - MP)
 * @description Market Portfolio (MP) screen with two tabs:
 * - "Operar": Browse and buy stocks/ETFs using trading balance.
 * - "Mis Posiciones": View open positions with P&L and close (total/partial).
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, X, Minus, Plus, Briefcase, BarChart2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
    doc, getDoc, updateDoc, setDoc, deleteDoc,
    collection, getDocs, query, where, addDoc, serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * MP Component
 * @returns {JSX.Element} The market portfolio view with tabs
 */
export default function MP() {
    const [charts, setCharts] = useState({});
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [assets, setAssets] = useState([]);

    // Tabs
    const [activeTab, setActiveTab] = useState('operar'); // 'operar' | 'posiciones'

    // Buy modal state
    const [buyModal, setBuyModal] = useState(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    const [buyAmount, setBuyAmount] = useState(0);

    // Positions state
    const [positions, setPositions] = useState([]);

    // Close modal state
    const [closeModal, setCloseModal] = useState(null); // position object
    const [closeQuantity, setCloseQuantity] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchBalance(currentUser.uid);
                fetchPositions(currentUser.uid);
            }
            await fetchAssets();
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Re-fetch positions when switching to the positions tab
    useEffect(() => {
        if (activeTab === 'posiciones' && user) {
            fetchPositions(user.uid);
        }
    }, [activeTab]);

    /**
     * Fetches MP assets from Firestore mp_assets collection.
     */
    const fetchAssets = async () => {
        try {
            const q = query(collection(db, 'mp_assets'), where('active', '==', true));
            const snapshot = await getDocs(q);
            const fetched = [];
            snapshot.forEach((d) => {
                fetched.push({ id: d.id, ...d.data() });
            });
            setAssets(fetched);

            const newCharts = {};
            fetched.forEach(asset => {
                newCharts[asset.symbol] = Array.from({ length: 20 }).map(() => Math.floor(Math.random() * 50) + 10);
            });
            setCharts(newCharts);
        } catch (e) {
            console.error("Error fetching MP assets:", e.code, e.message);
        }
    };

    const fetchBalance = async (uid) => {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setBalance(docSnap.data().balance);
        }
    };

    /**
     * Fetches user's open MP positions from Firestore.
     */
    const fetchPositions = async (uid) => {
        try {
            const snapshot = await getDocs(collection(db, `users/${uid}/mp_positions`));
            const pos = [];
            snapshot.forEach((d) => {
                pos.push({ id: d.id, ...d.data() });
            });
            setPositions(pos);
        } catch (e) {
            console.error("Error fetching positions:", e);
        }
    };

    /**
     * Opens the buy modal for a given asset.
     */
    const openBuyModal = (asset) => {
        setBuyQuantity(1);
        setBuyAmount(asset.buy);
        setBuyModal(asset);
    };

    const maxAffordable = buyModal ? Math.floor((balance?.trading || 0) / buyModal.buy) : 0;

    const trueTotal = balance ? (balance.lp + balance.mp + balance.trading) : 0;
    const lpPercent = trueTotal > 0 ? (balance.lp / trueTotal) * 100 : 0;
    const canBuy = lpPercent >= 50;

    const updateQuantity = (qty) => {
        if (!buyModal) return;
        const clamped = Math.min(Math.max(0, qty), maxAffordable);
        setBuyQuantity(clamped);
        setBuyAmount(parseFloat((clamped * buyModal.buy).toFixed(2)));
    };

    const updateAmount = (amt) => {
        if (!buyModal) return;
        const maxAmount = (balance?.trading || 0);
        const clamped = Math.min(Math.max(0, amt), maxAmount);
        setBuyAmount(clamped);
        setBuyQuantity(Math.floor(clamped / buyModal.buy));
    };

    /**
     * Handles buying an asset.
     * Updates balance AND creates/updates a position document.
     */
    const handleBuy = async () => {
        if (!buyModal || buyQuantity < 1) return;
        const quantity = buyQuantity;
        const cost = buyModal.buy * quantity;

        if (!balance || balance.trading < cost) {
            alert("Fondos insuficientes en Balance de Trading");
            return;
        }

        if (!canBuy) {
            alert("Debes tener al menos el 50% de tu capital en LP para comprar en MP.");
            return;
        }

        setProcessing(buyModal.symbol);

        try {
            // 1. Update balance
            const newBalance = {
                ...balance,
                trading: balance.trading - cost,
                mp: balance.mp + cost
            };

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { balance: newBalance });

            // 2. Create or update position
            // Check if a position for this symbol already exists
            const existingPos = positions.find(p => p.symbol === buyModal.symbol);

            if (existingPos) {
                // Average into existing position
                const newQty = existingPos.quantity + quantity;
                const newTotalCost = existingPos.totalCost + cost;
                const newEntryPrice = newTotalCost / newQty;

                const posRef = doc(db, `users/${user.uid}/mp_positions`, existingPos.id);
                await updateDoc(posRef, {
                    quantity: newQty,
                    totalCost: newTotalCost,
                    entryPrice: parseFloat(newEntryPrice.toFixed(4))
                });
            } else {
                // Create new position
                await addDoc(collection(db, `users/${user.uid}/mp_positions`), {
                    symbol: buyModal.symbol,
                    name: buyModal.name,
                    quantity: quantity,
                    entryPrice: buyModal.buy,
                    totalCost: cost,
                    timestamp: serverTimestamp()
                });
            }

            setBalance(newBalance);
            await fetchPositions(user.uid);
            alert(`Compra exitosa de ${quantity} acción${quantity > 1 ? 'es' : ''} de ${buyModal.symbol} por $${cost.toFixed(2)}`);
            setBuyModal(null);
        } catch (error) {
            console.error("Error Buying:", error);
            alert("Error al procesar la compra");
        } finally {
            setProcessing(null);
        }
    };

    /**
     * Gets current market price for a symbol from assets.
     */
    const getCurrentPrice = (symbol) => {
        const asset = assets.find(a => a.symbol === symbol);
        return asset ? asset.buy : 0;
    };

    /**
     * Opens the close position modal.
     */
    const openCloseModal = (position) => {
        setCloseQuantity(position.quantity); // Default to full close
        setCloseModal(position);
    };

    /**
     * Handles closing a position (full or partial).
     */
    const handleClosePosition = async () => {
        if (!closeModal || closeQuantity < 1) return;

        const position = closeModal;
        const qty = Math.min(closeQuantity, position.quantity);
        const currentPrice = getCurrentPrice(position.symbol);
        const proceeds = currentPrice * qty;

        setProcessing(position.id);

        try {
            // 1. Update balance: add proceeds to trading, subtract from mp
            const costBasis = position.entryPrice * qty;
            const newBalance = {
                ...balance,
                trading: balance.trading + proceeds,
                mp: Math.max(0, balance.mp - costBasis)
            };

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { balance: newBalance });

            // 2. Update or delete position
            const posRef = doc(db, `users/${user.uid}/mp_positions`, position.id);

            if (qty >= position.quantity) {
                // Full close — delete position
                await deleteDoc(posRef);
            } else {
                // Partial close — reduce quantity
                const remainingQty = position.quantity - qty;
                const remainingCost = position.entryPrice * remainingQty;
                await updateDoc(posRef, {
                    quantity: remainingQty,
                    totalCost: remainingCost
                });
            }

            setBalance(newBalance);
            await fetchPositions(user.uid);
            const pnl = proceeds - (position.entryPrice * qty);
            alert(`Posición cerrada: ${qty} acción${qty > 1 ? 'es' : ''} de ${position.symbol}\nProceeds: $${proceeds.toFixed(2)}\nP&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
            setCloseModal(null);
        } catch (error) {
            console.error("Error closing position:", error);
            alert("Error al cerrar posición");
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Mercado (MP)</h1>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                         Inv: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>${balance?.mp.toFixed(2)}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '5px 10px', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid var(--primary)', display: 'inline-block', marginBottom: '4px' }}>
                        • En vivo
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Disp: <span style={{ color: '#fff', fontWeight: 'bold' }}>${balance?.trading.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '16px', background: '#0f172a', borderRadius: '12px', padding: '4px' }}>
                <button
                    onClick={() => setActiveTab('operar')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        background: activeTab === 'operar' ? 'linear-gradient(135deg, var(--primary), #d97706)' : 'transparent',
                        color: activeTab === 'operar' ? '#0f172a' : '#94a3b8',
                        fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <BarChart2 size={16} /> Operar
                </button>
                <button
                    onClick={() => setActiveTab('posiciones')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        background: activeTab === 'posiciones' ? 'linear-gradient(135deg, var(--primary), #d97706)' : 'transparent',
                        color: activeTab === 'posiciones' ? '#0f172a' : '#94a3b8',
                        fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Briefcase size={16} /> Mis Posiciones
                    {positions.length > 0 && (
                        <span style={{
                            background: activeTab === 'posiciones' ? '#0f172a' : 'var(--primary)',
                            color: activeTab === 'posiciones' ? 'var(--primary)' : '#0f172a',
                            borderRadius: '50%', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: '800'
                        }}>
                            {positions.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ===== TAB: OPERAR ===== */}
            {activeTab === 'operar' && (
                <>
                    {assets.map((asset) => (
                        <div key={asset.symbol} className="card" style={{ padding: '20px' }}>
                            {/* Asset Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px', height: '40px', background: 'var(--secondary)',
                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '0.8rem', color: '#e2e8f0',
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
                                        fontSize: '0.85rem', fontWeight: '600',
                                        color: asset.isPositive ? '#4ade80' : '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'
                                    }}>
                                        {asset.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {asset.change}
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '20px', opacity: 0.8 }}>
                                {charts[asset.symbol] ? charts[asset.symbol].map((height, i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        background: `linear-gradient(to top, transparent, ${asset.chartColor})`,
                                        height: `${height}%`, borderRadius: '2px'
                                    }} />
                                )) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748b' }}>Cargando gráfica...</div>}
                            </div>

                            {/* Buy Button */}
                            <button
                                className="btn"
                                onClick={() => canBuy ? openBuyModal(asset) : null}
                                disabled={processing === asset.symbol || balance?.trading < asset.buy || !canBuy}
                                style={{
                                    background: canBuy ? 'linear-gradient(135deg, var(--primary), #d97706)' : 'rgba(239, 68, 68, 0.15)',
                                    color: canBuy ? '#0f172a' : '#ef4444',
                                    height: '48px', fontSize: '0.9rem',
                                    border: canBuy ? 'none' : '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                {!canBuy
                                    ? `🔒 Requiere 50% en LP (actual: ${lpPercent.toFixed(0)}%)`
                                    : processing === asset.symbol
                                        ? 'Procesando...'
                                        : `Comprar ($${asset.buy}/acción)`
                                }
                            </button>
                        </div>
                    ))}
                </>
            )}

            {/* ===== TAB: MIS POSICIONES ===== */}
            {activeTab === 'posiciones' && (
                <>
                    {positions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                            <Briefcase size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ fontSize: '0.9rem' }}>No tienes posiciones abiertas</p>
                            <p style={{ fontSize: '0.75rem' }}>Ve a la pestaña "Operar" para comprar acciones.</p>
                        </div>
                    ) : (
                        positions.map((pos) => {
                            const currentPrice = getCurrentPrice(pos.symbol);
                            const marketValue = currentPrice * pos.quantity;
                            const pnl = marketValue - pos.totalCost;
                            const pnlPercent = pos.totalCost > 0 ? (pnl / pos.totalCost) * 100 : 0;
                            const isProfit = pnl >= 0;

                            return (
                                <div key={pos.id} className="card" style={{
                                    padding: '16px',
                                    borderLeft: `4px solid ${isProfit ? '#4ade80' : '#ef4444'}`
                                }}>
                                    {/* Position Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f1f5f9' }}>{pos.symbol}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{pos.name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '700', color: isProfit ? '#4ade80' : '#ef4444' }}>
                                                {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: isProfit ? '#4ade80' : '#ef4444' }}>
                                                {isProfit ? '+' : ''}${pnl.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Position Details */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                                        gap: '8px', marginBottom: '12px',
                                        background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Cantidad</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>{pos.quantity}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Entrada</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc' }}>${pos.entryPrice.toFixed(2)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Actual</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24' }}>${currentPrice.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Value Bar */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px'
                                    }}>
                                        <span>Invertido: ${pos.totalCost.toFixed(2)}</span>
                                        <span>Valor actual: <span style={{ color: '#fbbf24', fontWeight: '700' }}>${marketValue.toFixed(2)}</span></span>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        className="btn"
                                        onClick={() => openCloseModal(pos)}
                                        disabled={processing === pos.id}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            height: '40px', fontSize: '0.85rem'
                                        }}
                                    >
                                        {processing === pos.id ? 'Cerrando...' : 'Cerrar Posición'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </>
            )}

            {/* ===== BUY MODAL ===== */}
            {buyModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px'
                }} onClick={() => setBuyModal(null)}>
                    <div style={{
                        background: '#1e293b', borderRadius: '16px', padding: '28px',
                        width: '100%', maxWidth: '380px',
                        border: '1px solid rgba(251,191,36,0.2)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Comprar {buyModal.symbol}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{buyModal.name} — ${buyModal.buy}/acción</p>
                            </div>
                            <button onClick={() => setBuyModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Dual Input: Shares & Dollars */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Acciones</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button onClick={() => updateQuantity(buyQuantity - 1)}
                                        style={{ width: '36px', height: '40px', borderRadius: '8px', background: '#334155', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                        <Minus size={14} />
                                    </button>
                                    <input type="number" min="0" max={maxAffordable} value={buyQuantity}
                                        onChange={(e) => updateQuantity(parseInt(e.target.value) || 0)}
                                        style={{ width: '100%', textAlign: 'center', padding: '10px 4px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(251,191,36,0.3)', color: 'white', fontSize: '1.1rem', fontWeight: '700' }}
                                    />
                                    <button onClick={() => updateQuantity(buyQuantity + 1)}
                                        style={{ width: '36px', height: '40px', borderRadius: '8px', background: '#334155', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Monto (USD)</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', fontWeight: '700', fontSize: '1rem' }}>$</span>
                                    <input type="number" min="0" step="0.01" value={buyAmount}
                                        onChange={(e) => updateAmount(parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', textAlign: 'right', padding: '10px 10px 10px 24px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(251,191,36,0.3)', color: 'white', fontSize: '1.1rem', fontWeight: '700', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Max button */}
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <button onClick={() => updateQuantity(maxAffordable)}
                                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '4px 16px', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                                Máx: {maxAffordable} acciones
                            </button>
                        </div>

                        {/* Summary */}
                        <div style={{
                            background: 'rgba(251,191,36,0.05)', borderRadius: '10px', padding: '14px',
                            marginBottom: '20px', border: '1px solid rgba(251,191,36,0.15)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total a pagar</span>
                                <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#fbbf24' }}>
                                    ${(buyModal.buy * buyQuantity).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Balance disponible</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>${balance?.trading.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Confirm */}
                        <button className="btn" onClick={handleBuy}
                            disabled={processing || buyQuantity < 1 || buyQuantity > maxAffordable}
                            style={{
                                background: 'linear-gradient(135deg, var(--primary), #d97706)',
                                color: '#0f172a', height: '48px', fontSize: '0.95rem', fontWeight: '700',
                                width: '100%', opacity: (buyQuantity < 1 || buyQuantity > maxAffordable) ? 0.5 : 1
                            }}>
                            {processing ? 'Procesando...' : `Confirmar Compra (${buyQuantity} acción${buyQuantity > 1 ? 'es' : ''})`}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== CLOSE POSITION MODAL ===== */}
            {closeModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px'
                }} onClick={() => setCloseModal(null)}>
                    <div style={{
                        background: '#1e293b', borderRadius: '16px', padding: '28px',
                        width: '100%', maxWidth: '380px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Close Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>Cerrar {closeModal.symbol}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {closeModal.quantity} acciones @ ${closeModal.entryPrice.toFixed(2)}
                                </p>
                            </div>
                            <button onClick={() => setCloseModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Quick buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {[
                                { label: '25%', qty: Math.max(1, Math.floor(closeModal.quantity * 0.25)) },
                                { label: '50%', qty: Math.max(1, Math.floor(closeModal.quantity * 0.5)) },
                                { label: '75%', qty: Math.max(1, Math.floor(closeModal.quantity * 0.75)) },
                                { label: '100%', qty: closeModal.quantity }
                            ].map(opt => (
                                <button key={opt.label}
                                    onClick={() => setCloseQuantity(opt.qty)}
                                    style={{
                                        flex: 1, padding: '8px 4px', borderRadius: '8px',
                                        border: closeQuantity === opt.qty ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                        background: closeQuantity === opt.qty ? 'rgba(239, 68, 68, 0.15)' : '#0f172a',
                                        color: closeQuantity === opt.qty ? '#ef4444' : '#94a3b8',
                                        fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                                    }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Quantity input */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                                Acciones a cerrar
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => setCloseQuantity(Math.max(1, closeQuantity - 1))}
                                    style={{ width: '40px', height: '44px', borderRadius: '8px', background: '#334155', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Minus size={16} />
                                </button>
                                <input type="number" min="1" max={closeModal.quantity} value={closeQuantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCloseQuantity(Math.min(Math.max(1, val), closeModal.quantity));
                                    }}
                                    style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)', color: 'white', fontSize: '1.2rem', fontWeight: '700' }}
                                />
                                <button onClick={() => setCloseQuantity(Math.min(closeQuantity + 1, closeModal.quantity))}
                                    style={{ width: '40px', height: '44px', borderRadius: '8px', background: '#334155', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Close Summary */}
                        {(() => {
                            const currentPrice = getCurrentPrice(closeModal.symbol);
                            const proceeds = currentPrice * closeQuantity;
                            const costBasis = closeModal.entryPrice * closeQuantity;
                            const pnl = proceeds - costBasis;
                            const isProfit = pnl >= 0;

                            return (
                                <div style={{
                                    background: isProfit ? 'rgba(74,222,128,0.05)' : 'rgba(239,68,68,0.05)',
                                    borderRadius: '10px', padding: '14px', marginBottom: '20px',
                                    border: `1px solid ${isProfit ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Precio de venta</span>
                                        <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '600' }}>${currentPrice.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Proceeds</span>
                                        <span style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '700' }}>${proceeds.toFixed(2)}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>P&L</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: isProfit ? '#4ade80' : '#ef4444' }}>
                                            {isProfit ? '+' : ''}${pnl.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Confirm Close */}
                        <button className="btn" onClick={handleClosePosition}
                            disabled={processing || closeQuantity < 1}
                            style={{
                                background: '#ef4444', color: 'white',
                                height: '48px', fontSize: '0.95rem', fontWeight: '700', width: '100%'
                            }}>
                            {processing ? 'Cerrando...' : closeQuantity >= closeModal.quantity
                                ? 'Cerrar Posición Completa'
                                : `Cerrar ${closeQuantity} de ${closeModal.quantity} acciones`
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
