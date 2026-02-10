
'use client';

import { useState, useEffect } from 'react';
import { Activity, Thermometer, TrendingUp, Percent, BarChart } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function MarketData() {
    const [fearGreed, setFearGreed] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
             // 1. Fetch Fear & Greed Index (Public API)
             try {
                 const res = await fetch('https://api.alternative.me/fng/?limit=1');
                 const data = await res.json();
                 setFearGreed(data.data[0]);
             } catch (e) {
                 console.error("Error fetching F&G:", e);
             }

             // 2. Fetch System Market Data (Firestore)
             try {
                const docRef = doc(db, "system_data", "market");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMarketData(docSnap.data());
                } else {
                    // Defaults
                     setMarketData({
                        inflation: '3.4%',
                        unemployment: '3.7%',
                        interestRate: '5.25%',
                        gdp: '2.5%'
                    });
                }
            } catch (e) {
                console.error("Error fetching market data", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando datos...</div>;

    const getFearColor = (val) => {
        val = parseInt(val);
        if (val <= 25) return '#ef4444'; // Extreme Fear
        if (val <= 45) return '#f97316'; // Fear
        if (val <= 55) return '#eab308'; // Neutral
        if (val <= 75) return '#84cc16'; // Greed
        return '#22c55e'; // Extreme Greed
    };

    return (
        <div>
             {/* Header */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Activity size={28} color="var(--primary)" />
                <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Datos de Mercado</h1>
            </div>

            {/* FEAR & GREED INDEX */}
            <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '10px' }}>Crypto Fear & Greed Index</h2>
                {fearGreed ? (
                    <div style={{ position: 'relative', padding: '20px 0' }}>
                         <div style={{ fontSize: '3rem', fontWeight: '800', color: getFearColor(fearGreed.value) }}>
                            {fearGreed.value}
                         </div>
                         <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: getFearColor(fearGreed.value) }}>
                             {fearGreed.value_classification}
                         </div>
                         <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '5px' }}>
                             Actualización: {new Date(fearGreed.timestamp * 1000).toLocaleDateString()}
                         </div>
                    </div>
                ) : (
                    <div>Cargando índice...</div>
                )}
            </div>

            {/* ECONOMIC INDICATORS */}
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Indicadores Económicos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                <div className="card" style={{ padding: '15px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#94a3b8' }}>
                        <Thermometer size={16} /> Inflación (CPI)
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData?.inflation}</div>
                </div>

                <div className="card" style={{ padding: '15px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#94a3b8' }}>
                        <Percent size={16} /> Tasa de Interés
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData?.interestRate}</div>
                </div>

                <div className="card" style={{ padding: '15px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#94a3b8' }}>
                        <BarChart size={16} /> Desempleo
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData?.unemployment}</div>
                </div>

                <div className="card" style={{ padding: '15px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#94a3b8' }}>
                        <TrendingUp size={16} /> GDP Growth
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{marketData?.gdp}</div>
                </div>

            </div>
        </div>
    );
}
