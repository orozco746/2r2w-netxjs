
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ShieldAlert, Plus, Save, Activity } from 'lucide-react';

const ADMIN_EMAILS = ['test@example.com', 'admin@2r2w.com', 'dev@2r2w.com', 'orozco746@gmail.com']; // Add your email here

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('projects');

    // Project Form State
    const [projectForm, setProjectForm] = useState({
        title: '',
        profitability: '',
        image: '',
        slots: 0,
        totalSlots: 0,
        price: 0
    });

    // Market Data Form State
    const [marketData, setMarketData] = useState({
        inflation: '3.4%',
        unemployment: '3.7%',
        interestRate: '5.25%',
        gdp: '2.5%'
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                if (ADMIN_EMAILS.includes(currentUser.email) || currentUser.uid === 'dev-123') {
                    setUser(currentUser);
                    fetchMarketData();
                } else {
                    router.push('/');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const fetchMarketData = async () => {
        try {
            const docRef = doc(db, "system_data", "market");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setMarketData(docSnap.data());
            }
        } catch (e) {
            console.error("Error fetching market data", e);
        }
    };

    const handleProjectSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "projects"), {
                ...projectForm,
                createdAt: new Date()
            });
            alert('Proyecto agregado correctamente');
            setProjectForm({ title: '', profitability: '', image: '', slots: 0, totalSlots: 0, price: 0 });
        } catch (e) {
            console.error("Error adding project: ", e);
            alert('Error al guardar proyecto');
        }
    };

    const handleMarketDataSubmit = async (e) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "system_data", "market"), marketData);
            alert('Datos de mercado actualizados');
        } catch (e) {
            console.error("Error updating market data: ", e);
            alert('Error al actualizar datos');
        }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Verificando permisos...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert /> Panel de Admin
            </h1>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button 
                    onClick={() => setActiveTab('projects')}
                    className="btn" 
                    style={{ background: activeTab === 'projects' ? 'var(--primary)' : 'var(--secondary)', color: activeTab === 'projects' ? 'black' : 'white' }}
                >
                    Proyectos LP
                </button>
                <button 
                    onClick={() => setActiveTab('market')}
                    className="btn" 
                    style={{ background: activeTab === 'market' ? 'var(--primary)' : 'var(--secondary)', color: activeTab === 'market' ? 'black' : 'white' }}
                >
                    Datos de Mercado
                </button>
            </div>

            {activeTab === 'projects' && (
                <div className="card">
                    <h2><Plus size={20} style={{ display: 'inline' }}/> Agregar Proyecto LP</h2>
                    <form onSubmit={handleProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input 
                            placeholder="Título (ej. Torre Lux)" 
                            value={projectForm.title}
                            onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                            style={{ padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                            required
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                placeholder="Rentabilidad (ej. 18% E.A.)" 
                                value={projectForm.profitability}
                                onChange={(e) => setProjectForm({...projectForm, profitability: e.target.value})}
                                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                                required
                            />
                            <input 
                                placeholder="Precio x Slot ($)" 
                                type="number"
                                value={projectForm.price || ''}
                                onChange={(e) => setProjectForm({...projectForm, price: Number(e.target.value)})}
                                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                placeholder="Slots Totales" 
                                type="number"
                                value={projectForm.totalSlots || ''}
                                onChange={(e) => setProjectForm({...projectForm, totalSlots: Number(e.target.value)})}
                                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                                required
                            />
                            <input 
                                placeholder="Slots Ocupados (Inicial)" 
                                type="number"
                                value={projectForm.slots || 0}
                                onChange={(e) => setProjectForm({...projectForm, slots: Number(e.target.value)})}
                                style={{ flex: 1, padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                            />
                        </div>
                        <input 
                            placeholder="URL Imagen" 
                            value={projectForm.image}
                            onChange={(e) => setProjectForm({...projectForm, image: e.target.value})}
                            style={{ padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' }}
                            required
                        />
                        <button type="submit" className="btn" style={{ marginTop: '10px' }}>Guardar Proyecto</button>
                    </form>
                </div>
            )}

            {activeTab === 'market' && (
                <div className="card">
                    <h2><Activity size={20} style={{ display: 'inline' }}/> Datos Económicos</h2>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Estos datos se mostrarán en la pantalla pública de Data.</p>
                    <form onSubmit={handleMarketDataSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Inflación (CPI)</span>
                                <input 
                                    value={marketData.inflation}
                                    onChange={(e) => setMarketData({...marketData, inflation: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white', marginTop: '5px' }}
                                />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Desempleo</span>
                                <input 
                                    value={marketData.unemployment}
                                    onChange={(e) => setMarketData({...marketData, unemployment: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white', marginTop: '5px' }}
                                />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Tasa de Interés (Fed)</span>
                                <input 
                                    value={marketData.interestRate}
                                    onChange={(e) => setMarketData({...marketData, interestRate: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white', marginTop: '5px' }}
                                />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Crecimiento GDP</span>
                                <input 
                                    value={marketData.gdp}
                                    onChange={(e) => setMarketData({...marketData, gdp: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white', marginTop: '5px' }}
                                />
                            </label>
                        </div>
                        <button type="submit" className="btn" style={{ marginTop: '10px', background: '#4ade80', color: 'black' }}>
                            <Save size={18} style={{ marginRight: '5px' }}/> Actualizar Datos
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
