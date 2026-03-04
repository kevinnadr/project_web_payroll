// frontend-client/src/pages/DataPendapatanLain.jsx
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Pencil, Trash2, Search, Download, FileText, Upload, CalendarDays, Banknote, X, ClipboardList, AlertTriangle, FolderOpen, PlusCircle } from 'lucide-react';

const DataPendapatanLain = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [pendapatanList, setPendapatanList] = useState([]);
    const [masterKomponenOptions, setMasterKomponenOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [periode, setPeriode] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const navigate = useNavigate();
    const { toast, showToast, hideToast } = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showImportResult, setShowImportResult] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const fileInputRef = useRef(null);
    const periodeInputRef = useRef(null);
    const [zoomImage, setZoomImage] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        id_pegawai: '',
        items: []
    });

    const [currentItem, setCurrentItem] = useState({
        nama_pendapatan: '',
        nominal: '',
        kategori: 'PENERIMAAN'
    });

    // Deletion Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            if (!token || !userData) {
                navigate('/');
            } else {
                setUser(JSON.parse(userData));
                fetchPegawai();
                fetchMasterKomponen();
            }
        };
        checkAuth();
    }, [navigate]);

    useEffect(() => {
        fetchPendapatan(periode);
    }, [periode]);

    const fetchPegawai = async () => {
        try {
            const response = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            if (response.data.status === 'success') {
                setPegawaiList(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching pegawai:", error);
        }
    };

    const fetchMasterKomponen = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_komponen/read.php');
            if (res.data.status === 'success') {
                setMasterKomponenOptions(res.data.data);
            }
        } catch (e) {
            console.error("Error fetching master komponen:", e);
        }
    };

    const fetchPendapatan = async (p = periode) => {
        try {
            const response = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/read.php?periode=${p}`);
            if (response.data.status === 'success') {
                setPendapatanList(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching pendapatan_lain:", error);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.items.length === 0) {
                showToast('error', "Harap tambahkan minimal 1 komponen pendapatan.");
                return;
            }

            const payload = {
                id_pegawai: formData.id_pegawai,
                periode: periode,
                items: formData.items.map(item => ({
                    nama_pendapatan: item.nama_pendapatan,
                    nominal: item.nominal.toString().replace(/[^0-9]/g, ''),
                    kategori: item.kategori
                }))
            };

            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/save.php', payload);
            if (response.data.status === 'success') {
                showToast('success', 'Data pendapatan berhasil disimpan!');
                setShowModal(false);
                fetchPendapatan();
            } else {
                showToast('error', "Gagal: " + response.data.message);
            }
        } catch (error) {
            showToast('error', "Terjadi kesalahan pada server.");
        }
    };

    const handleDeleteGroup = (group) => {
        setDeleteTarget(group);
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDeleteGroup = async () => {
        if (deleteInput !== 'hapus data') {
            showToast('error', 'Konfirmasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }

        try {
            const payload = { id_pegawai: deleteTarget.id_pegawai, periode: periode, items: [] };
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/save.php', payload);
            if (response.data.status === 'success') {
                showToast('success', 'Data pendapatan berhasil dihapus!');
                setShowDeleteModal(false);
                fetchPendapatan();
            } else {
                showToast('error', "Gagal menghapus data.");
            }
        } catch (error) {
            console.error("Error deleting:", error);
            showToast('error', "Gagal menghapus data.");
        }
    };

    // --- IMPORT / EXPORT HANDLERS ---
    const handleExport = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/export_excel.php?periode=${periode}`, '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/download_template.php', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            showToast('error', 'Format file tidak valid! Gunakan file .xlsx atau .xls');
            e.target.value = null; return;
        }

        if (!window.confirm('Import data pendapatan? Data yang di-upload akan diperbarui/ditambahkan.')) {
            e.target.value = null;
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        formDataUpload.append('periode', periode);
        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pendapatan_lain/import_excel.php', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setImportResult({
                    type: 'success',
                    message: res.data.message || 'Import berhasil!',
                    detail: res.data.detail || null
                });
                setShowImportResult(true);
                fetchPendapatan();
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

    const openModal = (group = null) => {
        if (group) {
            setFormData({
                isEdit: group.items && group.items.length > 0,
                id_pegawai: group.id_pegawai,
                items: group.items ? group.items.map(i => ({
                    nama_pendapatan: i.nama_pendapatan,
                    nominal: Math.round(Number(i.nominal || 0)),
                    kategori: i.kategori
                })) : []
            });
            setCurrentItem({ nama_pendapatan: '', nominal: '', kategori: 'PENERIMAAN' });
        } else {
            setFormData({
                isEdit: false,
                id_pegawai: '',
                items: []
            });
            setCurrentItem({ nama_pendapatan: '', nominal: '', kategori: 'PENERIMAAN' });
        }
        setShowModal(true);
    };

    const handleAddItem = () => {
        if (!currentItem.nama_pendapatan.trim()) {
            showToast('error', 'Nama komponen belum diisi');
            return;
        }
        if (!currentItem.nominal.toString().trim()) {
            showToast('error', 'Nominal belum diisi');
            return;
        }

        setFormData({
            ...formData,
            items: [...formData.items, currentItem]
        });

        setCurrentItem({ nama_pendapatan: '', nominal: '', kategori: 'PENERIMAAN' });
    };

    const handleRemoveItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        if (field === 'nominal') {
            newItems[index][field] = value.replace(/[^0-9]/g, '');
        } else {
            newItems[index][field] = value;
        }
        setFormData({ ...formData, items: newItems });
    };

    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

    const groupedDataList = pegawaiList.map(pegawai => {
        const items = pendapatanList.filter(p => p.id_pegawai === pegawai.id_pegawai);
        return {
            id_pegawai: pegawai.id_pegawai,
            nik: pegawai.nik,
            nama_lengkap: pegawai.nama_lengkap,
            foto_profil: pegawai.foto_profil,
            jabatan: pegawai.contracts && pegawai.contracts.length > 0 ? pegawai.contracts[0].jabatan : '-',
            items: items
        };
    }).filter(p =>
        p.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.items.some(i => i.nama_pendapatan?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.nik?.includes(searchTerm)
    );

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 on search or data change
    }, [searchTerm, pegawaiList, pendapatanList]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = groupedDataList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(groupedDataList.length / itemsPerPage);

    const getMonthLabel = (dateStr) => {
        const date = new Date(dateStr + '-01');
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern" style={{ background: '#f3f4f6', minHeight: '100vh', padding: '30px' }}>
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Pendapatan Lain</h1>
                        <p className="modern-subtitle">Kelola data pendapatan tambahan selain gaji pokok</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* PERIOD PILL */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => {
                                try {
                                    if (periodeInputRef?.current && typeof periodeInputRef.current.showPicker === 'function') {
                                        periodeInputRef.current.showPicker();
                                    } else {
                                        periodeInputRef?.current?.focus();
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }}
                        >
                            <div style={{
                                background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '30px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <span>Periode: {getMonthLabel(periode)}</span>
                                <span style={{ opacity: 0.7, display: 'flex' }}><CalendarDays size={18} /></span>
                            </div>
                            <input
                                ref={periodeInputRef}
                                type="month"
                                value={periode}
                                onChange={(e) => setPeriode(e.target.value)}
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
                            placeholder="Cari Pegawai / Pendapatan"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleExport} className="btn-modern btn-outline" style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Export ({periode})</span>
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
                    <table className="modern-table" style={{ width: '100%', textAlign: 'left' }}>
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                <th style={{ textAlign: 'left', paddingLeft: '2rem', background: 'transparent', color: 'white' }}>Nama Pegawai</th>
                                <th style={{ textAlign: 'left', background: 'transparent', color: 'white' }}>Nama Pendapatan</th>
                                <th style={{ textAlign: 'left', background: 'transparent', color: 'white' }}>Nominal</th>
                                <th style={{ textAlign: 'left', background: 'transparent', color: 'white' }}>Kategori</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((group, idx) => (
                                <tr key={group.id_pegawai}>
                                    <td style={{ verticalAlign: 'top', textAlign: 'left', paddingLeft: '2rem' }}>
                                        <div className="user-profile">
                                            {group.foto_profil ? (
                                                <img
                                                    src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${group.foto_profil}`}
                                                    alt="Profile"
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                                    onClick={() => setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${group.foto_profil}`)}
                                                />
                                            ) : (
                                                <div className="avatar-circle">{group.nama_lengkap.charAt(0)}</div>
                                            )}
                                            <div>
                                                <div className="user-name-modern">{group.nama_lengkap}</div>
                                                <div className="user-nik-modern">{group.nik}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                                                    {group.jabatan}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 0, verticalAlign: 'top' }}>
                                        {group.items.map((item, i) => (
                                            <div key={i} style={{ padding: '12px 16px', borderBottom: i < group.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                {item.nama_pendapatan}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ padding: 0, verticalAlign: 'top' }}>
                                        {group.items.map((item, i) => (
                                            <div key={i} style={{ padding: '12px 16px', borderBottom: i < group.items.length - 1 ? '1px solid #e2e8f0' : 'none', color: '#16a34a', fontWeight: 'bold' }}>
                                                {formatRupiah(item.nominal)}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ padding: 0, verticalAlign: 'top', textAlign: 'left' }}>
                                        {group.items.map((item, i) => (
                                            <div key={i} style={{ padding: '12px 16px', borderBottom: i < group.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                {item.kategori}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            {group.items && group.items.length > 0 ? (
                                                <>
                                                    <button onClick={() => openModal(group)} title="Edit" className="btn-icon-modern edit" style={{ background: '#fef3c7', color: '#d97706' }}><Pencil size={18} /></button>
                                                    <button onClick={() => handleDeleteGroup(group)} title="Hapus" className="btn-icon-modern delete" style={{ background: '#fee2e2', color: '#ef4444' }}><Trash2 size={18} /></button>
                                                </>
                                            ) : (
                                                <button onClick={() => openModal(group)} className="btn-modern btn-gradient" style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><PlusCircle size={16} /> Tambah Pendapatan</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Belum ada data pendapatan lain ditemukan.</td>
                                </tr>
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

                {/* Modal Form */}
                {
                    showModal && (
                        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div className="modal-content-modern" style={{ background: 'white', borderRadius: '16px', width: '700px', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                <div className="modal-header-modern" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f9fafb' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{formData.isEdit ? 'Edit' : 'Tambah'} Pendapatan Lain</h3>
                                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                                </div>
                                <form onSubmit={handleFormSubmit}>
                                    <div style={{ padding: '24px' }}>
                                        <div className="form-group" style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pegawai</label>
                                            <select
                                                value={formData.id_pegawai}
                                                onChange={(e) => setFormData({ ...formData, id_pegawai: e.target.value })}
                                                required
                                                disabled
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', background: '#e2e8f0', cursor: 'not-allowed' }}
                                            >
                                                <option value="">-- Pilih Pegawai --</option>
                                                {pegawaiList.map(p => (
                                                    <option key={p.id_pegawai} value={p.id_pegawai}>{p.nik} - {p.nama_lengkap}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Banknote size={16} /> Komponen Tambahan (Di luar Gaji Pokok & Tunjangan Tetap)</span>
                                            </h4>

                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Nama Komponen</label>
                                                    <select
                                                        value={currentItem.nama_pendapatan}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, nama_pendapatan: e.target.value })}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white' }}
                                                    >
                                                        <option value="">-- Pilih Komponen --</option>
                                                        {masterKomponenOptions.map((mk) => (
                                                            <option key={mk.id} value={mk.nama_komponen}>{mk.nama_komponen}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1.5 }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Nominal (Rp)</label>
                                                    <input
                                                        type="text"
                                                        value={currentItem.nominal}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, nominal: e.target.value.replace(/[^0-9]/g, '') })}
                                                        placeholder="0"
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1.5 }}>
                                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>Tipe</label>
                                                    <select
                                                        value={currentItem.kategori}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, kategori: e.target.value })}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                                                    >
                                                        <option value="PENERIMAAN">Penerimaan (+)</option>
                                                        <option value="POTONGAN">Potongan (-)</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddItem}
                                                    style={{ padding: '8px 16px', borderRadius: '6px', background: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', height: '35px' }}
                                                >
                                                    Add
                                                </button>
                                            </div>

                                            <div style={{ maxHeight: '25vh', overflowY: 'auto' }}>
                                                {formData.items.length === 0 ? (
                                                    <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', margin: '15px 0' }}>Belum ada komponen tambahan.</p>
                                                ) : (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                        <tbody>
                                                            {formData.items.map((item, index) => (
                                                                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                    <td style={{ padding: '8px 0', color: '#334155', fontWeight: 500 }}>{item.nama_pendapatan}</td>
                                                                    <td style={{ padding: '8px 0', color: '#16a34a', fontWeight: 600 }}>{formatRupiah(item.nominal)}</td>
                                                                    <td style={{ padding: '8px 0', color: '#64748b' }}>
                                                                        <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{item.kategori}</span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                                                        <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                    <div className="modal-footer-modern" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #e2e8f0', gap: '10px' }}>
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-modern btn-outline" style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600, background: 'transparent', border: '1px solid #d1d5db', cursor: 'pointer' }}>Batal</button>
                                        <button type="submit" className="btn-modern" style={{ padding: '10px 18px', borderRadius: '8px', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', cursor: 'pointer' }}>Simpan</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* MODAL FORMAT IMPORT */}
                {showFormatModal && (
                    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                        <div className="modal-content-modern" style={{ width: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div className="modal-header-modern"><h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> Format Import Pendapatan Lain</span></h3><button onClick={() => setShowFormatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button></div>
                            <div style={{ padding: '25px' }}>
                                <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template Excel untuk import data. Berikut adalah aturan khususnya:</p>

                                <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NIK <span style={{ color: 'red' }}>*</span></th>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Nama Lengkap</th>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Nama Pendapatan <span style={{ color: 'red' }}>*</span></th>
                                                <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Nominal <span style={{ color: 'red' }}>*</span></th>
                                                <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>Kategori <span style={{ color: 'red' }}>*</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>2024001</td>
                                                <td style={{ padding: '10px', color: '#64748b' }}>Kevin Adrian</td>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>Bonus Kinerja</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>5000000</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>Non Alpha</td>
                                            </tr>
                                            <tr>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>2024001</td>
                                                <td style={{ padding: '10px', color: '#64748b' }}>Kevin Adrian</td>
                                                <td style={{ padding: '10px', fontWeight: 'bold' }}>THR</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a' }}>8000000</td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>Tetap</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e', marginBottom: '20px' }}>
                                    <strong>Sistem Update "Upsert":</strong><br />
                                    • Jika nama pendapatan belum ada, sistem akan <strong>menambahkannya</strong>.<br />
                                    • Jika nama pendapatan sudah ada, sistem akan <strong>memperbarui/menimpa</strong> nominal tersebut.<br />
                                    • Data pendapatan lama yang kosong dari file Excel <strong>TIDAK AKAN DIHAPUS</strong>.
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Download Template Excel</span></button>
                                    <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FolderOpen size={18} /> Langsung Pilih File</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HAPUS PENDAPATAN */}
                {showDeleteModal && (
                    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                        <div className="modal-content-modern" style={{ width: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div className="modal-header-modern" style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '15px 20px' }}>
                                <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
                                    <AlertTriangle size={22} strokeWidth={2.5} /> Konfirmasi Penghapusan
                                </h3>
                                <button onClick={() => setShowDeleteModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '24px 20px' }}>
                                <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5', marginBottom: '15px' }}>
                                    Anda akan menghapus data pendapatan lain untuk:
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
                                        onClick={confirmDeleteGroup}
                                        className="btn-modern"
                                        style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Hapus Pendapatan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL IMPORT RESULT */}
                {showImportResult && importResult && (
                    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                        <div className="modal-content-modern" style={{ width: '600px' }}>
                            <div className="modal-header-modern" style={{ background: importResult.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
                                <h3 style={{ color: importResult.type === 'success' ? '#166534' : '#991b1b' }}>{importResult.type === 'success' ? '✅ Import Berhasil' : '❌ Import Gagal'}</h3>
                                <button onClick={() => setShowImportResult(false)}>✕</button>
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
                        className="modal-backdrop"
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
            </main >
        </div >
    );
};

export default DataPendapatanLain;
