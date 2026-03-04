import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { CalendarDays, Search, Download, FileText, Upload, Pencil, X, ClipboardList, FolderOpen, UserCheck, AlertTriangle } from 'lucide-react';
import '../App.css';

const DataBPJS = () => {
    const [user, setUser] = useState(null);
    const [rawList, setRawList] = useState([]); // Store raw API data (with nested contracts)
    const [filteredList, setFilteredList] = useState([]); // Store display data (flattened with BPJS info)
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const { toast, showToast, hideToast } = useToast();

    // File Upload & Export State
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showImportResult, setShowImportResult] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const fileInputRef = useRef(null);
    const [zoomImage, setZoomImage] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id_pegawai: '',
        id_kontrak: '', // New field for specific contract update
        bpjs_tk: 0,
        bpjs_ks: 0,
        dasar_upah: 0
    });

    const periodInputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
            // Initial fetch is now handled by the periodFilter useEffect
        }
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/bpjs/read.php?periode=${periodFilter}`);
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            const sorted = data.sort((a, b) => (parseInt(a.nik) || 0) - (parseInt(b.nik) || 0));
            setRawList(sorted); // Using rawList as the main list now
            setFilteredList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // Refetch when period changes
    useEffect(() => {
        fetchData();
    }, [periodFilter]);

    // Search Filter
    useEffect(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const filtered = rawList.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower)
            );
            setFilteredList(filtered);
        } else {
            setFilteredList(rawList);
        }
        setCurrentPage(1); // Reset page to 1 when search or list changes
    }, [searchTerm, rawList]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);

    const openModal = (row) => {
        setFormData({
            id_pegawai: row.id_pegawai,
            periode: periodFilter,
            bpjs_tk: row.bpjs_tk || 0,
            bpjs_ks: row.bpjs_ks || 0,
            dasar_upah: row.dasar_upah || 0
        });
        setShowModal(true);
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/update.php', {
                ...formData,
                periode: periodFilter // Ensure period is sent
            });
            if (res.data.status === 'success') {
                showToast('success', `Data BPJS (${periodFilter}) Disimpan!`);
                setShowModal(false);
                fetchData();
            } else {
                showToast('error', 'Gagal: ' + res.data.message);
            }
        } catch (error) {
            showToast('error', 'Gagal simpan!');
        }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus/Reset data BPJS untuk ${nama} pada periode ${periodFilter}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/delete.php', {
                id_pegawai: id,
                periode: periodFilter
            });
            if (res.data.status === 'success') {
                showToast('success', 'Data Direset!');
                fetchData();
            } else {
                showToast('error', 'Gagal: ' + res.data.message);
            }
        } catch (e) {
            showToast('error', 'Gagal hapus');
        }
    };

    // --- IMPORT / EXPORT HANDLERS ---
    const handleExport = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/bpjs/export_excel.php?periode=${periodFilter}`, '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/bpjs/download_template.php', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            showToast('error', 'Format file tidak valid! Gunakan file .xlsx atau .xls');
            e.target.value = null; return;
        }

        if (!confirm(`Import data BPJS untuk periode ${periodFilter}? Data dengan NIK yang sama pada bulan ini akan di-update.`)) {
            e.target.value = null;
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        formDataUpload.append('periode', periodFilter);
        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/import_excel.php', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setImportResult({
                    type: 'success',
                    message: res.data.message || 'Import berhasil!',
                    detail: res.data.detail || null
                });
                setShowImportResult(true);
                fetchData();
            } else {
                setImportResult({
                    type: 'error',
                    message: res.data?.message || 'Import gagal, periksa format file.'
                });
                setShowImportResult(true);
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Gagal upload. Periksa koneksi server.';
            setImportResult({ type: 'error', message: errMsg });
            setShowImportResult(true);
        }
        finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
    };

    const getMonthLabel = (dateStr) => {
        const date = new Date(dateStr + '-01');
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Data BPJS</h1>
                        <p className="modern-subtitle">Kelola Data BPJS Ketenagakerjaan & Kesehatan</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* PERIOD PILL */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => {
                                try {
                                    if (periodInputRef.current && typeof periodInputRef.current.showPicker === 'function') {
                                        periodInputRef.current.showPicker();
                                    } else {
                                        periodInputRef.current?.focus();
                                    }
                                } catch (error) { console.error("Error opening picker:", error); }
                            }}
                        >
                            <div style={{
                                background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '30px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <span>Periode: {getMonthLabel(periodFilter)}</span>
                                <span style={{ opacity: 0.7, display: 'flex' }}><CalendarDays size={18} /></span>
                            </div>
                            <input
                                ref={periodInputRef}
                                type="month"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, pointerEvents: 'none',
                                    zIndex: -1
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={18} color="#64748b" /></span>
                        <input
                            type="text"
                            placeholder="Cari Nama / NIK..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleExport} className="btn-modern btn-outline" style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Export ({periodFilter})</span>
                        </button>
                        <button onClick={() => setShowFormatModal(true)} className="btn-modern btn-outline">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FileText size={18} /> Format Excel</span>
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient" disabled={isUploading}>
                            {isUploading ? '⏳ Uploading...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Upload size={18} /> Import Excel</span>}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Nama Pegawai</th>
                                <th style={{ background: 'transparent', color: 'white' }}>BPJS TK</th>
                                <th style={{ background: 'transparent', color: 'white' }}>BPJS KS</th>
                                <th style={{ background: 'transparent', color: 'white' }}>Dasar Upah</th>
                                <th className="text-center" style={{ background: 'transparent', color: 'white' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">⏳ Memuat...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-4" style={{ color: '#64748b' }}>Data tidak ditemukan</td></tr>
                            ) : (
                                currentItems.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td>
                                            <div className="user-profile">
                                                {row.foto_profil ? (
                                                    <img
                                                        src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`}
                                                        alt="Profile"
                                                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                                        onClick={() => setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`)}
                                                    />
                                                ) : (
                                                    <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <div className="user-name-modern">{row.nama_lengkap}</div>
                                                    <div className="user-nik-modern">{row.nik}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>{row.jabatan || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatRupiah(row.bpjs_tk)}</td>
                                        <td>{formatRupiah(row.bpjs_ks)}</td>
                                        <td>{formatRupiah(row.dasar_upah)}</td>
                                        <td className="text-center aksi-full">
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit"><Pencil size={18} /></button>
                                            {/* Delete currently just resets, maybe we should hide it or make it reset the specific contract values? 
                                                For now keeping it but usually delete is rarely used for BPJS specific fields only. 
                                            */}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                        >
                            Prev
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </main>

            {/* MODAL FORM */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '400px' }}>
                        <div className="modal-header-modern">
                            <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} /> Edit Data BPJS</span></h3>
                            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                                Mengubah data untuk periode: <strong>{periodFilter}</strong>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>BPJS Ketenagakerjaan (Rp)</label>
                                    <input type="number" name="bpjs_tk" value={formData.bpjs_tk} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>BPJS Kesehatan (Rp)</label>
                                    <input type="number" name="bpjs_ks" value={formData.bpjs_ks} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Dasar Upah (Rp)</label>
                                    <input type="number" name="dasar_upah" value={formData.dasar_upah} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="modal-footer-modern" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FORMAT IMPORT */}
            {showFormatModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="modal-header-modern"><h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> Format Import BPJS</span></h3><button onClick={() => setShowFormatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button></div>
                        <div style={{ padding: '25px' }}>
                            <p style={{ marginBottom: '15px', color: '#64748b' }}>
                                Gunakan template Excel untuk import data BPJS. Periode akan diatur ke: <strong>{periodFilter}</strong>.<br /><br />
                                <span style={{ color: 'red' }}>*</span> Data yang wajib diisi adalah <strong>NIK</strong>.
                            </p>

                            <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NIK <span style={{ color: 'red' }}>*</span></th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Nama Lengkap</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>BPJS TK</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>BPJS KS</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Dasar Upah</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>2024001</td>
                                            <td style={{ padding: '10px' }}>Alex Santoso</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>150000</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>100000</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>5000000</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Template Excel</span></button>
                                <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FolderOpen size={18} /> Upload File Sekarang</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL IMPORT RESULT */}
            {showImportResult && importResult && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '500px' }}>
                        <div className="modal-header-modern" style={{ background: importResult.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
                            <h3 style={{ color: importResult.type === 'success' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>{importResult.type === 'success' ? <UserCheck size={22} /> : <AlertTriangle size={22} />} {importResult.type === 'success' ? 'Import Selesai' : 'Import Gagal'}</h3>
                            <button onClick={() => setShowImportResult(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: importResult.type === 'success' ? '#166534' : '#991b1b' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '10px' }}>{importResult.message}</p>

                            {importResult.detail && (
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ textAlign: 'center', padding: '10px', background: '#dcfce7', borderRadius: '6px', color: '#166534' }}>
                                            <div style={{ fontSize: '0.8rem' }}>Berhasil</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{importResult.detail.berhasil}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '10px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
                                            <div style={{ fontSize: '0.8rem' }}>Gagal</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{importResult.detail.gagal}</div>
                                        </div>
                                    </div>

                                    {importResult.detail.errors && importResult.detail.errors.length > 0 && (
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem', color: '#b91c1c' }}>
                                            <strong style={{ display: 'block', marginBottom: '5px' }}>Detail Error:</strong>
                                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                {importResult.detail.errors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button onClick={() => setShowImportResult(false)} className="btn-modern btn-gradient" style={{ width: '100%' }}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}
            {zoomImage && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 9999,
                        cursor: 'zoom-out'
                    }}
                    onClick={() => setZoomImage(null)}
                >
                    <img
                        src={zoomImage}
                        alt="Zoom"
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            objectFit: 'contain'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setZoomImage(null)}
                        style={{
                            position: 'absolute', top: '20px', right: '30px', background: 'white',
                            color: '#ef4444', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                            fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />
        </div>
    );
};

export default DataBPJS;
