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
    const [isSendingAll, setIsSendingAll] = useState(false); // New state for bulk email
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [showImportResult, setShowImportResult] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const [periodFilter, setPeriodFilter] = useState(new Date().toISOString().slice(0, 7));

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // FORM STATE
    const [formData, setFormData] = useState({
        id_pegawai: '',
        nik: '',
        nama_lengkap: '',
        email: '',
        status_ptkp: 'TK/0',
        npwp: '',
        jenis_kontrak: 'TETAP',
        jabatan: '',
        tanggal_mulai: new Date().toISOString().split('T')[0],
        tanggal_berakhir: ''
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
            const responseData = res.data.data || res.data || [];
            const list = Array.isArray(responseData) ? responseData : [];
            const sorted = [...list].sort((a, b) => (parseInt(a.nik) || 0) - (parseInt(b.nik) || 0));
            setPegawaiList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // Filter Logic: Search + Period
    // Filter Logic: Search + Period
    useEffect(() => {
        let filtered = pegawaiList;

        // 1. Filter by Period (if selected)
        if (periodFilter) {
            // Parse period string "YYYY-MM" to Local Date boundaries
            const [pYear, pMonth] = periodFilter.split('-').map(Number);
            const periodStart = new Date(pYear, pMonth - 1, 1);       // 1st of Month
            const periodEnd = new Date(pYear, pMonth, 0, 23, 59, 59); // Last of Month

            filtered = filtered.filter(item => {
                // If no contracts, show them (permanent/generic)
                if (!item.contracts || item.contracts.length === 0) return true;

                // Check if ANY contract overlaps with the period
                return item.contracts.some(contract => {
                    if (!contract.tanggal_mulai) return true; // Assume active if no start date?

                    const [sYear, sMonth, sDay] = contract.tanggal_mulai.split('-').map(Number);
                    const startDate = new Date(sYear, sMonth - 1, sDay);

                    let endDate = null;
                    if (contract.tanggal_berakhir && contract.tanggal_berakhir !== '0000-00-00') {
                        const [eYear, eMonth, eDay] = contract.tanggal_berakhir.split('-').map(Number);
                        endDate = new Date(eYear, eMonth - 1, eDay);
                    }

                    const isStarted = startDate <= periodEnd;
                    const isNotEnded = !endDate || endDate >= periodStart;
                    return isStarted && isNotEnded;
                });
            });
        }

        // 2. Filter by Search Term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower) ||
                (item.contracts && item.contracts.some(c => (c.jabatan || '').toLowerCase().includes(lower)))
            );
        }

        setFilteredList(filtered);
    }, [searchTerm, periodFilter, pegawaiList]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // --- ACTIONS DOWNLOAD & EMAIL ---
    const handlePdfAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfSlipsAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_slips_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfOne = (id) => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_one.php?id=${id}&bulan=${periodFilter}`, '_blank');

    const handleSendEmail = async (id, email) => {
        if (!email) return alert("Pegawai ini tidak memiliki email.");
        if (!confirm(`Kirim notifikasi data ke email: ${email}?`)) return;
        setSendingEmailId(id);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            if (res.data.status === 'success') alert("✅ Email Terkirim!");
            else alert("❌ Gagal: " + res.data.message);
        } catch (e) { alert("Error koneksi server."); }
        finally { setSendingEmailId(null); }
    };

    const handleSendEmailAll = async () => {
        if (!confirm("Kirim slip gaji via email ke SEMUA pegawai yang memiliki email? Proses mungkin memakan waktu.")) return;
        setIsSendingAll(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email_all.php');
            if (res.data.status === 'success') {
                alert(`✅ Proses Selesai!\n${res.data.message}`);
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (e) {
            alert("Error server: " + (e.response?.data?.message || e.message));
        } finally {
            setIsSendingAll(false);
        }
    };

    // --- IMPORT / EXPORT EXCEL ---
    const handleExport = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/export_excel.php', '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/download_template.php', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            alert('❌ Format file tidak valid! Gunakan file .xlsx atau .xls');
            e.target.value = null; return;
        }
        if (!confirm('Import data pegawai? Data NIK yang sama akan di-update.')) { e.target.value = null; return; }

        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', formDataUpload, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data && res.data.status === 'success') {
                setImportResult({ type: 'success', message: res.data.message || 'Import berhasil!', detail: res.data.detail || null });
                setShowImportResult(true);
                fetchPegawai();
            } else {
                setImportResult({ type: 'error', message: res.data?.message || 'Import gagal, periksa format file.' });
                setShowImportResult(true);
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Gagal upload. Periksa koneksi server.';
            setImportResult({ type: 'error', message: errMsg });
            setShowImportResult(true);
        }
        finally { setIsUploading(false); e.target.value = null; }
    };

    // --- CRUD ACTIONS ---
    const openModal = (row = null) => {
        if (row) {
            setIsEdit(true);
            // Get latest contract (first in array due to SQL sort)
            const latestContract = (row.contracts && row.contracts.length > 0) ? row.contracts[0] : {};
            setFormData({
                id_pegawai: row.id_pegawai,
                nik: row.nik,
                nama_lengkap: row.nama_lengkap,
                email: row.email || '',
                status_ptkp: row.status_ptkp || 'TK/0',
                npwp: row.npwp || '',
                jenis_kontrak: latestContract.jenis_kontrak || 'TETAP',
                jabatan: latestContract.jabatan || '',
                tanggal_mulai: latestContract.tanggal_mulai || '',
                tanggal_berakhir: latestContract.tanggal_berakhir || ''
                
            });
        } else {
            setIsEdit(false);
            setFormData({
                id_pegawai: '', nik: '', nama_lengkap: '', email: '', status_ptkp: 'TK/0', npwp: '',
                jenis_kontrak: 'TETAP', jabatan: '', tanggal_mulai: new Date().toISOString().split('T')[0], tanggal_berakhir: ''
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
        } catch (error) { alert("Error Server: " + (error.response?.data?.message || error.message)); }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus pegawai ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id_pegawai: id });
            if (res.data.status === 'success') { alert("✅ Dihapus"); fetchPegawai(); }
        } catch (e) { alert("Gagal hapus"); }
    };


    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div><h1 className="modern-title">Data Pegawai</h1><p className="modern-subtitle">Kelola Biodata, Kontrak, dan Gaji.</p></div>
                    <button onClick={() => openModal()} className="btn-modern btn-gradient">+ Tambah Pegawai</button>
                </div>

                <div className="toolbar-modern">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div style={{ background: 'white', padding: '0 15px', borderRadius: '10px', border: '1px solid #e2e8f0', height: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Periode:</span>
                            <input
                                type="month"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={handleSendEmailAll} className="btn-modern btn-outline" disabled={isSendingAll} title="Kirim Email ke Semua Pegawai">
                            {isSendingAll ? '⏳ Sending...' : '📧 Email All'}
                        </button>
                        <button onClick={handlePdfSlipsAll} className="btn-modern btn-outline" title="Download Semua Slip Gaji (per Halaman)">📄 Slip All</button>
                        <button onClick={handlePdfAll} className="btn-modern btn-outline" title="Download Rekap Data Pegawai (Tabel)">📄 Data All</button>
                        <button onClick={handleExport} className="btn-modern btn-outline">📥 Excel</button>
                        <button onClick={() => setShowFormatModal(true)} className="btn-modern btn-outline" title="Lihat Format Import">📋 Format</button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient" disabled={isUploading}>{isUploading ? '⏳...' : '📂 Import'}</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr><th>Pegawai</th><th>Email</th><th>NPWP</th><th>Status</th><th>Masa Kontrak</th><th className="text-center">Aksi</th></tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="text-center p-4">⏳ Memuat...</td></tr> :
                                filteredList.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td><div className="user-profile"><div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div><div><div className="user-name-modern">{row.nama_lengkap}</div><div className="user-nik-modern">{row.nik}</div></div></div></td>
                                        <td style={{ fontSize: '0.9rem' }}>{row.email || '-'}</td>
                                        <td style={{ fontWeight: '600', fontSize: '0.85rem' }}>{row.npwp || '-'}</td>

                                        {/* STATUS KONTRAK COLUMN - Stacked */}
                                        <td style={{ verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {row.contracts && row.contracts.length > 0 ? (
                                                    row.contracts.map((k, idx) => (
                                                        <span key={idx} className={`badge-status ${k.jenis_kontrak === 'PKWTT' || k.jenis_kontrak === 'TETAP' ? 'tetap' : 'kontrak'}`}>
                                                            {k.jenis_kontrak}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Belum ada kontrak</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* MASA KONTRAK COLUMN - Stacked */}
                                        <td style={{ verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {row.contracts && row.contracts.length > 0 ? (
                                                    row.contracts.map((k, idx) => (
                                                        <div key={idx} style={{
                                                            borderBottom: idx < row.contracts.length - 1 ? '1px dashed #e2e8f0' : 'none',
                                                            paddingBottom: idx < row.contracts.length - 1 ? '4px' : '0'
                                                        }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                                                                {(() => {
                                                                    if (!k.tanggal_mulai || !k.tanggal_berakhir) return <span style={{ color: '#64748b' }}>Seumur Hidup / Seterusnya</span>;
                                                                    const start = new Date(k.tanggal_mulai);
                                                                    const end = new Date(k.tanggal_berakhir);
                                                                    let years = end.getFullYear() - start.getFullYear();
                                                                    let months = end.getMonth() - start.getMonth();
                                                                    if (end.getDate() < start.getDate()) months--;
                                                                    if (months < 0) { years--; months += 12; }
                                                                    const parts = [];
                                                                    if (years > 0) parts.push(`${years} Tahun`);
                                                                    if (months > 0) parts.push(`${months} Bulan`);
                                                                    return parts.length > 0 ? parts.join(' ') : 'Kurang dari 1 Bulan';
                                                                })()}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                                {k.tanggal_mulai} s/d {k.tanggal_berakhir || '...'}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>-</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="text-center aksi-full">
                                            <button onClick={() => handlePdfOne(row.id_pegawai)} className="btn-icon-modern pdf" title="Download Slip Gaji PDF">📄</button>
                                            <button
                                                onClick={() => handleSendEmail(row.id_pegawai, row.email)}
                                                className="btn-icon-modern email"
                                                title="Kirim Email Notifikasi"
                                                disabled={sendingEmailId === row.id_pegawai}
                                            >
                                                {sendingEmailId === row.id_pegawai ? '⏳' : '📧'}
                                            </button>
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit">✏️</button>
                                            <button onClick={() => handleDelete(row.id_pegawai, row.nama_lengkap)} className="btn-icon-modern delete">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL FORM PEGAWAI */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '800px' }}>
                        <div className="modal-header-modern"><h3>{isEdit ? '✏️ Edit Pegawai' : '➕ Tambah Pegawai'}</h3><button onClick={() => setShowModal(false)}>✕</button></div>
                        <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <form onSubmit={handleSave}>
                                <div className="form-grid-2">
                                    <div className="form-group"><label>NIK <span style={{ color: '#ef4444' }}>*</span></label><input type="text" name="nik" value={formData.nik} onChange={handleChange} required placeholder="Contoh: 2024001" /></div>
                                    <div className="form-group"><label>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label><input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required placeholder="Nama Lengkap Pegawai" /></div>
                                    <div className="form-group"><label>Email (Opsional)</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@perusahaan.com" /></div>
                                    <div className="form-group"><label>NPWP (Opsional)</label><input type="text" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="Contoh: 12.345.678.9-012.000" /></div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginTop: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>ℹ️</span>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Informasi Tambahan</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                                            Pengaturan <strong>Jabatan, Status PTKP, Kontrak, dan Gaji</strong> dapat dikelola secara detail melalui menu <strong style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => { setShowModal(false); navigate('/kontrak-pegawai'); }}>Kontrak Kerja</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="modal-footer-modern" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">Simpan Data Pegawai</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FORMAT IMPORT - Omitted for brevity, kept same logic */}
            {showFormatModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="modal-header-modern"><h3>📋 Format Import Data Pegawai</h3><button onClick={() => setShowFormatModal(false)}>✕</button></div>
                        <div style={{ padding: '25px' }}>
                            <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template yang disediakan untuk hasil terbaik. Pastikan format kolom sesuai contoh berikut:</p>
                            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#475569' }}>NIK</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#475569' }}>Nama Lengkap</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#475569' }}>Email</th>
                                            <th style={{ padding: '8px', textAlign: 'left', color: '#475569' }}>NPWP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px', fontWeight: '600' }}>2024001</td>
                                            <td style={{ padding: '8px' }}>Kevin Adrian</td>
                                            <td style={{ padding: '8px', color: '#64748b' }}>kevin@email.com</td>
                                            <td style={{ padding: '8px', color: '#64748b' }}>12.345.678.9-012.000</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', fontWeight: '600' }}>2024002</td>
                                            <td style={{ padding: '8px' }}>Budi Santoso</td>
                                            <td style={{ padding: '8px', color: '#64748b' }}>budi@email.com</td>
                                            <td style={{ padding: '8px', color: '#64748b' }}>-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}>📥 Download Template Excel</button>
                                <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}>📂 Langsung Import</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HASIL IMPORT - Omitted for brevity */}
            {showImportResult && importResult && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '600px' }}>
                        <div className="modal-header-modern" style={{ background: importResult.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
                            <h3 style={{ color: importResult.type === 'success' ? '#166534' : '#991b1b' }}>{importResult.type === 'success' ? '✅ Import Berhasil' : '❌ Import Gagal'}</h3>
                            <button onClick={() => setShowImportResult(false)}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p>{importResult.message}</p>
                            <button onClick={() => setShowImportResult(false)} className="btn-modern btn-gradient" style={{ width: '100%', marginTop: 20 }}>OK</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default DataPegawai;