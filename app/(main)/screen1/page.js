/**
 * @file page.js (Screen 1 - LP)
 * @description Investment Opportunities (LP) screen.
 * Users can invest their trading balance into real estate or business projects (LP).
 * Investments transfer funds from Trading balance to LP balance.
 */

'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * LP Component
 * @returns {JSX.Element} The investment opportunities list
 */
export default function LP() {
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [investing, setInvesting] = useState(null); // ID of project being invested in


    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchBalance(currentUser.uid);
            }
            // Fetch Projects
            fetchProjects();
        });
        return () => unsubscribe();
    }, []);

    const fetchProjects = async () => {
         try {
             // In a real app, you might want to order by createdAt
             const querySnapshot = await getDocs(collection(db, "projects"));
             const projs = [];
             querySnapshot.forEach((doc) => {
                 projs.push({ id: doc.id, ...doc.data() });
             });
             setProjects(projs);
         } catch (e) {
             console.error("Error fetching projects:", e);
         } finally {
             setLoading(false);
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
     * Handles investment in a project.
     * Deducts price from Trading balance and adds to LP balance.
     * @param {Object} project - The project to invest in
     */
    const handleInvest = async (project) => {
        if (!balance || balance.trading < project.price) {
            alert("Fondos insuficientes en Balance de Trading");
            return;
        }

        setInvesting(project.id);

        try {
            const newBalance = {
                ...balance,
                trading: balance.trading - project.price,
                lp: balance.lp + project.price
            };

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                balance: newBalance
            });

            setBalance(newBalance);
            alert(`Inversión exitosa en ${project.title}`);
        } catch (error) {
            console.error("Error investing:", error);
            alert("Error al procesar la inversión");
        } finally {
            setInvesting(null);
        }
    };


    /**
     * Withdraws all capital from LP balance to Trading balance.
     */
    const handleWithdraw = async () => {
        if (!balance || balance.lp <= 0) {
            alert("No tienes capital invertido en LP para retirar.");
            return;
        }

        if (!confirm("¿Estás seguro de retirar todo tu capital de LP a Trading?")) return;

        setInvesting('withdraw');

        try {
            const newBalance = {
                ...balance,
                trading: balance.trading + balance.lp,
                lp: 0
            };

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                balance: newBalance
            });

            setBalance(newBalance);
            alert("Capital retirado exitosamente a Trading.");
        } catch (error) {
            console.error("Error withdrawing:", error);
            alert("Error al retirar capital.");
        } finally {
            setInvesting(null);
        }
    };

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Oportunidades (LP)</h1>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                         Inv: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>${balance?.lp.toLocaleString()}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Disp: <span style={{ color: '#fff', fontWeight: 'bold' }}>${balance?.trading.toLocaleString()}</span>
                    </div>
                    {balance?.lp > 0 && (
                        <button 
                            onClick={handleWithdraw}
                            disabled={investing === 'withdraw'}
                            style={{ 
                                background: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                cursor: 'pointer' 
                            }}
                        >
                            {investing === 'withdraw' ? '...' : 'Retirar Todo'}
                        </button>
                    )}
                </div>
            </div>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>Invierte tu capital para desbloquear el trading.</p>

            {/* Projects List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {projects.map((project) => (
                    <div key={project.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            height: '150px',
                            backgroundImage: `url(${project.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'rgba(0,0,0,0.8)',
                                color: 'var(--primary)',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid var(--primary)'
                            }}>
                                <TrendingUp size={14} />
                                {project.profitability} E.A.
                            </div>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '5px', color: 'white' }}>{project.title}</h2>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={14} /> Disponibilidad
                                    </span>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{project.slots} / {project.totalSlots} plazas</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <DollarSign size={14} /> Monto
                                    </span>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.2rem' }}>${project.price.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                className="btn"
                                onClick={() => handleInvest(project)}
                                disabled={investing === project.id || balance?.trading < project.price}
                                style={{
                                    marginTop: '20px',
                                    padding: '12px',
                                    fontSize: '0.9rem',
                                    opacity: (balance?.trading < project.price) ? 0.5 : 1
                                }}
                            >
                                {investing === project.id ? 'Procesando...' : (balance?.trading < project.price ? 'Fondos Insuficientes' : 'Invertir Ahora')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
