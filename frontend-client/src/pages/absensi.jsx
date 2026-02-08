import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css';

const Absensi = () => {
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [absensiList, setAbsensiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]); // Untuk Search
    const [searchTerm, setSearchTerm] = useState('');
    
    // Default Bulan: Format YYYY-MM
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7)); 
    
    const [isUploading, setIsUploading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // STATE MODAL
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '', 
        pegawai_id: '', 
        nama_lengkap: '', 
        bulan: '',
        hadir: 0, 
        sakit: 0, 
        izin: 0, 
        cuti: 0, 
        terlambat: 0, 
        menit_terlambat: 0
    });

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // --- 1. LOAD USER & DATA ---
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchAbsensi();
        }
    }, [navigate, bulanFilter]);

    // Filter Search Frontend
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredList(absensiList);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = absensiList.filter(item => 
                item.nama_lengkap.toLowerCase().includes(lowerTerm) || 
                item.nik.includes(lowerTerm)
            );
            setFilteredList(filtered);
        }
    }, [searchTerm, absensiList]);

    const fetchAbsensi = async () => {
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/absensi/read.php?bulan=${bulanFilter}`);
            if (res.data.status === 'success') {
                setAbsensiList(res.data.data);
                setFilteredList(res.data.data);
            } else {
                setAbsensiList([]);
                setFilteredList([]);
            }
        } catch (e) { console.error("Gagal load absensi:", e); }
    };

    // --- 2. IMPORT EXCEL ---
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file_excel', file);
        data.append('bulan', bulanFilter);

        setIsUploading(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/absensi/import_excel.php', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.status === 'success') {
                alert("✅ " + res.data.message);
                fetchAbsensi();
            } else {
                alert("⚠️ " + res.data.message);
            }
        } catch (error) { alert("❌ Gagal Import"); } 
        finally { setIsUploading(false); e.target.value = null; }
    };

    // --- 3. ACTIONS ---
    const openModal = (row) => {
        setFormData({
            id: row.id || '', 
            pegawai_id: row.pegawai_id,
            nama_lengkap: row.nama_lengkap,
            bulan: bulanFilter,
            hadir: row.hadir || 0, 
            sakit: row.sakit || 0, 
            izin: row.izin || 0,
            cuti: row.cuti || 0, 
            terlambat: row.terlambat || 0, 
            menit_terlambat: row.menit_terlambat || 0
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/absensi/save.php', formData);
            if(res.data.status === 'success'){
                setShowModal(false);
                fetchAbsensi();
            } else { alert("❌ Gagal: " + res.data.message); }
        } catch (err) { alert("Error Server"); }
    };

    const handleDelete = async (id) => {
        if(!confirm("Yakin ingin mereset data absensi pegawai ini menjadi 0?")) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/absensi/delete.php', { id });
            if(res.data.status === 'success') fetchAbsensi();
        } catch (err) { alert("Error Server"); }
    };

    // Helper: Warna Badge
    const getBadgeClass = (val, type) => {
        if (val > 0) return type === 'good' ? 'val-good' : 'val-bad';
        return 'val-zero';
    };

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                
                {/* HEADER SECTION */}
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Data Absensi</h1>
                        <p className="modern-subtitle">Monitor kehadiran, sakit, izin, dan keterlambatan.</p>
                    </div>
                    <div className="header-actions">
                        <div className="date-picker-container">
                            <span className="label-periode">Periode:</span>
                            <input type="month" className="modern-input-date" 
                                value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* TOOLBAR & SEARCH */}
                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Cari Nama / NIK..." 
                            value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <div className="toolbar-buttons">
                        <button onClick={() => setShowInfo(!showInfo)} className="btn-modern btn-outline">
                            ℹ️ Format Excel
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} style={{display:'none'}} accept=".xlsx, .xls" />
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient" disabled={isUploading}>
                            {isUploading ? '⏳ Uploading...' : '📂 Import Excel'}
                        </button>
                    </div>
                </div>

                {/* INFO PANEL */}
                {showInfo && (
                    <div className="info-panel-modern">
                        <div className="info-header">
                            <strong>📝 Aturan Format Excel (Upload)</strong>
                            <button onClick={()=>setShowInfo(false)}>✕</button>
                        </div>
                        <div className="info-content">
                            <p>Pastikan urutan kolom: <strong>No | Nama | Masuk | Cuti | Sakit | Izin</strong></p>
                            <p className="sub-info">* Data akan masuk ke periode <strong>{bulanFilter}</strong>.</p>
                        </div>
                    </div>
                )}

                {/* MODERN TABLE */}
                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th width="250px">Pegawai</th>
                                <th className="text-center">Hadir</th>
                                <th className="text-center">Cuti</th>
                                <th className="text-center">Sakit</th>
                                <th className="text-center">Izin</th>
                                {/* KOLOM ALPHA BARU (Read Only) */}
                                <th className="text-center" style={{background:'#f1f5f9', color:'#64748b'}}>Alpha (🔒)</th>
                                <th className="text-center">Telat (x)</th>
                                <th className="text-center">Menit</th>
                                <th className="text-center" width="100px">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredList.length > 0 ? filteredList.map((row) => (
                                <tr key={row.pegawai_id}>
                                    <td>
                                        <div className="user-profile">
                                            <div className="avatar-circle">
                                                {row.nama_lengkap.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="user-name">{row.nama_lengkap}</div>
                                                <div className="user-nik">{row.nik}</div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="text-center">
                                        <span className={`val-pill ${getBadgeClass(row.hadir, 'good')}`}>{row.hadir}</span>
                                    </td>
                                    <td className="text-center">
                                        <span className={row.cuti > 0 ? 'text-orange font-bold' : 'text-mute'}>{row.cuti}</span>
                                    </td>
                                    <td className="text-center">
                                        <span className={row.sakit > 0 ? 'text-red font-bold' : 'text-mute'}>{row.sakit}</span>
                                    </td>
                                    <td className="text-center">
                                        <span className={row.izin > 0 ? 'text-purple font-bold' : 'text-mute'}>{row.izin}</span>
                                    </td>
                                    
                                    {/* ALPHA (READ ONLY) */}
                                    <td className="text-center" style={{background:'#f8fafc'}}>
                                        <span className={row.jumlah_alpha > 0 ? 'val-pill val-bad' : 'text-mute'} title="Dihitung Otomatis">
                                            {row.jumlah_alpha || 0}
                                        </span>
                                    </td>

                                    <td className="text-center">
                                        <span className={row.terlambat > 0 ? 'val-pill val-bad' : 'text-mute'}>{row.terlambat}</span>
                                    </td>
                                    <td className="text-center">
                                        <span className={row.menit_terlambat > 0 ? 'text-red font-bold' : 'text-mute'}>
                                            {row.menit_terlambat}m
                                        </span>
                                    </td>
                                    
                                    <td className="text-center">
                                        <div className="action-buttons">
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit">✏️</button>
                                            {row.id && (
                                                <button onClick={() => handleDelete(row.id)} className="btn-icon-modern delete" title="Reset">🗑️</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="9" className="empty-state">Data tidak ditemukan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL MODERN */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern">
                        <div className="modal-header-modern">
                            <h3>Edit Absensi</h3>
                            <button onClick={()=>setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-user-info">
                            <span>👤 {formData.nama_lengkap}</span>
                            <span>📅 {formData.bulan}</span>
                        </div>
                        
                        {/* ALERT INFO ALPHA */}
                        <div style={{padding:'0 20px 10px 20px', color:'#64748b', fontSize:'0.85rem'}}>
                            <small>ℹ️ <strong>Alpha</strong> akan dihitung otomatis oleh sistem setelah disimpan.</small>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Hadir</label>
                                    <input type="number" value={formData.hadir} onChange={e=>setFormData({...formData, hadir:e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Cuti</label>
                                    <input type="number" value={formData.cuti} onChange={e=>setFormData({...formData, cuti:e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Sakit</label>
                                    <input type="number" value={formData.sakit} onChange={e=>setFormData({...formData, sakit:e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Izin</label>
                                    <input type="number" value={formData.izin} onChange={e=>setFormData({...formData, izin:e.target.value})} />
                                </div>
                                <div className="form-group full-width">
                                    <label>Keterlambatan</label>
                                    <div className="input-split">
                                        <div>
                                            <span>Kali</span>
                                            <input type="number" value={formData.terlambat} onChange={e=>setFormData({...formData, terlambat:e.target.value})} />
                                        </div>
                                        <div>
                                            <span>Menit</span>
                                            <input type="number" value={formData.menit_terlambat} onChange={e=>setFormData({...formData, menit_terlambat:e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer-modern">
                                <button type="button" onClick={()=>setShowModal(false)} className="btn-cancel">Batal</button>
                                <button type="submit" className="btn-save">Simpan Perubahan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS STYLES */}
            <style>{`
                /* --- HEADER & LAYOUT --- */
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; letter-spacing: -0.5px; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                
                .date-picker-container { background: white; padding: 5px 10px 5px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
                .label-periode { font-weight: 600; color: #475569; font-size: 0.9rem; }
                .modern-input-date { border: none; font-family: inherit; color: #0f172a; font-weight: 600; cursor: pointer; outline: none; }

                /* --- TOOLBAR --- */
                .toolbar-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 15px; flex-wrap: wrap; }
                .search-box { display: flex; align-items: center; background: white; padding: 0 15px; border-radius: 10px; border: 1px solid #e2e8f0; width: 300px; height: 45px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); transition: 0.2s; }
                .search-box:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .search-box input { border: none; outline: none; width: 100%; margin-left: 10px; font-size: 0.95rem; color: #334155; }
                .search-icon { opacity: 0.5; }

                .toolbar-buttons { display: flex; gap: 10px; }
                .btn-modern { padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.2s; border: none; display: flex; align-items: center; gap: 8px; }
                .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
                .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
                .btn-gradient { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
                .btn-gradient:hover { transform: translateY(-1px); box-shadow: 0 6px 15px rgba(59, 130, 246, 0.4); }

                /* --- INFO PANEL --- */
                .info-panel-modern { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px; margin-bottom: 20px; animation: fadeIn 0.3s; }
                .info-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #1e40af; }
                .info-header button { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #1e40af; opacity: 0.7; }
                .info-content p { margin: 0; color: #334155; font-size: 0.9rem; }
                .sub-info { font-size: 0.85rem; color: #64748b; margin-top: 5px !important; }

                /* --- TABLE --- */
                .table-container-modern { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #f1f5f9; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
                .modern-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.95rem; transition: background 0.1s; }
                .modern-table tr:hover td { background: #f8fafc; }
                .text-center { text-align: center !important; }

                /* --- USER PROFILE --- */
                .user-profile { display: flex; align-items: center; gap: 12px; }
                .avatar-circle { width: 38px; height: 38px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; box-shadow: 0 2px 5px rgba(99, 102, 241, 0.3); }
                .user-name { font-weight: 600; color: #0f172a; }
                .user-nik { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }

                /* --- BADGES & VALUES --- */
                .val-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; }
                .val-good { background: #dcfce7; color: #166534; }
                .val-bad { background: #fee2e2; color: #991b1b; }
                .val-zero { color: #cbd5e1; font-weight: 400; }
                
                .text-orange { color: #d97706; }
                .text-red { color: #dc2626; }
                .text-purple { color: #7c3aed; }
                .text-mute { color: #cbd5e1; font-weight: 400; }
                .font-bold { font-weight: 700; }

                /* --- ACTIONS --- */
                .action-buttons { display: flex; justify-content: center; gap: 8px; }
                .btn-icon-modern { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: 0.2s; }
                .btn-icon-modern.edit { background: #eff6ff; color: #3b82f6; }
                .btn-icon-modern.edit:hover { background: #2563eb; color: white; }
                .btn-icon-modern.delete { background: #fff1f2; color: #f43f5e; }
                .btn-icon-modern.delete:hover { background: #f43f5e; color: white; }
                
                .empty-state { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }

                /* --- MODAL --- */
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 100; }
                .modal-content-modern { background: white; width: 450px; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-header-modern { background: #f8fafc; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .modal-header-modern h3 { margin: 0; color: #0f172a; font-size: 1.1rem; }
                .modal-header-modern button { border: none; background: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; }
                .modal-user-info { padding: 15px 20px; background: #f0f9ff; color: #0369a1; font-size: 0.9rem; font-weight: 600; display: flex; justify-content: space-between; border-bottom: 1px solid #e0f2fe; }
                
                .form-grid { padding: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #64748b; margin-bottom: 5px; text-transform: uppercase; }
                .form-group input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; font-weight: 600; color: #334155; text-align: center; outline: none; transition: 0.2s; }
                .form-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .full-width { grid-column: span 2; }
                .input-split { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .input-split span { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 3px; text-align: center; }

                .modal-footer-modern { padding: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: #fcfcfc; }
                .btn-cancel { padding: 10px 20px; border-radius: 8px; border: none; background: #e2e8f0; color: #475569; font-weight: 600; cursor: pointer; }
                .btn-save { padding: 10px 20px; border-radius: 8px; border: none; background: #2563eb; color: white; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); }
                .btn-save:hover { background: #1d4ed8; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
};

export default Absensi;