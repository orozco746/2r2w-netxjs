'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function LP() {
    const [balance, setBalance] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [investing, setInvesting] = useState(null); // ID of project being invested in

    const projects = [
        {
            id: 1,
            title: 'Residencial Altos',
            profitability: '18%',
            image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&q=80',
            slots: 12,
            totalSlots: 50,
            price: 5000
        },
        {
            id: 2,
            title: 'Torre Corporativa',
            profitability: '24%',
            image: 'https://images.unsplash.com/photo-1486406140926-c627a92ad1ab?w=500&q=80',
            slots: 5,
            totalSlots: 20,
            price: 15000
        },
        {
            id: 3,
            title: 'Plaza Comercial',
            profitability: '15%',
            image: 'https://images.unsplash.com/photo-1582037928769-1d8f977dbd93?w=500&q=80',
            slots: 45,
            totalSlots: 100,
            price: 2500
        },
        {
            id: 4,
            title: 'Eco Villas',
            profitability: '20%',
            image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500&q=80',
            slots: 2,
            totalSlots: 10,
            price: 25000
        }
    ];

    useEffect(() => {
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

    if (loading) return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h1>Oportunidades (LP)</h1>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Disp: <span style={{ color: '#fff', fontWeight: 'bold' }}>${balance?.trading.toLocaleString()}</span>
                </div>
            </div>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem' }}>Invierte tu capital para desbloquear el trading.</p>

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
