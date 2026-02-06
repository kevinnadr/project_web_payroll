// frontend-client/src/pages/MasterGaji.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const MasterGaji = () => {
    // --- STATE ---
    const [komponen, setKomponen] = useState([]);
    const [nama, setNama] = useState("");
    const [jenis, setJenis] = useState("penerimaan");
    const [nominal, setNominal] = useState("");
    const [loading, setLoading] = useState(false);
    
    // State User untuk Sidebar
    const [user, setUser] = useState(null);

    const navigate = useNavigate();

    // --- LOAD DATA ---
    useEffect(() => {
        // Cek Login
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token) {
            navigate('/');
        } else {
            setUser(JSON.parse(userData));
            fetchKomponen();
        }
    }, [navigate]);

    const fetchKomponen = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master/read_komponen.php');
            setKomponen(res.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    // --- ACTIONS ---
    const handleSimpan = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost/project_web_payroll/backend-api/modules/master/create_komponen.php', {
                nama, jenis, nominal
            });
            alert("Berhasil disimpan!");
            setNama(""); setNominal(""); // Reset form
            fetchKomponen(); // Refresh tabel
        } catch (error) {
            alert("Gagal simpan");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Yakin hapus komponen ini?")) return;
        try {
            await axios.post('http://localhost/project_web_payroll/backend-api/modules/master/delete_komponen.php', { id });
            fetchKomponen();
        } catch(e) { console.error(e); }
    };

    const handleLogout = () => {
        if(window.confirm("Yakin mau logout?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };

    return (
        <div className="app-layout">
            
            {/* --- SIDEBAR KIRI (Sama seperti Dashboard) --- */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">WEB <span>PAYROLL</span></div>
                </div>
                
                <nav className="sidebar-menu">
                    <button className="menu-item" onClick={() => navigate('/dashboard')}>
                        <span>📊</span> <span>Dashboard Overview</span>
                    </button>
                    {/* Menu Aktif */}
                    <button className="menu-item active">
                        <span>⚙️</span> <span>Atur Komponen Gaji</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/absensi')}>
                        <span>📅</span> <span>Input Absensi</span>
                    </button>

                    {/* --- LOGIKA BARU: MENU MANAJEMEN USER --- */}
                    {user?.role === 'admin' && (
                        <button className="menu-item" onClick={() => navigate('/users')}>
                            <span>👥</span> <span>Manajemen User</span>
                        </button>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.nama?.charAt(0) || 'A'}</div>
                        <span style={{fontSize:'0.9rem', color:'#cbd5e1'}}>Halo, <br/><strong style={{color:'white'}}>{user?.nama}</strong></span>
                    </div>
                    <button onClick={handleLogout} className="btn btn-logout">
                        Logout Keluar
                    </button>
                </div>
            </aside>

            {/* --- KONTEN KANAN --- */}
            <main className="main-content">
                
                <div className="page-header">
                    <h1 className="page-title">Pengaturan komponen gaji</h1>
                    <p className="page-subtitle">.</p>
                </div>

                {/* Grid Layout: Kiri Form, Kanan Tabel */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start'}}>
                    
                    {/* 1. FORM TAMBAH (Kiri) */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">➕ Tambah Komponen</span>
                        </div>
                        <div style={{padding: '25px'}}>
                            <form onSubmit={handleSimpan} style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                                <div>
                                    <label style={{display:'block', marginBottom:'8px', fontWeight:'600', fontSize:'0.9rem'}}>Nama Komponen</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={nama} 
                                        onChange={e=>setNama(e.target.value)} 
                                        placeholder="Contoh: Tunjangan Makan" 
                                        style={{width:'100%', padding:'12px', border:'1px solid #e2e8f0', borderRadius:'8px'}} 
                                    />
                                </div>
                                <div>
                                    <label style={{display:'block', marginBottom:'8px', fontWeight:'600', fontSize:'0.9rem'}}>Jenis Komponen</label>
                                    <select 
                                        value={jenis} 
                                        onChange={e=>setJenis(e.target.value)} 
                                        style={{width:'100%', padding:'12px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'white'}}
                                    >
                                        <option value="penerimaan">🟢 Penerimaan (Menambah Gaji)</option>
                                        <option value="potongan">🔴 Potongan (Mengurangi Gaji)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{display:'block', marginBottom:'8px', fontWeight:'600', fontSize:'0.9rem'}}>Nominal (Rp)</label>
                                    <input 
                                        type="number" 
                                        required 
                                        value={nominal} 
                                        onChange={e=>setNominal(e.target.value)} 
                                        placeholder="0" 
                                        style={{width:'100%', padding:'12px', border:'1px solid #e2e8f0', borderRadius:'8px'}} 
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn btn-primary" style={{marginTop:'10px'}}>
                                    {loading ? 'Menyimpan...' : 'Simpan Data'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* 2. TABEL LIST (Kanan) */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">📋 Daftar Komponen Aktif</span>
                        </div>
                        <div className="table-responsive">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Nama Komponen</th>
                                        <th>Jenis</th>
                                        <th>Nominal</th>
                                        <th style={{textAlign:'right'}}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {komponen.length > 0 ? (
                                        komponen.map(k => (
                                            <tr key={k.id}>
                                                <td style={{fontWeight:'600', color:'#334155'}}>{k.nama_komponen}</td>
                                                <td>
                                                    <span style={{
                                                        padding: '6px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase',
                                                        background: k.jenis === 'penerimaan' ? '#dcfce7' : '#fee2e2',
                                                        color: k.jenis === 'penerimaan' ? '#166534' : '#991b1b',
                                                        border: k.jenis === 'penerimaan' ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                                    }}>
                                                        {k.jenis}
                                                    </span>
                                                </td>
                                                <td style={{fontWeight:'600'}}>Rp {parseInt(k.nominal).toLocaleString('id-ID')}</td>
                                                <td style={{textAlign:'right'}}>
                                                    <button 
                                                        onClick={()=>handleDelete(k.id)} 
                                                        className="btn btn-sm btn-danger"
                                                        title="Hapus Komponen"
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="empty-state">Belum ada komponen gaji.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default MasterGaji;