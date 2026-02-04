// FILE: frontend-client/src/pages/Absensi.jsx

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Absensi = () => {
    // --- STATE MANAGEMENT ---
    const [pegawai, setPegawai] = useState([]);
    const [bulan, setBulan] = useState("2026-02"); // Default bulan (bisa disesuaikan)
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

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

    // --- 2. FETCH DATA (Jalan saat bulan berubah) ---
    useEffect(() => {
        fetchDataAbsensi();
    }, [bulan]);

    const fetchDataAbsensi = async () => {
        try {
            // Gunakan timestamp agar browser tidak menyimpan cache (data selalu fresh)
            const timestamp = new Date().getTime(); 
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/pegawai/get_absensi.php?bulan=${bulan}&t=${timestamp}`);
            
            if (res.data.status === 'success') {
                // Pastikan tipe data angka (integer) agar tidak error saat perhitungan
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

    // --- 4. FITUR BARU: ISI DEFAULT OTOMATIS ---
    const handleSetDefault = () => {
        if(window.confirm("Isi otomatis semua pegawai menjadi Hadir 20 hari? (Data yang sudah diketik akan tertimpa)")) {
            const newData = pegawai.map(p => ({
                ...p,
                hadir: 20, // Default 20 hari kerja
                sakit: 0,
                izin: 0,
                alpha: 0
            }));
            setPegawai(newData);
        }
    };

    // --- 5. SIMPAN KE DATABASE ---
    const handleSimpanSemua = async () => {
        setLoading(true);
        try {
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
            alert(`✅ Data Absensi Periode ${bulan} Berhasil Disimpan!`);
        } catch (error) {
            alert("❌ Gagal menyimpan data. Cek koneksi server.");
        } finally {
            setLoading(false);
        }
    };

    // --- 6. EXPORT & IMPORT EXCEL ---
    const handleDownloadTemplate = () => {
        window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_absensi.php?bulan=${bulan}`, '_blank');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file_excel', file);
        formData.append('bulan', bulan);

        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_absensi.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.status === 'success') {
                alert("✅ Upload Berhasil!");
                fetchDataAbsensi(); // Refresh tabel otomatis
            }
        } catch (error) {
            console.error(error);
            alert("❌ Gagal Import: " + (error.response?.data?.message || error.message));
        } finally {
            setIsUploading(false);
            e.target.value = null; // Reset input file
        }
    };

    // Helper: Membuat inisial nama (Kevin Adrian -> KA)
    const getInitials = (name) => {
        if(!name) return "U";
        return name.match(/(\b\S)?/g).join("").match(/(^\S|\S$)?/g).join("").toUpperCase();
    };

    // --- RENDER UI ---
    return (
        <div className="app-layout">
            
            {/* SIDEBAR FIXED VERSION */}
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
                    {/* Menu Aktif */}
                    <button className="menu-item active">
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
                        {/* 1. Avatar disamakan: Background Biru, 1 Huruf Saja */}
                        <div className="avatar" style={{background: '#3b82f6', color: 'white'}}>
                            {user?.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
                        </div>
                        
                        {/* 2. Teks disamakan: Ada "Halo," */}
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <span style={{fontSize:'0.9rem', color:'#cbd5e1'}}>Halo,</span>
                            <span style={{fontSize:'0.9rem', fontWeight:'bold', color:'white'}}>
                                {user?.nama || 'User'}
                            </span>
                        </div>
                    </div>
                    
                    {/* 3. Tombol Logout disamakan teksnya */}
                    <button onClick={()=>{localStorage.clear(); navigate('/');}} className="btn btn-logout">
                        Logout Keluar
                    </button>
                </div>
            </aside>

            {/* KONTEN UTAMA */}
            <main className="main-content">
                
                {/* HEADER: Judul & Selector Periode */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
                    <div>
                        <h1 className="page-title">Input Absensi</h1>
                        <p className="page-subtitle">Kelola data kehadiran pegawai per periode.</p>
                    </div>

                    {/* Selector Periode Modern */}
                    <div style={{background:'white', padding:'8px 15px', borderRadius:'12px', display:'flex', alignItems:'center', gap:'10px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                        <span style={{color:'#64748b', fontSize:'0.9rem', fontWeight:'600'}}>Periode:</span>
                        <input 
                            type="month" 
                            value={bulan} 
                            onChange={(e) => setBulan(e.target.value)}
                            style={{border:'none', outline:'none', fontWeight:'bold', color:'#334155', cursor:'pointer', fontSize:'1rem'}}
                        />
                    </div>
                </div>

                {/* CARD ACTION: IMPORT/EXPORT */}
                <div className="card" style={{padding:'20px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <div style={{width:'50px', height:'50px', background:'#eff6ff', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px'}}>
                            📂
                        </div>
                        <div>
                            <h4 style={{margin:'0 0 5px 0', color:'#1e293b'}}>Import Data Excel</h4>
                            <p style={{margin:0, fontSize:'0.85rem', color:'#64748b'}}>Upload file absensi dari mesin fingerprint atau edit manual.</p>
                        </div>
                    </div>
                    
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={handleDownloadTemplate} className="btn" style={{background:'white', border:'1px solid #cbd5e1', color:'#475569'}}>
                            ⬇️ Download Template
                        </button>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            style={{display:'none'}} 
                            accept=".xlsx, .xls" 
                        />
                        <button 
                            onClick={() => fileInputRef.current.click()} 
                            className="btn btn-primary" 
                            disabled={isUploading}
                        >
                            {isUploading ? '⏳ Uploading...' : '⬆️ Upload Excel'}
                        </button>
                    </div>
                </div>

                {/* TABEL ABSENSI */}
                <div className="card">
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th style={{paddingLeft:'30px'}}>Pegawai</th>
                                    <th className="text-center" width="100">Hadir</th>
                                    <th className="text-center" width="100">Sakit</th>
                                    <th className="text-center" width="100">Izin</th>
                                    <th className="text-center" width="100" style={{color:'#ef4444'}}>Alpha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pegawai.map((p, index) => (
                                    <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                        <td style={{padding:'15px 30px'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                                {/* Avatar Warna-Warni */}
                                                <div style={{
                                                    width:'40px', height:'40px', 
                                                    background: `hsl(${((index * 50) + 200) % 360}, 70%, 85%)`, // Warna dinamis beda tiap user
                                                    color:'#1e293b', borderRadius:'50%', 
                                                    display:'flex', alignItems:'center', justifyContent:'center', 
                                                    fontWeight:'bold', fontSize:'14px'
                                                }}>
                                                    {getInitials(p.nama_lengkap)}
                                                </div>
                                                <div>
                                                    <div style={{fontWeight:'600', color:'#334155'}}>{p.nama_lengkap}</div>
                                                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{p.jabatan}</div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Input Angka */}
                                        <td align="center">
                                            <input type="number" className="input-absen" value={p.hadir} onChange={(e)=>handleChange(index, 'hadir', e.target.value)} />
                                        </td>
                                        <td align="center">
                                            <input type="number" className="input-absen" value={p.sakit} onChange={(e)=>handleChange(index, 'sakit', e.target.value)} />
                                        </td>
                                        <td align="center">
                                            <input type="number" className="input-absen" value={p.izin} onChange={(e)=>handleChange(index, 'izin', e.target.value)} />
                                        </td>
                                        <td align="center">
                                            <input 
                                                type="number" 
                                                className="input-absen" 
                                                value={p.alpha} 
                                                onChange={(e)=>handleChange(index, 'alpha', e.target.value)} 
                                                style={{
                                                    color: p.alpha > 0 ? '#ef4444' : 'inherit',
                                                    fontWeight: p.alpha > 0 ? 'bold' : 'normal',
                                                    background: p.alpha > 0 ? '#fef2f2' : '#f8fafc',
                                                    borderColor: p.alpha > 0 ? '#fecaca' : '#e2e8f0'
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TOMBOL AKSI (ISI DEFAULT & SIMPAN) */}
                <div style={{marginTop:'20px', display:'flex', justifyContent:'flex-end', gap:'15px', paddingBottom:'40px'}}>
                     
                     {/* Tombol Isi Default */}
                     <button 
                        onClick={handleSetDefault} 
                        className="btn" 
                        style={{
                            background:'white', 
                            border:'1px solid #cbd5e1', 
                            color:'#475569',
                            padding:'12px 20px', 
                            fontSize:'0.95rem',
                            fontWeight:'600',
                            cursor:'pointer'
                        }}
                    >
                        ⚡ Isi Default (20)
                    </button>

                     {/* Tombol Simpan */}
                     <button 
                        onClick={handleSimpanSemua} 
                        className="btn btn-primary" 
                        disabled={loading}
                        style={{
                            padding:'12px 30px', 
                            fontSize:'0.95rem', 
                            boxShadow:'0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                            display:'flex', alignItems:'center', gap:'10px'
                        }}
                    >
                        {loading ? '💾 Menyimpan...' : '💾 Simpan Perubahan'}
                    </button>
                </div>

            </main>
        </div>
    );
};

export default Absensi;