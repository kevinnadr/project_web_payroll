import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Pencil, Trash2, Search, Download, FileText, Upload, CalendarDays, X, ClipboardList, AlertTriangle, FolderOpen, PlusCircle, UserCheck, UserX, UserPlus, Camera, Mail, Phone, CreditCard } from 'lucide-react';
import '../App.css';

const DataPegawai = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState(location.state?.search || '');
    const [showInactive, setShowInactive] = useState(false);
    const [periodFilter, setPeriodFilter] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const periodInputRef = useRef(null);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const { toast, showToast, hideToast } = useToast();

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showImportResult, setShowImportResult] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const fileInputRef = useRef(null);

    // Form and Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id_pegawai: '',
        nik: '',
        nama_lengkap: '',
        email: '',
        no_hp: '',
        npwp: '',
        foto_profil: null
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [zoomImage, setZoomImage] = useState(null); // Data URL or path
    const fileRef = useRef(null);

    // Deletion Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');

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
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            const list = Array.isArray(res.data.data) ? res.data.data : [];
            const sorted = [...list].sort((a, b) => (parseInt(a.nik) || 0) - (parseInt(b.nik) || 0));
            setPegawaiList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        let filtered = pegawaiList;

        if (periodFilter) {
            const [pYear, pMonth] = periodFilter.split('-').map(Number);
            const periodStart = new Date(pYear, pMonth - 1, 1);
            const periodEnd = new Date(pYear, pMonth, 0, 23, 59, 59);

            filtered = filtered.filter(item => {
                if (!item.contracts || item.contracts.length === 0) {
                    return !showInactive;
                }

                const validStartDates = item.contracts
                    .map(c => c.tanggal_mulai)
                    .filter(d => d && d !== '0000-00-00')
                    .map(d => new Date(d));

                if (validStartDates.length === 0) return !showInactive;

                const overallStartDate = new Date(Math.min(...validStartDates));
                let isPermanent = false;
                let overallEndDate = null;
                const validEndDates = [];

                for (const c of item.contracts) {
                    if (!c.tanggal_berakhir || c.tanggal_berakhir === '0000-00-00') {
                        isPermanent = true;
                        break;
                    }
                    validEndDates.push(new Date(c.tanggal_berakhir));
                }

                if (!isPermanent && validEndDates.length > 0) {
                    overallEndDate = new Date(Math.max(...validEndDates));
                }

                const isStarted = overallStartDate <= periodEnd;
                const isNotEnded = isPermanent || (overallEndDate >= periodStart);

                if (showInactive) {
                    return !isPermanent && overallEndDate && overallEndDate < periodStart;
                } else {
                    return isStarted && isNotEnded;
                }
            });
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower) ||
                (item.email && item.email.toLowerCase().includes(lower))
            );
        }

        setFilteredList(filtered);
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [searchTerm, periodFilter, pegawaiList, showInactive]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, foto_profil: file }));
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const openModal = (row = null) => {
        if (row) {
            setIsEdit(true);
            setFormData({
                id_pegawai: row.id_pegawai,
                nik: row.nik,
                nama_lengkap: row.nama_lengkap,
                email: row.email || '',
                no_hp: row.no_hp || '',
                npwp: row.npwp || '',
                foto_profil: null
            });
            setPreviewImage(row.foto_profil ? `http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}` : null);
        } else {
            setIsEdit(false);
            setFormData({
                id_pegawai: '',
                nik: '',
                nama_lengkap: '',
                email: '',
                no_hp: '',
                npwp: '',
                foto_profil: null
            });
            setPreviewImage(null);
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const url = isEdit
            ? 'http://localhost/project_web_payroll/backend-api/modules/pegawai/update.php'
            : 'http://localhost/project_web_payroll/backend-api/modules/pegawai/create.php';

        const data = new FormData();
        data.append('id_pegawai', formData.id_pegawai);
        data.append('nik', formData.nik);
        data.append('nama_lengkap', formData.nama_lengkap);
        data.append('email', formData.email);
        data.append('no_hp', formData.no_hp);
        data.append('npwp', formData.npwp);
        if (formData.foto_profil) {
            data.append('foto_profil', formData.foto_profil);
        }

        try {
            const res = await axios.post(url, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.status === 'success') {
                showToast('success', '✅ Sukses menyimpan data pegawai!');
                setShowModal(false);
                fetchPegawai();
            } else {
                showToast('error', res.data.message);
            }
        } catch (error) {
            showToast('error', "Error Server: " + (error.response?.data?.message || error.message));
        }
    };

    // --- IMPORT / EXPORT HANDLERS ---
    const handleExport = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_excel.php?periode=${periodFilter}`, '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/download_template.php', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            showToast('error', 'Format file tidak valid! Gunakan file .xlsx atau .xls');
            e.target.value = null; return;
        }

        if (!confirm('Import data pegawai? Data NIK yang sama akan di-update.')) {
            e.target.value = null;
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setImportResult({
                    type: 'success',
                    message: res.data.message || 'Import berhasil!',
                    detail: res.data.detail || null
                });
                setShowImportResult(true);
                fetchPegawai();
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

    const handleDelete = (id, nama) => {
        setDeleteTarget({ id_pegawai: id, nama_lengkap: nama });
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDeletePegawai = async () => {
        if (deleteInput !== 'hapus data') {
            showToast('error', 'Validasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id_pegawai: deleteTarget.id_pegawai });
            if (res.data.status === 'success') {
                showToast('success', `Pegawai ${deleteTarget.nama_lengkap} berhasil dihapus.`);
                setShowDeleteModal(false);
                fetchPegawai();
            } else {
                showToast('error', "Gagal menghapus: " + res.data.message);
            }
        } catch (e) {
            showToast('error', "Gagal menghapus pegawai.");
        }
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
                        <h1 className="modern-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            Data Pegawai
                            {showInactive && <span style={{ fontSize: '1rem', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>Tidak Aktif</span>}
                        </h1>
                        <p className="modern-subtitle">Management Data Induk Pegawai</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button onClick={() => openModal()} className="btn-modern btn-gradient"><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><UserPlus size={18} /> Tambah Pegawai</span></button>

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
                                } catch (error) {
                                    console.error("Error opening picker:", error);
                                }
                            }}
                        >
                            <div style={{
                                background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '30px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <span>Periode Aktif: {getMonthLabel(periodFilter)}</span>
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
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                        <div className="search-box" style={{ flex: 'none', width: '300px' }}>
                            <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={18} color="#64748b" /></span>
                            <input
                                type="text"
                                placeholder="Cari Nama / NIK..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowInactive(!showInactive)}
                            className="btn-modern"
                            style={{
                                background: showInactive ? '#fef2f2' : 'white',
                                border: `1px solid ${showInactive ? '#ef4444' : '#e2e8f0'}`,
                                color: showInactive ? '#ef4444' : '#64748b',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {showInactive ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={18} /> Tampilkan Aktif</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserX size={18} /> Tampilkan Tidak Aktif</span>}
                        </button>
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
                                <th style={{ textAlign: 'left', paddingLeft: '2rem', background: 'transparent', color: 'white', width: '30%' }}>NAMA PEGAWAI</th>
                                <th style={{ textAlign: 'left', background: 'transparent', color: 'white', width: '30%' }}>KONTAK & NPWP</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white', width: '15%' }}>MULAI KERJA</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white', width: '15%' }}>BERAKHIR</th>
                                <th className="text-center" style={{ background: 'transparent', color: 'white', width: '10%' }}>AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">⏳ Memuat...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-4" style={{ color: '#64748b' }}>Tidak ada data pegawai yang ditemukan.</td></tr>
                            ) : (
                                currentItems.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td style={{ paddingLeft: '2rem' }}>
                                            <div className="user-profile" style={{ margin: 0 }}>
                                                {row.foto_profil ? (
                                                    <img
                                                        src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`}
                                                        alt="Profile"
                                                        className="avatar-circle"
                                                        style={{ objectFit: 'cover', cursor: 'pointer' }}
                                                        onClick={() => setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`)}
                                                    />
                                                ) : (
                                                    <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <div className="user-name-modern">{row.nama_lengkap}</div>
                                                    <div className="user-nik-modern">{row.nik}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {row.email || '-'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Phone size={14} /> {row.no_hp || '-'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><CreditCard size={14} /> {row.npwp || '-'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                            {row.contracts && row.contracts.length > 0 && row.contracts[row.contracts.length - 1].tanggal_mulai
                                                ? new Date(row.contracts[row.contracts.length - 1].tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                            {row.contracts && row.contracts.length > 0 && row.contracts[0].tanggal_berakhir && row.contracts[0].tanggal_berakhir !== '0000-00-00'
                                                ? new Date(row.contracts[0].tanggal_berakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </td>
                                        <td className="text-center">
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit"><Pencil size={18} /></button>
                                                {!(row.contracts && row.contracts.length > 0) && (
                                                    <button onClick={() => handleDelete(row.id_pegawai, row.nama_lengkap)} className="btn-icon-modern delete" title="Hapus"><Trash2 size={18} /></button>
                                                )}
                                            </div>
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
                    <div className="modal-content-modern" style={{ width: '500px' }}>
                        <div className="modal-header-modern">
                            <h3>{isEdit ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} /> Edit Pegawai</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={20} /> Tambah Pegawai</span>}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <form onSubmit={handleSave}>
                                <div className="form-group" style={{ marginBottom: '15px', textAlign: 'center' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {previewImage ? (
                                            <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Camera size={32} color="#94a3b8" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        accept="image/png, image/jpeg, image/jpg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current.click()}
                                        className="btn-modern btn-outline"
                                        style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                    >
                                        Ganti Foto
                                    </button>
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>NIK <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="nik" value={formData.nik} onChange={handleChange} required placeholder="Contoh: 2024001" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required placeholder="Nama Lengkap" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@contoh.com" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>No HP</label>
                                    <input type="text" name="no_hp" value={formData.no_hp} onChange={handleChange} placeholder="08123456789" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>NPWP</label>
                                    <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="00.000.000.0-000.000" />
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
                    <div className="modal-content-modern" style={{ width: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="modal-header-modern"><h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> Format Import Data Pegawai</span></h3><button onClick={() => setShowFormatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button></div>
                        <div style={{ padding: '25px' }}>
                            <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template Excel untuk import data. Berikut adalah contoh format yang benar:</p>

                            <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NIK <span style={{ color: 'red' }}>*</span></th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Nama Lengkap <span style={{ color: 'red' }}>*</span></th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Email</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>No HP</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NPWP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>2024001</td>
                                            <td style={{ padding: '10px' }}>Alex Santoso</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>alex@email.com</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>081234567890</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>12.345.678.9-001.000</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>2024002</td>
                                            <td style={{ padding: '10px' }}>Budi Pratama</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>budi@email.com</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>089876543210</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e', marginBottom: '20px' }}>
                                <strong>Catatan:</strong><br />
                                • Kolom <strong>NIK</strong> dan <strong>Nama Lengkap</strong> WAJIB diisi.<br />
                                • Kolom lain bersifat opsional.<br />
                                • Format file harus <strong>.xlsx</strong> atau <strong>.xls</strong>.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Download Template Excel</span></button>
                                <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FolderOpen size={18} /> Langsung Pilih File</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL IMPORT RESULT */}
            {showImportResult && importResult && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '600px' }}>
                        <div className="modal-header-modern" style={{ background: importResult.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
                            <h3 style={{ color: importResult.type === 'success' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>{importResult.type === 'success' ? <UserCheck size={22} /> : <AlertTriangle size={22} />} {importResult.type === 'success' ? 'Import Berhasil' : 'Import Gagal'}</h3>
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

            {/* MODAL ZOOM IMAGE */}
            {zoomImage && (
                <div className="modal-backdrop" onClick={() => setZoomImage(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <button
                            onClick={() => setZoomImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                color: '#333',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}><X size={20} /></button>
                        <img src={zoomImage} alt="Zoom Pegawai" style={{ width: '100%', height: 'auto', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}

            {/* MODAL HAPUS DATA PEGAWAI */}
            {showDeleteModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
                        <div className="modal-header-modern" style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '15px 20px' }}>
                            <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
                                <AlertTriangle size={22} strokeWidth={2.5} /> Konfirmasi Penghapusan
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '24px 20px' }}>
                            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5', marginBottom: '15px' }}>
                                Anda akan menghapus data pegawai:
                                <strong style={{ display: 'block', color: '#0f172a', marginTop: '5px' }}>{deleteTarget?.nama_lengkap}</strong>
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>
                                Ketik <strong style={{ color: '#dc2626' }}>hapus data</strong> di bawah ini untuk mengonfirmasi:
                            </p>
                            <input
                                type="text"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder="hapus data"
                                className="form-control"
                                style={{
                                    width: '100%', padding: '10px', border: '2px solid #e2e8f0',
                                    borderRadius: '8px', fontSize: '1rem', marginBottom: '20px',
                                    outlineColor: '#dc2626'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDeletePegawai}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Hapus Pegawai
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM TOAST NOTIFICATION */}
            <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />

        </div>
    );
};

export default DataPegawai;
