import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const DataPegawai = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState(null); // Loading state khusus email

    const [showModal, setShowModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // FORM STATE
    const [formData, setFormData] = useState({
        id: '', nik: '', nama_lengkap: '', email: '', status_ptkp: 'TK/0', npwp: '',
        jenis_kontrak: 'PKWTT', jabatan: '', tanggal_masuk: new Date().toISOString().split('T')[0], tanggal_berakhir: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchPegawai();
        }
    }, [navigate]);

    const fetchPegawai = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            const sorted = [...res.data].sort((a, b) => {
                const nikA = parseInt(a.nik) || 0;
                const nikB = parseInt(b.nik) || 0;
                return nikA - nikB;
            });
            setPegawaiList(sorted);
            setFilteredList(sorted);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (searchTerm === '') {
            setFilteredList(pegawaiList);
        } else {
            const lower = searchTerm.toLowerCase();
            const filtered = pegawaiList.filter(item => 
                item.nama_lengkap.toLowerCase().includes(lower) || item.nik.includes(lower) || item.jabatan.toLowerCase().includes(lower)
            );
            setFilteredList(filtered);
        }
    }, [searchTerm, pegawaiList]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // --- ACTIONS DOWNLOAD & EMAIL ---
    
    // 1. PDF ALL
    const handlePdfAll = () => {
        window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_all.php', '_blank');
    };

    // 2. PDF SATUAN
    const handlePdfOne = (id) => {
        window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_one.php?id=${id}`, '_blank');
    };

    // 3. SEND EMAIL
    const handleSendEmail = async (id, email) => {
        if(!email) return alert("Pegawai ini tidak memiliki email.");
        if(!confirm(`Kirim notifikasi data ke email: ${email}?`)) return;

        setSendingEmailId(id); // Set loading di baris tertentu
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            if(res.data.status === 'success') alert("✅ Email Terkirim!");
            else alert("❌ Gagal: " + res.data.message);
        } catch (e) { alert("Error koneksi server."); }
        finally { setSendingEmailId(null); }
    };

    // --- IMPORT / EXPORT EXCEL ---
    const handleExport = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/export_excel.php', '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/download_template.php', '_blank');
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!confirm('Import data pegawai? Data NIK yang sama akan di-update.')) { e.target.value = null; return; }

        const data = new FormData();
        data.append('file_excel', file);
        setIsUploading(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', data, { headers: { 'Content-Type': 'multipart/form-data' }});
            if (res.data.status === 'success') { alert("✅ " + res.data.message); fetchPegawai(); } else { alert("❌ " + res.data.message); }
        } catch (error) { alert("Gagal upload."); }
        finally { setIsUploading(false); e.target.value = null; }
    };

    // --- CRUD ACTIONS ---
    const openModal = (row = null) => {
        if (row) {
            setIsEdit(true);
            setFormData({
                id: row.id, nik: row.nik, nama_lengkap: row.nama_lengkap, email: row.email, status_ptkp: row.status_ptkp || 'TK/0', npwp: row.npwp || '',
                jenis_kontrak: row.jenis_kontrak || 'PKWTT', jabatan: row.jabatan, tanggal_masuk: row.tanggal_masuk, tanggal_berakhir: row.tanggal_berakhir || ''
            });
        } else {
            setIsEdit(false);
            setFormData({
                id: '', nik: '', nama_lengkap: '', email: '', status_ptkp: 'TK/0', npwp: '',
                jenis_kontrak: 'PKWTT', jabatan: '', tanggal_masuk: new Date().toISOString().split('T')[0], tanggal_berakhir: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const url = isEdit ? 'http://localhost/project_web_payroll/backend-api/modules/pegawai/update.php' : 'http://localhost/project_web_payroll/backend-api/modules/pegawai/create.php';
        try {
            const res = await axios.post(url, formData);
            if (res.data.status === 'success') { alert(`✅ Sukses!`); setShowModal(false); fetchPegawai(); } 
            else { alert("❌ " + res.data.message); }
        } catch (error) { alert("Error Server"); }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus pegawai ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id });
            if (res.data.status === 'success') { alert("✅ Dihapus"); fetchPegawai(); }
        } catch (e) { alert("Gagal hapus"); }
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header-modern">
                    <div><h1 className="modern-title">Data Pegawai</h1><p className="modern-subtitle">Kelola Biodata, Kontrak, dan Gaji.</p></div>
                    <button onClick={() => openModal()} className="btn-modern btn-gradient">+ Tambah Pegawai</button>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={handlePdfAll} className="btn-modern btn-outline" title="Download PDF Semua Data">📄 PDF All</button>
                        <button onClick={handleExport} className="btn-modern btn-outline">📥 Excel</button>
                        <button onClick={() => setShowFormatModal(true)} className="btn-modern btn-outline" title="Lihat Format Import">📋 Format</button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} style={{display:'none'}} accept=".xlsx, .xls" />
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient" disabled={isUploading}>{isUploading ? '⏳...' : '📂 Import'}</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr><th>Pegawai</th><th>Email</th><th>PTKP</th><th>Status</th><th className="text-center">Aksi</th></tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="5" className="text-center p-4">⏳ Memuat...</td></tr> : 
                            filteredList.map((row) => (
                                <tr key={row.id}>
                                    <td><div className="user-profile"><div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div><div><div className="user-name">{row.nama_lengkap}</div><div className="user-nik">{row.nik}</div></div></div></td>
                                    <td style={{fontSize:'0.9rem'}}>{row.email || '-'}</td>
                                    <td style={{fontWeight:'600'}}>{row.status_ptkp || '-'}</td>
                                    <td><span className={`badge-status ${row.jenis_kontrak==='PKWTT'?'tetap':'kontrak'}`}>{row.jenis_kontrak}</span></td>
                                    
                                    <td className="text-center aksi-full">
                                        <button onClick={() => handlePdfOne(row.id)} className="btn-icon-modern pdf" title="Download Biodata PDF">📄</button>
                                        <button 
                                            onClick={() => handleSendEmail(row.id, row.email)} 
                                            className="btn-icon-modern email" 
                                            title="Kirim Email Notifikasi"
                                            disabled={sendingEmailId === row.id}
                                        >
                                            {sendingEmailId === row.id ? '⏳' : '📧'}
                                        </button>
                                        <button onClick={() => openModal(row)} className="btn-icon-modern edit">✏️</button>
                                        <button onClick={() => handleDelete(row.id, row.nama_lengkap)} className="btn-icon-modern delete">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL FORM & PANDUAN (Sama seperti sebelumnya, disembunyikan agar ringkas) */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{width:'800px'}}>
                        <div className="modal-header-modern"><h3>{isEdit ? '✏️ Edit Pegawai' : '➕ Tambah Pegawai'}</h3><button onClick={()=>setShowModal(false)}>✕</button></div>
                        <div style={{padding:'20px', maxHeight:'80vh', overflowY:'auto'}}>
                            <form onSubmit={handleSave}>
                                {/* Isi Form Sama Seperti Sebelumnya */}
                                <div className="form-grid-3">
                                    <div className="form-group"><label>NIK</label><input type="text" name="nik" value={formData.nik} onChange={handleChange} required /></div>
                                    <div className="form-group span-2"><label>Nama</label><input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required /></div>
                                    <div className="form-group span-2"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
                                    <div className="form-group"><label>PTKP</label><select name="status_ptkp" value={formData.status_ptkp} onChange={handleChange}><option value="TK/0">TK/0</option><option value="K/0">K/0</option><option value="K/1">K/1</option><option value="K/2">K/2</option><option value="K/3">K/3</option></select></div>
                                </div>
                                <hr className="divider-dashed"/>
                                <div className="form-grid-2">
                                    <div className="form-group"><label>Jabatan</label><input type="text" name="jabatan" value={formData.jabatan} onChange={handleChange} /></div>
                                    <div className="form-group"><label>Status</label><select name="jenis_kontrak" value={formData.jenis_kontrak} onChange={handleChange}><option value="PKWTT">Tetap</option><option value="PKWT">Kontrak</option><option value="Magang">Magang</option></select></div>
                                    <div className="form-group"><label>Tgl Masuk</label><input type="date" name="tanggal_masuk" value={formData.tanggal_masuk} onChange={handleChange} /></div>
                                </div>
                                <div style={{background:'#eff6ff', padding:'15px', borderRadius:'8px', marginTop:'15px', borderLeft:'4px solid #3b82f6'}}>
                                    <p style={{margin:'0 0 10px 0', fontSize:'0.85rem', fontWeight:'700', color:'#3b82f6'}}>💡 Gaji & Tunjangan</p>
                                    <p style={{margin:'0', fontSize:'0.9rem', color:'#475569'}}>Gaji pokok, tunjangan, dan BPJS dikelola di menu <strong>Master Gaji</strong></p>
                                </div>
                                <div className="modal-footer-modern" style={{marginTop:'20px'}}>
                                    <button type="button" onClick={()=>setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showFormatModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{width:'750px', maxHeight:'85vh', overflowY:'auto'}}>
                        <div className="modal-header-modern"><h3>📋 Format Import Data Pegawai</h3><button onClick={()=>setShowFormatModal(false)}>✕</button></div>
                        <div style={{padding:'25px'}}>
                            <p style={{marginBottom:'20px', color:'#64748b', fontSize:'0.9rem'}}>Kolom data pegawai yang harus ada pada file Excel/CSV:</p>
                            <div style={{overflowX:'auto', maxHeight:'400px', overflowY:'auto'}}>
                                <table style={{width:'100%', borderCollapse:'collapse', marginBottom:'20px'}}>
                                    <thead>
                                        <tr style={{background:'#3b82f6', color:'white', position:'sticky', top:0}}>
                                            <th style={{padding:'10px', textAlign:'left', fontWeight:'700', fontSize:'0.8rem'}}>Kolom</th>
                                            <th style={{padding:'10px', textAlign:'left', fontWeight:'700', fontSize:'0.8rem'}}>Contoh</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            {col:'NIK', contoh:'2024001'},
                                            {col:'Nama', contoh:'John Doe'},
                                            {col:'Email', contoh:'john@example.com'},
                                            {col:'PTKP', contoh:'TK/0'},
                                            {col:'NPWP', contoh:'12345678901234567'},
                                            {col:'Jenis Kontrak', contoh:'PKWTT'},
                                            {col:'Jabatan', contoh:'Manager'},
                                            {col:'Tgl Masuk', contoh:'2024-01-15'},
                                            {col:'Tgl Berakhir', contoh:'2025-01-15'},
                                        ].map((item, idx) => (
                                            <tr key={idx} style={{borderBottom:'1px solid #f1f5f9', background: idx % 2 === 0 ? '#f8fafc' : 'white'}}>
                                                <td style={{padding:'10px', fontSize:'0.9rem', fontWeight:'500'}}>{item.col}</td>
                                                <td style={{padding:'10px', fontSize:'0.9rem', fontFamily:'monospace', background:'#f1f5f9', borderRadius:'4px'}}>{item.contoh}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{background:'#fef3c7', border:'1px solid #fcd34d', padding:'12px', borderRadius:'8px'}}>
                                <p style={{margin:'0', fontSize:'0.85rem', color:'#92400e'}}><strong>⚠️</strong> Data dengan NIK sama akan di-update. Tanggal format YYYY-MM-DD. Angka tanpa separator.</p>
                            </div>
                            <div style={{marginTop:'15px', display:'flex', gap:'10px'}}>
                                <button onClick={()=>setShowFormatModal(false)} className="btn-modern btn-gradient" style={{flex:1}}>Mengerti</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* Style Tambahan untuk Tombol PDF & Email */
                .aksi-full { display: flex; gap: 6px; justify-content: center; width: 100%; flex-wrap: nowrap; }
                .text-center { text-align: center; }
                
                /* REUSE STYLES */
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 28px; gap: 20px; }
                .modern-title { font-size: 2rem; font-weight: 800; color: #0f172a; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                .toolbar-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; gap: 15px; }
                .search-box { display: flex; align-items: center; background: white; padding: 0 15px; border-radius: 10px; border: 1px solid #e2e8f0; width: 320px; height: 44px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
                .search-box input { border: none; outline: none; width: 100%; margin-left: 10px; font-size: 0.95rem; }
                .toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
                .btn-modern { padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; border: none; color: white; transition: all 0.2s ease; }
                .btn-outline { background: white; border: 1.5px solid #cbd5e1; color: #475569; }
                .btn-outline:hover { border-color: #94a3b8; background: #f8fafc; }
                .btn-gradient { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
                .btn-gradient:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3); }
                .table-container-modern { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #f1f5f9; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { background: #3b82f6; padding: 16px 15px; text-align: left; font-weight: 700; color: white; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #2563eb; }
                .modern-table th.text-center { text-align: center; }
                .modern-table td { padding: 16px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.95rem; }
                .modern-table tbody tr { transition: background-color 0.2s ease; }
                .modern-table tbody tr:hover { background-color: #f8fafc; }
                .user-profile { display: flex; align-items: center; gap: 12px; }
                .avatar-circle { width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.95rem; }
                .user-name { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
                .user-nik { font-size: 0.75rem; color: #94a3b8; margin-top: 3px; }
                .badge-status { font-size: 0.75rem; padding: 4px 10px; border-radius: 6px; font-weight: 700; display: inline-block; text-transform: uppercase; letter-spacing: 0.3px; }
                .badge-status.tetap { background: #dcfce7; color: #166534; }
                .badge-status.kontrak { background: #fef3c7; color: #92400e; }
                .btn-icon-modern { width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .btn-icon-modern:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .btn-icon-modern:active { transform: translateY(0); }
                .btn-icon-modern.pdf { background: #fee2e2; color: #dc2626; }
                .btn-icon-modern.email { background: #e0e7ff; color: #4338ca; }
                .btn-icon-modern.edit { background: #eff6ff; color: #3b82f6; }
                .btn-icon-modern.delete { background: #fee2e2; color: #ef4444; }
                .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .span-2 { grid-column: span 2; }
                .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 5px; }
                .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; }
                .form-section-title { font-size: 0.9rem; font-weight: 700; color: #3b82f6; text-transform: uppercase; margin-bottom: 15px; }
                .divider-dashed { margin: 20px 0; border: 0; border-top: 1px dashed #e2e8f0; }
                .bpjs-wrapper { display: flex; gap: 20px; margin-top: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; }
                .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 100; }
                .modal-content-modern { background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s; }
                .modal-header-modern { background: #f8fafc; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 10px; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
};

export default DataPegawai;