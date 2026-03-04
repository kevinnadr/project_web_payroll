import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Search, Download, FileText, Upload, Settings, CalendarDays, Banknote, XCircle, ClipboardList, AlertTriangle, X, FolderOpen } from 'lucide-react';
import Sidebar from '../components/sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import '../App.css';

const Absensi = () => {
    const [user, setUser] = useState(null);
    const [listAbsensi, setListAbsensi] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));
    const { toast, showToast, hideToast } = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Selection State for Bulk Delete
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);


    const fileInputRef = useRef(null);
    const monthInputRef = useRef(null);
    const navigate = useNavigate();
    const [zoomImage, setZoomImage] = useState(null);

    // State Modal
    const [showModal, setShowModal] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [editData, setEditData] = useState({
        pegawai_id: '', nik: '', nama_lengkap: '',
        hadir: 0, sakit: 0, izin: 0, cuti: 0, hari_terlambat: 0, menit_terlambat: 0, jam_lembur: 0, hari_efektif: 25
    });

    // Settings State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settings, setSettings] = useState({
        denda_telat_harian: 5000,
        denda_telat_per_blok: 20000,
        menit_per_blok: 15,
        pembagi_lembur: 173,
        tarif_lembur_per_jam: 20000
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
        }
    }, [navigate]);

    useEffect(() => {
        fetchData();
        fetchSettings();
    }, [bulanFilter]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/absensi/read_settings.php');
            if (res.data.status === 'success') {
                setSettings(res.data.data);
            }
        } catch (e) {
            console.error("Error fetching settings:", e);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/absensi/save_settings.php', settings);
            if (res.data.status === 'success') {
                showToast('success', "Pengaturan berhasil disimpan!");
                setShowSettingsModal(false);
            } else {
                showToast('error', "Gagal: " + res.data.message);
            }
        } catch (e) {
            showToast('error', "Error saving settings");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/absensi/read.php?bulan=${bulanFilter}`);
            setListAbsensi(res.data.data);
            setFilteredList(res.data.data);
        } catch (e) { console.error("Fetch Error:", e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listAbsensi.filter(item =>
            (item.nama_lengkap?.toLowerCase().includes(lower)) || (item.nik?.includes(lower))
        ));
        setCurrentPage(1); // Reset to page 1 on filter
        setSelectedIds([]); // Clear selection on search filter change
    }, [searchTerm, listAbsensi]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);

    // --- LOGIKA PERHITUNGAN DENDA TELAT ---
    const calculateLatePenalty = (hari_telat, menit_telat) => {
        const x = parseInt(hari_telat || 0);
        const m = parseInt(menit_telat || 0);
        const dendaHarian = parseInt(settings.denda_telat_harian || 5000);
        const menitBlok = parseInt(settings.menit_per_blok || 15);
        const dendaBlok = parseInt(settings.denda_telat_per_blok || 20000);

        if (x <= 0 && m <= 0) return 0;

        // Rumus: (Hari Telat * Denda Harian) + (Ceil(Menit Telat / Menit Blok) * Denda Blok)
        // Note: Hari Telat di sini biasanya adalah 'jumlah hari terlambat'.
        // Jika menit telat berdiri sendiri, hitung bloknya.

        let total = (x * dendaHarian);
        if (m > 0) {
            total += Math.ceil(m / menitBlok) * dendaBlok;
        }
        return total;
    };

    // --- EXPORT & TEMPLATE ---
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/absensi/download_template.php', '_blank'); // Using simple template for now

    // --- IMPORT CSV ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const text = event.target.result;

                // Bersihkan BOM + support CRLF Windows
                const rows = text
                    .replace(/^\uFEFF/, '')
                    .split(/\r?\n/)
                    .filter(r => r.trim() !== "");

                if (rows.length < 2) {
                    setErrorMessage("File kosong atau tidak memiliki data.");
                    setShowErrorModal(true);
                    return;
                }

                // Support koma & titik koma
                const header = rows[0]
                    .split(/[;,]/)
                    .map(h => h.trim().replace(/\r/g, '').toLowerCase());

                const requiredHeaders = [
                    'nik',
                    'nama_pegawai',
                    'hadir',
                    'sakit',
                    'izin',
                    'cuti',
                    'hari_terlambat',
                    'menit_terlambat',
                    'jam_lembur',
                    'hari_efektif'
                ];

                const missingHeaders = requiredHeaders.filter(h => !header.includes(h));

                if (missingHeaders.length > 0) {
                    setErrorMessage(
                        `Header tidak sesuai format! Kolom hilang: ${missingHeaders.join(", ")}`
                    );
                    setShowErrorModal(true);
                    e.target.value = null;
                    return;
                }

                const dataToImport = [];

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i]
                        .split(/[;,]/)
                        .map(c => c.trim().replace(/\r/g, ''));

                    if (cols.length < header.length) continue;

                    const obj = {};
                    header.forEach((key, index) => {
                        obj[key] = cols[index] || 0;
                    });

                    if (obj.nik) {
                        dataToImport.push(obj);
                    }
                }

                if (dataToImport.length === 0) {
                    setErrorMessage("Tidak ada data valid untuk diimport.");
                    setShowErrorModal(true);
                    return;
                }

                setLoading(true);

                await axios.post(
                    `http://localhost/project_web_payroll/backend-api/modules/absensi/import_excel.php`,
                    {
                        bulan: bulanFilter,
                        data: dataToImport

                    }
                );

                showToast('success', "Import Berhasil");
                fetchData();

            } catch (err) {
                setErrorMessage(
                    err.response?.data?.message ||
                    "Gagal Import Data. Silakan cek kembali file Anda."
                );
                setShowErrorModal(true);
            } finally {
                setLoading(false);
                e.target.value = null;
            }
        };

        reader.readAsText(file);
    };

    const handleExport = () => {
        window.open(`http://localhost/project_web_payroll/backend-api/modules/absensi/export_excel.php?bulan=${bulanFilter}`, '_blank');
    };
    const handleSaveAbsensi = async (e) => {
        e.preventDefault();

        // Validation: Total days cannot exceed effective days
        const total = parseInt(editData.hadir || 0) + parseInt(editData.sakit || 0) + parseInt(editData.izin || 0) + parseInt(editData.cuti || 0);
        const limit = parseInt(editData.hari_efektif || 0);

        if (limit > 0 && total > limit) {
            showToast('error', `Total kehadiran (${total}) tidak boleh melebihi Hari Efektif (${limit})!`);
            return;
        }

        try {
            const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/save.php`, { ...editData, bulan: bulanFilter });
            if (res.data.status === 'success') { setShowModal(false); fetchData(); showToast('success', 'Data absensi berhasil diupdate!'); }
            else { showToast('error', res.data.message); }
        } catch (e) { showToast('error', "Error saving data"); }
    };

    const handleDeleteAbsensi = (row) => {
        setDeleteTarget(row); // single object or array
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setDeleteTarget(selectedIds); // pass array of ids
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDeleteAbsensi = async () => {
        // Validation using TRIM
        if (deleteInput.trim().toLowerCase() !== 'hapus data') {
            showToast('error', 'Validasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }

        try {
            let payload = { bulan: bulanFilter };

            if (Array.isArray(deleteTarget)) {
                // Bulk delete payload
                payload.pegawai_ids = deleteTarget;
            } else {
                // Single delete payload
                payload.pegawai_id = deleteTarget.pegawai_id;
            }

            const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/delete.php`, payload);

            if (res.data.status === 'success') {
                showToast('success', Array.isArray(deleteTarget) ? 'Data absensi terpilih berhasil dihapus!' : 'Data absensi berhasil dihapus!');
                setShowDeleteModal(false);
                if (Array.isArray(deleteTarget)) setSelectedIds([]); // clear selection if bulk delete success
                fetchData();
            } else {
                showToast('error', res.data.message);
            }
        } catch (e) {
            showToast('error', "Terjadi kesalahan saat menghapus data");
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select all on current page or all filtered? Let's select all filtered.
            setSelectedIds(filteredList.map(item => item.pegawai_id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    // Helpers for UI Matching
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
                        <h1 className="modern-title">Data Absensi</h1>
                        <p className="modern-subtitle">Monitor kehadiran, sakit, izin, dan keterlambatan</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* SETTINGS BUTTON */}
                        <div
                            style={{
                                cursor: 'pointer', background: 'white', padding: '10px 15px', borderRadius: '30px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            onClick={() => setShowSettingsModal(true)}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Aturan</span>
                        </div>

                        {/* PERIOD PILL */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => {
                                try {
                                    if (monthInputRef.current && typeof monthInputRef.current.showPicker === 'function') {
                                        monthInputRef.current.showPicker();
                                    } else {
                                        monthInputRef.current?.focus();
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
                                <span>Periode: {getMonthLabel(bulanFilter)}</span>
                                <span style={{ opacity: 0.7, display: 'flex' }}><CalendarDays size={18} /></span>
                            </div>
                            <input
                                ref={monthInputRef}
                                type="month"
                                value={bulanFilter}
                                onChange={(e) => setBulanFilter(e.target.value)}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, pointerEvents: 'none', // Allow clicks to pass through to the div handler
                                    zIndex: -1 // Push behind so it doesn't interfere
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
                            placeholder="Cari Nama / NIK"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isSelectionMode ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedIds([]);
                                    }}
                                    className="btn-modern btn-outline"
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>Batal Pilih</span>
                                </button>
                                {selectedIds.length > 0 && (
                                    <button onClick={handleBulkDelete} className="btn-modern btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444', background: '#fef2f2' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Trash2 size={18} /> Hapus Terpilih ({selectedIds.length})</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={() => setIsSelectionMode(true)}
                                className="btn-modern btn-outline"
                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><ClipboardList size={18} /> Pilih Data</span>
                            </button>
                        )}
                        <button onClick={handleExport} className="btn-modern btn-outline" style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Export ({bulanFilter})</span>
                        </button>
                        <button onClick={() => setShowFormatModal(true)} className="btn-modern btn-outline">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FileText size={18} /> Format Excel</span>
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Upload size={18} /> Import Excel</span>
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={handleFileChange} />
                    </div>
                </div>

                {/* MAIN CARD */}
                <div className="table-container-modern">

                    {/* TABLE */}
                    <table className="modern-table" style={{ textAlign: 'center' }}>
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                {isSelectionMode && (
                                    <th style={{ textAlign: 'center', padding: '15px 10px', background: 'transparent', color: 'white' }}>
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                            style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                        />
                                    </th>
                                )}
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Nama Pegawai</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Hadir</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Cuti</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Sakit</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Izin</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Telat (X)</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Menit</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Lembur</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Hari Efektif</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isSelectionMode ? "11" : "10"} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan={isSelectionMode ? "11" : "10"} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Data tidak ditemukan</td></tr>
                            ) : currentItems.map((row) => (
                                <tr key={row.pegawai_id} style={{ background: selectedIds.includes(row.pegawai_id) ? '#f0fdf4' : 'transparent' }}>
                                    {isSelectionMode && (
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(row.pegawai_id)}
                                                onChange={() => handleSelectRow(row.pegawai_id)}
                                                style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                            />
                                        </td>
                                    )}
                                    <td style={{ textAlign: 'left' }}>
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

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', fontSize: '1rem' }}>{row.hadir}</td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.cuti > 0 ? '#ef4444' : '#94a3b8', fontSize: '1rem' }}>
                                        {row.cuti > 0 ? row.cuti : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.sakit > 0 ? '#ef4444' : '#94a3b8', fontSize: '1rem' }}>
                                        {row.sakit > 0 ? row.sakit : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.izin > 0 ? '#ef4444' : '#94a3b8', fontSize: '1rem' }}>
                                        {row.izin > 0 ? row.izin : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.hari_terlambat > 0 ? '#ef4444' : '#94a3b8', fontSize: '1rem' }}>
                                        {row.hari_terlambat > 0 ? row.hari_terlambat : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.menit_terlambat > 0 ? '#ef4444' : '#94a3b8', fontSize: '0.95rem' }}>
                                        {row.menit_terlambat > 0 ? `${row.menit_terlambat}m` : '0m'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.jam_lembur > 0 ? '#0ea5e9' : '#94a3b8', fontSize: '1rem' }}>
                                        {row.jam_lembur > 0 ? `${row.jam_lembur}j` : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: '1rem' }}>
                                        {row.hari_efektif}
                                    </td>

                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                className="btn-icon-modern edit" style={{ background: '#fef3c7', color: '#d97706' }}
                                                onClick={() => { setEditData({ ...row, jam_lembur: row.jam_lembur || 0, hari_efektif: row.hari_efektif || 25 }); setShowModal(true); }}
                                                title="Edit Absensi"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                className="btn-icon-modern delete"
                                                onClick={() => handleDeleteAbsensi(row)}
                                                title="Hapus (Non-aktif)"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

                {/* MODAL SETTINGS */}
                {showSettingsModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: '450px' }}>
                            <div className="modal-header-modern">
                                <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> Aturan Data Keterlambatan</span></h3>
                                <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveSettings} style={{ padding: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155' }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Banknote size={16} /> Denda Keterlambatan</span></h4>
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Denda Per Hari (Rp)</label>
                                        <input type="number" className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                            value={settings.denda_telat_harian}
                                            onChange={e => setSettings({ ...settings, denda_telat_harian: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Denda Per Blok (Rp)</label>
                                            <input type="number" className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                value={settings.denda_telat_per_blok}
                                                onChange={e => setSettings({ ...settings, denda_telat_per_blok: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Menit Per Blok</label>
                                            <input type="number" className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                value={settings.menit_per_blok}
                                                onChange={e => setSettings({ ...settings, menit_per_blok: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer-modern" style={{ marginTop: '20px' }}>
                                    <button type="submit" className="btn-save" style={{ width: '100%' }}>Simpan Aturan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL EDIT */}
                {showModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: '450px' }}>
                            <div className="modal-header-modern">
                                <h3>Update Kehadiran</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveAbsensi} style={{ padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Hadir</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.hadir} onChange={e => setEditData({ ...editData, hadir: e.target.value })} /></div>
                                    <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Cuti</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.cuti} onChange={e => setEditData({ ...editData, cuti: e.target.value })} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sakit</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.sakit} onChange={e => setEditData({ ...editData, sakit: e.target.value })} /></div>
                                    <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Izin</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.izin} onChange={e => setEditData({ ...editData, izin: e.target.value })} /></div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>Lembur (Jam)</label>
                                        <input type="number" className="form-control" style={{ border: '1px solid #bae6fd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.jam_lembur} onChange={e => setEditData({ ...editData, jam_lembur: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>Hari Efektif</label>
                                        <input type="number" className="form-control" style={{ border: '1px solid #bae6fd', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.hari_efektif} onChange={e => setEditData({ ...editData, hari_efektif: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ background: '#fffbeb', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Telat (Hari)</label><input type="number" className="form-control" style={{ border: '1px solid #fcd34d', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.hari_terlambat} onChange={e => setEditData({ ...editData, hari_terlambat: e.target.value })} /></div>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Telat (Menit)</label><input type="number" className="form-control" style={{ border: '1px solid #fcd34d', padding: '8px', borderRadius: '8px', width: '100%' }} value={editData.menit_terlambat} onChange={e => setEditData({ ...editData, menit_terlambat: e.target.value })} /></div>
                                    </div>
                                </div>

                                <div className="modal-footer-modern" style={{ marginTop: '20px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save" style={{ width: '100%' }}>Simpan Perubahan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
                }

                {/* MODAL ERROR */}
                {
                    showErrorModal && (
                        <div className="modal-backdrop">
                            <div className="modal-content-modern" style={{ width: '500px', backgroundColor: '#fff0f0', borderColor: '#fecaca' }}>
                                <div className="modal-header-modern" style={{ borderBottom: '1px solid #fee2e2' }}>
                                    <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <XCircle size={22} /> Import Gagal
                                    </h3>
                                    <button onClick={() => setShowErrorModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                                </div>
                                <div style={{ padding: '24px' }}>
                                    <p style={{ fontSize: '0.95rem', color: '#7f1d1d', lineHeight: '1.6', marginBottom: '20px' }}>
                                        {errorMessage}
                                    </p>
                                    <button
                                        onClick={() => setShowErrorModal(false)}
                                        className="btn-modern"
                                        style={{
                                            width: '100%', background: '#3b82f6', color: 'white', border: 'none',
                                            padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* MODAL FORMAT INFO */}
                {
                    showFormatModal && (
                        <div className="modal-backdrop">
                            <div className="modal-content-modern" style={{ width: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                                <div className="modal-header-modern"><h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> Format Import Data Absensi</span></h3><button onClick={() => setShowFormatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button></div>
                                <div style={{ padding: '25px' }}>
                                    <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template yang disediakan untuk hasil terbaik. Pastikan format kolom sesuai contoh berikut:</p>
                                    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>nik</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>nama_pegawai</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>hadir</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>sakit</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>izin</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>cuti</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>hari_terlambat</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>menit_terlambat</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>jam_lembur</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>hari_efektif</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b' }}>2024001</td>
                                                    <td style={{ padding: '10px', color: '#1e293b' }}>Budi Santoso</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>20</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>5</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>25</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b' }}>2024002</td>
                                                    <td style={{ padding: '10px', color: '#1e293b' }}>Siti Aminah</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>22</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>25</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="modal-footer-modern" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <button onClick={handleDownloadTemplate} className="btn-cancel" style={{ flex: 1, textAlign: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Download Template CSV</span></button>
                                        <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-save" style={{ flex: 1, textAlign: 'center' }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FolderOpen size={18} /> Langsung Import</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* MODAL HAPUS DATA ABSENSI */}
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
                                    Anda akan menghapus data absensi untuk:
                                    <strong style={{ display: 'block', color: '#0f172a', marginTop: '5px' }}>
                                        {Array.isArray(deleteTarget) ? `${deleteTarget.length} Pegawai Terpilih` : deleteTarget?.nama_lengkap}
                                    </strong>
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
                                        onClick={confirmDeleteAbsensi}
                                        className="btn-modern"
                                        style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Hapus Data
                                    </button>
                                </div>
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

export default Absensi;