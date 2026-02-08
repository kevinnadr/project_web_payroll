import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css';

const DataPegawai = () => {
    const [user, setUser] = useState(null);
    const [dataPegawai, setDataPegawai] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // --- FILTER ---
    const [filterBulan, setFilterBulan] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // --- FORM (Sesuai Struktur Database Baru) ---
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id: '', 
        nik: '', 
        nama_lengkap: '', 
        jabatan: '', 
        email: '',
        tanggal_masuk: '',
        
        // Data Info Finansial
        gaji_pokok: 0,
        status_ptkp: 'TK/0',
        status_kepegawaian: 'Pegawai Tetap',
        hari_kerja_efektif: 20,
        bank_nama: '',
        bank_rekening: ''
    });

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchPegawai();
        }
    }, [navigate]);

    const fetchPegawai = async () => {
        try {
            // Pastikan endpoint ini sudah diupdate dengan JOIN ke info_finansial
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            if (res.data.status === 'success') setDataPegawai(res.data.data);
        } catch (e) { console.error(e); }
    };

    const getFilteredData = () => {
        return dataPegawai.filter(item => {
            const matchSearch = item.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) || item.nik.includes(searchQuery);
            const matchStatus = filterStatus ? item.status_kepegawaian === filterStatus : true;
            let matchBulan = true;
            if (filterBulan && item.tanggal_masuk) {
                const itemBulan = item.tanggal_masuk.substring(0, 7);
                matchBulan = itemBulan === filterBulan;
            }
            return matchSearch && matchStatus && matchBulan;
        });
    };
    const filteredData = getFilteredData();

    const hitungMasaKerja = (tglMasuk) => {
        if (!tglMasuk) return "-";
        const start = new Date(tglMasuk);
        const now = new Date();
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        if (months < 0) { years--; months += 12; }
        return years > 0 ? `${years} Thn ${months} Bln` : `${months} Bln`;
    };

    // --- HANDLERS ---
    const handleExportExcel = () => {
        const queryParams = new URLSearchParams({ bulan: filterBulan, status: filterStatus }).toString();
        window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_excel.php?${queryParams}`, '_blank');
    };
    const handlePrintPDF = (id) => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_pdf.php?id=${id}`, '_blank');
    const handlePrintAllSlip = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/export_all_slip.php', '_blank');
    
    const handleSendEmail = async (id, email, nama) => {
        if(!email) return alert("Pegawai ini tidak punya email!");
        if(!confirm(`Kirim slip ke ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            alert(res.data.status === 'success' ? "✅ Email Terkirim!" : "❌ Gagal Kirim");
        } catch (e) { alert("❌ Error Server"); }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        setIsUploading(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', formDataUpload, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.status === 'success') { alert("✅ " + res.data.message); fetchPegawai(); } 
            else { alert("⚠️ " + res.data.message); }
        } catch (error) { alert("❌ Gagal Import"); } 
        finally { setIsUploading(false); e.target.value = null; }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus ${nama}? Data gaji & finansial juga akan terhapus.`)) return;
        try {
            await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id });
            fetchPegawai();
        } catch (e) { alert("Gagal menghapus data"); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Gunakan endpoint save.php yang baru (menghandle create & update sekaligus)
        const url = 'http://localhost/project_web_payroll/backend-api/modules/pegawai/save.php';
        try {
            const res = await axios.post(url, formData);
            if(res.data.status === 'success') {
                alert("✅ " + res.data.message);
                setShowModal(false);
                fetchPegawai();
            } else {
                alert("❌ " + res.data.message);
            }
        } catch (e) { alert("❌ Gagal Simpan: " + e.message); } 
        finally { setLoading(false); }
    };

    const openModal = (data = null) => {
        if (data) { 
            setIsEdit(true); 
            setFormData({ 
                id: data.id, 
                nik: data.nik, 
                nama_lengkap: data.nama_lengkap, 
                jabatan: data.jabatan, 
                email: data.email || '', 
                tanggal_masuk: data.tanggal_masuk || '',
                
                // Ambil data finansial dari row (pastikan read.php mengembalikannya)
                gaji_pokok: data.gaji_pokok || 0,
                status_ptkp: data.status_ptkp || 'TK/0',
                status_kepegawaian: data.status_kepegawaian || 'Pegawai Tetap',
                hari_kerja_efektif: data.hari_kerja_efektif || 20,
                bank_nama: data.bank_nama || '',
                bank_rekening: data.bank_rekening || ''
            }); 
        } else { 
            setIsEdit(false); 
            setFormData({ 
                id: '', nik: '', nama_lengkap: '', jabatan: '', email: '', tanggal_masuk: '', 
                gaji_pokok: 0, status_ptkp: 'TK/0', status_kepegawaian: 'Pegawai Tetap', 
                hari_kerja_efektif: 20, bank_nama: '', bank_rekening: '' 
            }); 
        }
        setShowModal(true);
    };

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Data Pegawai & Gaji</h1>
                        <p className="page-subtitle">Kelola data diri, status finansial, dan kepegawaian.</p>
                    </div>
                </div>

                {/* --- CONTROL PANEL --- */}
                <div className="card-panel">
                    <div className="control-panel-content">
                        <div className="filter-group">
                            <div className="input-with-icon">
                                <span>🔍</span>
                                <input type="text" placeholder="Cari Nama / NIK..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <input type="month" className="form-select" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} title="Filter Bulan Masuk" />
                            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">- Status -</option>
                                <option value="Pegawai Tetap">Tetap</option>
                                <option value="Tidak Tetap">Kontrak</option>
                                <option value="Magang">Magang</option>
                            </select>
                            {(filterBulan || filterStatus || searchQuery) && (
                                <button onClick={() => {setFilterBulan(""); setFilterStatus(""); setSearchQuery("")}} className="btn-reset">Reset</button>
                            )}
                        </div>

                        <div className="action-group">
                            <button onClick={() => setShowInfo(!showInfo)} className="btn-tool" title="Petunjuk">ℹ️</button>
                            <div className="v-separator"></div>
                            <button onClick={handlePrintAllSlip} className="btn-tool btn-indigo">🖨️ Batch Slip</button>
                            <input type="file" ref={fileInputRef} onChange={handleImport} style={{display:'none'}} accept=".xlsx, .xls" />
                            <button onClick={() => fileInputRef.current.click()} className="btn-tool btn-orange" disabled={isUploading}>{isUploading ? '⏳...' : '📂 Import'}</button>
                            <button onClick={handleExportExcel} className="btn-tool btn-green">📥 Excel</button>
                        </div>
                    </div>

                    {showInfo && (
                        <div className="info-box">
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                <strong style={{color:'#1e40af'}}>📝 Format Excel Import</strong>
                                <button onClick={()=>setShowInfo(false)} style={{border:'none', background:'none', cursor:'pointer'}}>✖️</button>
                            </div>
                            <table className="example-table">
                                <thead><tr><th>NIK</th><th>Nama Lengkap</th><th>Jabatan</th><th>Status</th><th>Gaji Pokok</th><th>Email</th><th>Tgl Masuk</th></tr></thead>
                                <tbody><tr><td>2024001</td><td>Budi Santoso</td><td>IT</td><td>Pegawai Tetap</td><td>5000000</td><td>budi@mail.com</td><td>2024-01-30</td></tr></tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* --- TABLE DATA --- */}
                <div className="card-table-container">
                    <div className="card-header-clean">
                        <div>
                            <span className="card-title">📋 List Pegawai</span>
                            <div style={{fontSize:'0.85rem', color:'#64748b', marginTop:'4px'}}>Total Data: {filteredData.length} Pegawai</div>
                        </div>
                        <button onClick={() => openModal()} className="btn btn-primary">+ Tambah Data</button>
                    </div>

                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>NIK & Nama</th>
                                    <th>Jabatan</th>
                                    <th>Status</th>
                                    <th>PTKP</th>
                                    <th>Masa Kerja</th>
                                    <th className="text-center" width="180">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length > 0 ? filteredData.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <div style={{ fontWeight: 'bold', color:'#0f172a' }}>{row.nama_lengkap}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.nik}</div>
                                        </td>
                                        <td><span className="badge-gray">{row.jabatan}</span></td>
                                        <td>
                                            {row.status_kepegawaian === 'Pegawai Tetap' && <span className="badge-status-tetap">Tetap</span>}
                                            {row.status_kepegawaian === 'Tidak Tetap' && <span className="badge-status-kontrak">Kontrak</span>}
                                            {row.status_kepegawaian === 'Magang' && <span className="badge-status-magang">Magang</span>}
                                            {!row.status_kepegawaian && <span style={{color:'#cbd5e1'}}>-</span>}
                                        </td>
                                        <td>{row.status_ptkp || '-'}</td>
                                        <td><span className="badge-green">⏳ {hitungMasaKerja(row.tanggal_masuk)}</span></td>
                                        <td className="text-center">
                                            <div className="action-buttons">
                                                <button onClick={() => handlePrintPDF(row.id)} className="btn-icon btn-gray" title="Cetak Slip">🖨️</button>
                                                <button onClick={() => handleSendEmail(row.id, row.email, row.nama_lengkap)} className="btn-icon btn-sky" title="Kirim Email">📧</button>
                                                <div className="v-divider"></div>
                                                <button onClick={() => openModal(row)} className="btn-icon btn-blue" title="Edit">✏️</button>
                                                <button onClick={() => handleDelete(row.id, row.nama_lengkap)} className="btn-icon btn-red" title="Hapus">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Data tidak ditemukan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- MODAL FORM --- */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <span className="card-title">{isEdit ? '✏️ Edit Pegawai' : '➕ Pegawai Baru'}</span>
                            <button onClick={() => setShowModal(false)} className="close-btn">❌</button>
                        </div>
                        <div style={{padding:'20px'}}>
                            <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                                
                                {/* Section Identitas */}
                                <strong style={{color:'#3b82f6', borderBottom:'1px solid #e2e8f0', paddingBottom:'5px'}}>👤 Data Identitas</strong>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div><label>NIK</label><input type="text" className="form-input" required value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })} /></div>
                                    <div><label>Nama Lengkap</label><input type="text" className="form-input" required value={formData.nama_lengkap} onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })} /></div>
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div><label>Jabatan</label><input type="text" className="form-input" required value={formData.jabatan} onChange={e => setFormData({ ...formData, jabatan: e.target.value })} /></div>
                                    <div><label>Email</label><input type="email" className="form-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                                </div>
                                <div><label>Tanggal Masuk</label><input type="date" className="form-input" required value={formData.tanggal_masuk} onChange={e => setFormData({ ...formData, tanggal_masuk: e.target.value })} /></div>

                                {/* Section Finansial */}
                                <strong style={{color:'#10b981', borderBottom:'1px solid #e2e8f0', paddingBottom:'5px', marginTop:'10px'}}>💰 Data Finansial & Status</strong>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div>
                                        <label>Gaji Pokok</label>
                                        <input type="number" className="form-input" required value={formData.gaji_pokok} onChange={e => setFormData({ ...formData, gaji_pokok: e.target.value })} />
                                    </div>
                                    <div>
                                        <label>Status PTKP</label>
                                        <select className="form-input" value={formData.status_ptkp} onChange={e => setFormData({ ...formData, status_ptkp: e.target.value })}>
                                            <option value="">- Pilih -</option>
                                            <option value="TK/0">TK/0</option>
                                            <option value="TK/1">TK/1</option>
                                            <option value="TK/2">TK/2</option>
                                            <option value="TK/3">TK/3</option>
                                            <option value="K/0">K/0</option>
                                            <option value="K/1">K/1</option>
                                            <option value="K/2">K/2</option>
                                            <option value="K/3">K/3</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div>
                                        <label>Status Kepegawaian</label>
                                        <select className="form-input" value={formData.status_kepegawaian} onChange={e => setFormData({ ...formData, status_kepegawaian: e.target.value })}>
                                            <option value="Pegawai Tetap">Pegawai Tetap</option>
                                            <option value="Tidak Tetap">Tidak Tetap / Kontrak</option>
                                            <option value="Magang">Magang</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Hari Kerja Efektif</label>
                                        <input type="number" className="form-input" value={formData.hari_kerja_efektif} onChange={e => setFormData({ ...formData, hari_kerja_efektif: e.target.value })} />
                                    </div>
                                </div>

                                {/* Section Bank (Opsional) */}
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div><label>Nama Bank</label><input type="text" className="form-input" value={formData.bank_nama} onChange={e => setFormData({ ...formData, bank_nama: e.target.value })} placeholder="Contoh: BCA" /></div>
                                    <div><label>No. Rekening</label><input type="text" className="form-input" value={formData.bank_rekening} onChange={e => setFormData({ ...formData, bank_rekening: e.target.value })} /></div>
                                </div>

                                <div style={{display:'flex', gap:'10px', marginTop:'15px', justifyContent:'flex-end'}}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Batal</button>
                                    <button type="submit" className="btn btn-primary">{loading ? 'Menyimpan...' : 'Simpan Data'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* CSS SAMA SEPERTI SEBELUMNYA, TIDAK ADA PERUBAHAN SIGNIFIKAN DI STYLE */
                .card-panel { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 25px; }
                .control-panel-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
                .card-table-container { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #e2e8f0; overflow: hidden; }
                .card-header-clean { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid #f1f5f9; background: white; }
                .card-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; }
                .filter-group { display: flex; align-items: center; gap: 10px; flex: 1; }
                .action-group { display: flex; align-items: center; gap: 8px; }
                .input-with-icon { display: flex; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 10px; height: 40px; width: 250px; }
                .input-with-icon input { border: none; background: transparent; outline: none; width: 100%; margin-left: 8px; font-size: 0.9rem; }
                .form-select { height: 40px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; outline: none; background: #f8fafc; cursor: pointer; }
                .btn-tool { height: 40px; padding: 0 15px; border-radius: 6px; font-size: 0.9rem; font-weight: 500; cursor: pointer; border: 1px solid #cbd5e1; background: white; color: #475569; display: flex; align-items: center; gap: 5px; transition: 0.2s; }
                .btn-tool:hover { background: #f1f5f9; }
                .btn-indigo { color: #6366f1; border-color: #6366f1; } .btn-indigo:hover { background: #e0e7ff; }
                .btn-orange { color: #d97706; border-color: #f59e0b; } .btn-orange:hover { background: #fef3c7; }
                .btn-green { background: #10b981; color: white; border: none; } .btn-green:hover { background: #059669; }
                .btn-reset { color: #ef4444; border: none; background: none; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }
                .info-box { margin-top: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; animation: fadeIn 0.3s; }
                .example-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; background: white; }
                .example-table th { background: #dbeafe; padding: 8px; text-align: left; border-bottom: 1px solid #93c5fd; color: #1e3a8a; }
                .example-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                .badge-status-tetap { background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; fontWeight: bold; }
                .badge-status-kontrak { background: #fef9c3; color: #854d0e; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; fontWeight: bold; }
                .badge-status-magang { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; fontWeight: bold; border: 1px solid #cbd5e1; }
                .badge-gray { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: #475569; }
                .badge-green { background: #ecfdf5; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; color: #059669; border: 1px solid #a7f3d0; }
                .action-buttons { display: flex; justify-content: center; align-items: center; gap: 6px; }
                .btn-icon { width: 30px; height: 30px; border: none; border-radius: 6px; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.1s; font-size: 1rem; }
                .btn-icon:hover { transform: translateY(-2px); }
                .btn-gray { background: #475569; color: white; }
                .btn-sky { background: #0ea5e9; color: white; }
                .btn-blue { background: #3b82f6; color: white; }
                .btn-red { background: #ef4444; color: white; }
                .v-divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 5px; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
                .modal-card { width: 650px; max-width: 90%; max-height: 90vh; overflow-y: auto; background: white; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
                .modal-header { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #f1f5f9; align-items: center; }
                .close-btn { border: none; background: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
                .form-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 5px; font-size: 0.9rem; }
                .btn-secondary { background: #cbd5e1; color: #334155; padding: 10px 20px; border-radius: 6px; border:none; cursor: pointer; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default DataPegawai;