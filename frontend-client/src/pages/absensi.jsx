// frontend-client/src/pages/Absensi.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Absensi = () => {
    // --- STATE MANAGEMENT ---
    const [pegawai, setPegawai] = useState([]);
    const [bulan, setBulan] = useState("2026-02"); // Default bulan
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [fileMessage, setFileMessage] = useState(""); 

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // --- 1. CEK LOGIN ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (!token) {
            navigate('/');
        } else {
            setUser(JSON.parse(userData));
        }
    }, [navigate]);

    // --- 2. FETCH DATA (SETIAP BULAN BERUBAH) ---
    useEffect(() => {
        fetchDataAbsensi();
    }, [bulan]);

    // FUNGSI UTAMA: Mengambil data gabungan Pegawai + Absensi
    const fetchDataAbsensi = async () => {
        try {
            // Panggil API baru 'get_absensi.php'
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/pegawai/get_absensi.php?bulan=${bulan}`);
            
            if (res.data.status === 'success') {
                // Pastikan format angka integer agar tidak error di input field
                const fixedData = res.data.data.map(p => ({
                    ...p,
                    hadir: parseInt(p.hadir),
                    sakit: parseInt(p.sakit),
                    izin: parseInt(p.izin),
                    alpha: parseInt(p.alpha)
                }));
                setPegawai(fixedData);
            }
        } catch (err) {
            console.error("Gagal ambil data absensi:", err);
        }
    };

    // --- 3. HANDLE INPUT MANUAL ---
    const handleChange = (index, field, value) => {
        const newPegawai = [...pegawai];
        newPegawai[index][field] = value;
        setPegawai(newPegawai);
    };

    // --- 4. SIMPAN PERUBAHAN KE DATABASE ---
    const handleSimpanSemua = async () => {
        setLoading(true);
        try {
            // Loop simpan satu per satu
            for (let p of pegawai) {
                await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/input_absensi.php', {
                    pegawai_id: p.id,
                    bulan: bulan,
                    hadir: p.hadir,
                    sakit: p.sakit,
                    izin: p.izin,
                    alpha: p.alpha
                });
            }
            alert(`✅ Absensi Periode ${bulan} Berhasil Disimpan!`);
        } catch (error) {
            alert("❌ Gagal menyimpan data.");
        } finally {
            setLoading(false);
        }
    };

    // --- 5. EXPORT & IMPORT EXCEL ---
    const handleDownloadTemplate = () => {
        // Download via browser window
        window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_absensi.php?bulan=${bulan}`, '_blank');
    };

    const handleImportClick = () => {
        fileInputRef.current.click(); // Trigger input file tersembunyi
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file_excel', file);
        formData.append('bulan', bulan);

        setLoading(true);
        setFileMessage("⏳ Uploading...");

        try {
            const res = await axios.post('http://localhost/latihan_m2/backend-api/modules/pegawai/import_absensi.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.status === 'success') {
                alert("✅ " + res.data.message);
                fetchDataAbsensi(); // REFRESH DATA SETELAH IMPORT (PENTING!)
            }
        } catch (error) {
            console.error(error);
            alert("❌ Gagal Import: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
            setFileMessage("");
            e.target.value = null; // Reset input file
        }
    };

    // --- 6. LOGOUT ---
    const handleLogout = () => {
        if(window.confirm("Yakin mau logout?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };

    // --- RENDER UI ---
    return (
        <div className="app-layout">
            
            {/* --- SIDEBAR KIRI --- */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">WEB <span>PAYROLL</span></div>
                </div>
                
                <nav className="sidebar-menu">
                    <button className="menu-item" onClick={() => navigate('/dashboard')}>
                        <span>📊</span> <span>Dashboard Overview</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/master-gaji')}>
                        <span>⚙️</span> <span>Atur Komponen Gaji</span>
                    </button>
                    <button className="menu-item active">
                        <span>📅</span> <span>Input Absensi</span>
                    </button>
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
                
                <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'end'}}>
                    <div>
                        <h1 className="page-title">Input Absensi</h1>
                        <p className="page-subtitle">Kelola kehadiran via Web atau Import Excel.</p>
                    </div>
                    <div>
                        <label style={{display:'block', fontSize:'0.85rem', fontWeight:'600', marginBottom:'5px', color:'#64748b'}}>Periode Gaji</label>
                        <input 
                            type="month" 
                            value={bulan} 
                            onChange={(e) => setBulan(e.target.value)}
                            style={{padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', cursor:'pointer', fontWeight:'600', color:'#334155'}}
                        />
                    </div>
                </div>

                {/* AREA IMPORT/EXPORT */}
                <div className="card" style={{padding:'20px', display:'flex', gap:'20px', alignItems:'center', background:'#f8fafc', border:'1px dashed #cbd5e1'}}>
                    <div style={{flex:1}}>
                        <h4 style={{margin:'0 0 5px 0', color:'#334155'}}>📂 Import / Export Excel</h4>
                        <p style={{margin:0, fontSize:'0.9rem', color:'#64748b'}}>
                            {fileMessage ? <span style={{color:'#2563eb', fontWeight:'bold'}}>{fileMessage}</span> : "Download template, isi data, lalu upload kembali."}
                        </p>
                    </div>
                    
                    <button onClick={handleDownloadTemplate} className="btn" style={{background:'white', border:'1px solid #cbd5e1', color:'#334155'}}>
                        ⬇️ Download Template
                    </button>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        style={{display:'none'}} 
                        accept=".xlsx, .xls" 
                    />
                    <button onClick={handleImportClick} className="btn btn-primary" disabled={loading}>
                        {loading ? 'Processing...' : '⬆️ Upload Excel'}
                    </button>
                </div>

                {/* TABEL INPUT DATA */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📝 Data Kehadiran (Bulan {bulan})</span>
                    </div>
                    
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nama Pegawai</th>
                                    <th width="100">Hadir</th>
                                    <th width="100">Sakit</th>
                                    <th width="100">Izin</th>
                                    <th width="100" style={{color:'#ef4444'}}>Alpha (Mangkir)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pegawai.map((p, index) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{fontWeight:'700', color:'#0f172a'}}>{p.nama_lengkap}</div>
                                            <div style={{fontSize:'0.8rem', color:'#64748b'}}>{p.jabatan}</div>
                                        </td>
                                        <td>
                                            <input type="number" className="form-control" value={p.hadir} onChange={(e)=>handleChange(index, 'hadir', e.target.value)} style={{width:'80px', textAlign:'center'}} />
                                        </td>
                                        <td>
                                            <input type="number" className="form-control" value={p.sakit} onChange={(e)=>handleChange(index, 'sakit', e.target.value)} style={{width:'80px', textAlign:'center'}} />
                                        </td>
                                        <td>
                                            <input type="number" className="form-control" value={p.izin} onChange={(e)=>handleChange(index, 'izin', e.target.value)} style={{width:'80px', textAlign:'center'}} />
                                        </td>
                                        <td>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={p.alpha} 
                                                onChange={(e)=>handleChange(index, 'alpha', e.target.value)} 
                                                style={{
                                                    width:'80px', textAlign:'center', 
                                                    borderColor: p.alpha > 0 ? '#ef4444' : '', 
                                                    color: p.alpha > 0 ? '#ef4444' : '', 
                                                    fontWeight: p.alpha > 0 ? 'bold' : 'normal'
                                                }} 
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{padding:'20px', textAlign:'right', borderTop:'1px solid #f1f5f9'}}>
                        <button onClick={handleSimpanSemua} className="btn btn-primary" disabled={loading} style={{padding:'12px 24px', fontSize:'1rem'}}>
                            {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Absensi;