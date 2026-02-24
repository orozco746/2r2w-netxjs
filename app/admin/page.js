'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, Plus, Save, Activity, Trash2 } from 'lucide-react';

const ADMIN_EMAILS = ['test@example.com', 'admin@2r2w.com', 'dev@2r2w.com', 'orozco746@gmail.com', 'jeorozcob@gmail.com'];

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('projects');

    // Project Form State
    const [projectForm, setProjectForm] = useState({
        title: '', profitability: '', image: '', slots: 0, totalSlots: 0, price: 0
    });

    // Market Data Form State
    const [marketData, setMarketData] = useState({
        inflation: '3.4%', unemployment: '3.7%', interestRate: '5.25%', gdp: '2.5%'
    });

    // MP Assets State
    const [mpForm, setMpForm] = useState({
        symbol: '', name: '', price: 0, change: '', isPositive: true,
        per: '', buy: 0, sell: 0, chartColor: '#4ade80', active: true
    });
    const [mpAssets, setMpAssets] = useState([]);
    const [lpProjects, setLpProjects] = useState([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                if (ADMIN_EMAILS.includes(currentUser.email) || currentUser.uid === 'dev-123') {
                    setUser(currentUser);
                    fetchMarketData();
                    fetchMpAssets();
                    fetchLpProjects();
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
            if (docSnap.exists()) setMarketData(docSnap.data());
        } catch (e) { console.error("Error fetching market data", e); }
    };

    const fetchMpAssets = async () => {
        try {
            const snapshot = await getDocs(collection(db, "mp_assets"));
            const assets = [];
            snapshot.forEach((d) => assets.push({ id: d.id, ...d.data() }));
            setMpAssets(assets);
        } catch (e) { console.error("Error fetching MP assets", e); }
    };

    const fetchLpProjects = async () => {
        try {
            const snapshot = await getDocs(collection(db, "projects"));
            const projs = [];
            snapshot.forEach((d) => projs.push({ id: d.id, ...d.data() }));
            setLpProjects(projs);
        } catch (e) { console.error("Error fetching LP projects", e); }
    };

    const handleDeleteProject = async (projectId) => {
        if (!confirm(`¿Eliminar este proyecto?`)) return;
        try {
            await deleteDoc(doc(db, "projects", projectId));
            fetchLpProjects();
        } catch (e) { console.error("Error deleting project:", e); }
    };

    const handleProjectSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "projects"), { ...projectForm, createdAt: new Date() });
            alert('Proyecto agregado correctamente');
            setProjectForm({ title: '', profitability: '', image: '', slots: 0, totalSlots: 0, price: 0 });
            fetchLpProjects();
        } catch (e) { console.error("Error adding project: ", e); alert('Error al guardar proyecto'); }
    };

    const handleMarketDataSubmit = async (e) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "system_data", "market"), marketData);
            alert('Datos de mercado actualizados');
        } catch (e) { console.error("Error updating market data: ", e); alert('Error al actualizar datos'); }
    };

    const handleMpSubmit = async (e) => {
        e.preventDefault();
        if (!mpForm.symbol) { alert('Symbol es obligatorio'); return; }
        try {
            await setDoc(doc(db, "mp_assets", mpForm.symbol.toUpperCase()), {
                ...mpForm,
                symbol: mpForm.symbol.toUpperCase(),
                price: Number(mpForm.price),
                buy: Number(mpForm.buy),
                sell: Number(mpForm.sell),
                updatedAt: new Date()
            });
            alert(`Activo ${mpForm.symbol.toUpperCase()} guardado`);
            setMpForm({ symbol: '', name: '', price: 0, change: '', isPositive: true, per: '', buy: 0, sell: 0, chartColor: '#4ade80', active: true });
            fetchMpAssets();
        } catch (e) { console.error("Error saving MP asset:", e); alert('Error al guardar activo'); }
    };

    const handleDeleteMpAsset = async (symbol) => {
        if (!confirm(`¿Eliminar ${symbol}?`)) return;
        try {
            await deleteDoc(doc(db, "mp_assets", symbol));
            fetchMpAssets();
        } catch (e) { console.error("Error deleting:", e); }
    };

    const inputStyle = { padding: '10px', borderRadius: '5px', background: '#334155', border: 'none', color: 'white' };
    const tabButtonStyle = (tab) => ({
        background: activeTab === tab ? 'var(--primary)' : 'var(--secondary)',
        color: activeTab === tab ? 'black' : 'white',
        fontSize: '0.8rem',
        padding: '8px 12px'
    });

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Verificando permisos...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert /> Panel de Admin
            </h1>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('projects')} className="btn" style={tabButtonStyle('projects')}>Proyectos LP</button>
                <button onClick={() => setActiveTab('mp')} className="btn" style={tabButtonStyle('mp')}>Activos MP</button>
                <button onClick={() => setActiveTab('market')} className="btn" style={tabButtonStyle('market')}>Datos Mercado</button>
            </div>

            {/* ===== PROJECTS LP TAB ===== */}
            {activeTab === 'projects' && (
                <div className="card">
                    <h2><Activity size={20} style={{ display: 'inline' }}/> Gestionar Proyectos LP</h2>

                    {/* Existing Projects */}
                    {lpProjects.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Proyectos Actuales ({lpProjects.length})</h3>
                            {lpProjects.map((p) => (
                                <div key={p.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#1e293b', padding: '10px 15px', borderRadius: '8px', marginBottom: '6px'
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{p.title}</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '10px' }}>{p.profitability}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: '#4ade80', fontSize: '0.85rem' }}>${p.price}/slot</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{p.slots}/{p.totalSlots}</span>
                                        <button onClick={() => handleDeleteProject(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Form */}
                    <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Agregar Proyecto</h3>
                    <form onSubmit={handleProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input placeholder="Título (ej. Torre Lux)" value={projectForm.title} onChange={(e) => setProjectForm({...projectForm, title: e.target.value})} style={inputStyle} required />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input placeholder="Rentabilidad (ej. 18% E.A.)" value={projectForm.profitability} onChange={(e) => setProjectForm({...projectForm, profitability: e.target.value})} style={{ ...inputStyle, flex: 1 }} required />
                            <input placeholder="Precio x Slot ($)" type="number" value={projectForm.price || ''} onChange={(e) => setProjectForm({...projectForm, price: Number(e.target.value)})} style={{ ...inputStyle, flex: 1 }} required />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Total Tramos (Slots)</label>
                                <input placeholder="Total a vender" type="number" value={projectForm.totalSlots || ''} onChange={(e) => setProjectForm({...projectForm, totalSlots: Number(e.target.value)})} style={{ ...inputStyle, width: '100%' }} required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Tramos Vendidos</label>
                                <input placeholder="Ya comprados" type="number" value={projectForm.slots || 0} onChange={(e) => setProjectForm({...projectForm, slots: Number(e.target.value)})} style={{ ...inputStyle, width: '100%' }} />
                            </div>
                        </div>
                        <input placeholder="URL Imagen" value={projectForm.image} onChange={(e) => setProjectForm({...projectForm, image: e.target.value})} style={inputStyle} required />
                        <button type="submit" className="btn" style={{ marginTop: '10px' }}>Guardar Proyecto</button>
                    </form>
                </div>
            )}

            {/* ===== MP ASSETS TAB ===== */}
            {activeTab === 'mp' && (
                <div className="card">
                    <h2><Activity size={20} style={{ display: 'inline' }}/> Gestionar Activos MP</h2>

                    {/* Existing Assets */}
                    {mpAssets.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Activos Actuales ({mpAssets.length})</h3>
                            {mpAssets.map((a) => (
                                <div key={a.symbol} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: '#1e293b', padding: '10px 15px', borderRadius: '8px', marginBottom: '6px'
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{a.symbol}</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '10px' }}>{a.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: a.isPositive ? '#4ade80' : '#ef4444', fontSize: '0.85rem' }}>${a.price}</span>
                                        <span style={{ color: a.active ? '#4ade80' : '#ef4444', fontSize: '0.75rem' }}>{a.active ? '●' : '○'}</span>
                                        <button onClick={() => handleDeleteMpAsset(a.symbol)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add/Edit Form */}
                    <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Agregar / Editar Activo</h3>
                    <form onSubmit={handleMpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input placeholder="Símbolo (ej. AAPL)" value={mpForm.symbol} onChange={(e) => setMpForm({...mpForm, symbol: e.target.value})} style={{ ...inputStyle, flex: 1 }} required />
                            <input placeholder="Nombre (ej. Apple Inc)" value={mpForm.name} onChange={(e) => setMpForm({...mpForm, name: e.target.value})} style={{ ...inputStyle, flex: 2 }} required />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input placeholder="Precio" type="number" step="0.01" value={mpForm.price || ''} onChange={(e) => setMpForm({...mpForm, price: Number(e.target.value)})} style={{ ...inputStyle, flex: 1 }} required />
                            <input placeholder="Compra (Buy)" type="number" step="0.01" value={mpForm.buy || ''} onChange={(e) => setMpForm({...mpForm, buy: Number(e.target.value)})} style={{ ...inputStyle, flex: 1 }} required />
                            <input placeholder="Venta (Sell)" type="number" step="0.01" value={mpForm.sell || ''} onChange={(e) => setMpForm({...mpForm, sell: Number(e.target.value)})} style={{ ...inputStyle, flex: 1 }} required />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input placeholder="Cambio (ej. +1.2%)" value={mpForm.change} onChange={(e) => setMpForm({...mpForm, change: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                            <input placeholder="P/E Ratio" value={mpForm.per} onChange={(e) => setMpForm({...mpForm, per: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                            <select value={mpForm.isPositive ? 'true' : 'false'} onChange={(e) => setMpForm({...mpForm, isPositive: e.target.value === 'true', chartColor: e.target.value === 'true' ? '#4ade80' : '#ef4444'})} style={{ ...inputStyle, flex: 1 }}>
                                <option value="true">↑ Positivo</option>
                                <option value="false">↓ Negativo</option>
                            </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={mpForm.active} onChange={(e) => setMpForm({...mpForm, active: e.target.checked})} />
                            Activo (visible para usuarios)
                        </label>
                        <button type="submit" className="btn" style={{ marginTop: '10px', background: '#4ade80', color: 'black' }}>
                            <Save size={18} style={{ marginRight: '5px' }}/> Guardar Activo
                        </button>
                    </form>
                </div>
            )}

            {/* ===== MARKET DATA TAB ===== */}
            {activeTab === 'market' && (
                <div className="card">
                    <h2><Activity size={20} style={{ display: 'inline' }}/> Datos Económicos</h2>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Estos datos se mostrarán en la pantalla pública de Data.</p>
                    <form onSubmit={handleMarketDataSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Inflación (CPI)</span>
                                <input value={marketData.inflation} onChange={(e) => setMarketData({...marketData, inflation: e.target.value})} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Desempleo</span>
                                <input value={marketData.unemployment} onChange={(e) => setMarketData({...marketData, unemployment: e.target.value})} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Tasa de Interés (Fed)</span>
                                <input value={marketData.interestRate} onChange={(e) => setMarketData({...marketData, interestRate: e.target.value})} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
                            </label>
                            <label>
                                <span style={{ fontSize: '0.8rem' }}>Crecimiento GDP</span>
                                <input value={marketData.gdp} onChange={(e) => setMarketData({...marketData, gdp: e.target.value})} style={{ ...inputStyle, width: '100%', marginTop: '5px' }} />
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
