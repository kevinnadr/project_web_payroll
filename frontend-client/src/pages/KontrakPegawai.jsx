import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { Pencil, Trash2, Search, X, Lock, RefreshCcw, PlusCircle, AlertTriangle, FileText, Banknote, Shield, Settings, Eye, ClipboardList } from 'lucide-react';
import '../App.css';

const KontrakPegawai = () => {
    const [listKontrak, setListKontrak] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulanFilter, setBulanFilter] = useState(''); // Default to empty to show all contracts
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Pegawai List for Dropdown
    const [pegawaiOptions, setPegawaiOptions] = useState([]);
    const [masterKomponenOptions, setMasterKomponenOptions] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState(''); // 'kontrak', 'create_kontrak', 'ptkp'
    const [selectedPegawai, setSelectedPegawai] = useState(null); // Full object row
    const [previewContract, setPreviewContract] = useState(null); // For detail preview

    // Deletion Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');

    const monthInputRef = useRef(null);
    const navigate = useNavigate();

    // --- NOTIFICATION STATE ---
    const { toast, showToast, hideToast } = useToast();

    const [zoomImage, setZoomImage] = useState(null);

    // --- FORM STATE ---
    const [formKontrak, setFormKontrak] = useState({
        id_pegawai: '',
        id_kontrak: '', // null for new
        jabatan: '',
        tanggal_mulai: '',
        tanggal_berakhir: '',
        jenis_kontrak: 'TETAP',
        status_ptkp: 'TK/0',
        gaji_pokok: 0,
        tunjangan: 0,
        komponen_tambahan: []
    });

    const [newKomponen, setNewKomponen] = useState({ nama: '', nominal: 0, tipe: 'tetap' });
    const [bpjsData, setBpjsData] = useState({ bpjs_tk: 0, bpjs_ks: 0 });
    const [formPtkp, setFormPtkp] = useState({ id_pegawai: '', id_kontrak: '', status_ptkp: 'TK/0' });

    const ptkpOptions = [
        { value: 'TK/0', label: 'TK/0 — Tidak Kawin, tanpa tanggungan (TER A)' },
        { value: 'TK/1', label: 'TK/1 — Tidak Kawin, 1 tanggungan (TER A)' },
        { value: 'TK/2', label: 'TK/2 — Tidak Kawin, 2 tanggungan (TER B)' },
        { value: 'TK/3', label: 'TK/3 — Tidak Kawin, 3 tanggungan (TER B)' },
        { value: 'K/0', label: 'K/0 — Kawin, tanpa tanggungan (TER A)' },
        { value: 'K/1', label: 'K/1 — Kawin, 1 tanggungan (TER B)' },
        { value: 'K/2', label: 'K/2 — Kawin, 2 tanggungan (TER B)' },
        { value: 'K/3', label: 'K/3 — Kawin, 3 tanggungan (TER C)' },
    ];

    // Helper format Rp
    const formatRp = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    // Helper Calculate Duration (Remaining Time)
    const calculateDuration = (start, end) => {
        if (!end || end === '0000-00-00') return <span style={{ color: '#10b981', fontWeight: 600 }}>Permanen / Tidak Terbatas</span>;

        const startDate = new Date(start);
        const endDate = new Date(end);
        const now = new Date();

        const startString = isNaN(startDate.getTime()) ? (start || '-') : startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const endString = isNaN(endDate.getTime()) ? (end || '-') : endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        // Reset hours to compare dates only
        now.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (isNaN(endDate.getTime())) return '-';

        // Check if expired
        if (endDate < now) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                        {startString} s/d {endString}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
                        (Sudah Berakhir)
                    </span>
                </div>
            );
        }

        let years = endDate.getFullYear() - now.getFullYear();
        let months = endDate.getMonth() - now.getMonth();
        let days = endDate.getDate() - now.getDate();

        if (days < 0) {
            months--;
            // Get days in previous month (relative to endDate)
            const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        let parts = [];
        if (years > 0) parts.push(`${years} Thn`);
        if (months > 0) parts.push(`${months} Bln`);
        if (days > 0) parts.push(`${days} Hari`);

        if (parts.length === 0) return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                    {startString} s/d {endString}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                    Berakhir Hari Ini
                </span>
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                    {startString} s/d {endString}
                </span>
                <span style={{ fontSize: '0.85rem', color: years < 1 && months < 2 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                    {parts.join(' ')} lagi
                </span>
            </div>
        );
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
            fetchPegawaiSimple();
            fetchMasterKomponen();
        }
    }, [navigate, bulanFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/read_kontrak.php', {
                params: { bulan: bulanFilter }
            });
            if (res.data.status === 'success') {
                setListKontrak(res.data.data);
                setFilteredList(res.data.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchPegawaiSimple = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read_simple.php');
            if (res.data.status === 'success') {
                setPegawaiOptions(res.data.data);
            }
        } catch (e) { console.error("Gagal load pegawai simple", e); }
    };

    const fetchMasterKomponen = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_komponen/read.php');
            if (res.data.status === 'success') {
                setMasterKomponenOptions(res.data.data);
            }
        } catch (e) { console.error("Gagal load master komponen", e); }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listKontrak.filter(item =>
            (item.nama_lengkap || '').toLowerCase().includes(lower) || String(item.nik || '').includes(lower)
        ));
        setCurrentPage(1); // Reset to page 1 on filter
    }, [searchTerm, listKontrak]);

    const groupedData = Object.values(filteredList.reduce((acc, item) => {
        if (!acc[item.id_pegawai]) {
            acc[item.id_pegawai] = {
                pegawai: item,
                contracts: []
            };
        }
        if (item.id_kontrak) {
            acc[item.id_pegawai].contracts.push(item);
        }
        return acc;
    }, {}));

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = groupedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(groupedData.length / itemsPerPage);

    const handleOpenModal = async (mode, pegawai = null) => {
        setModalMode(mode);
        setSelectedPegawai(pegawai);

        if (mode === 'create_kontrak') {
            // Reset for new contract
            setFormKontrak({
                id_pegawai: pegawai ? pegawai.id_pegawai : '',
                id_kontrak: '',
                jabatan: '', tanggal_mulai: new Date().toISOString().split('T')[0], tanggal_berakhir: '',
                jenis_kontrak: 'TETAP', status_ptkp: pegawai?.status_ptkp || 'TK/0', gaji_pokok: 0, tunjangan: 0, catatan: '', komponen_tambahan: []
            });
            setBpjsData({ bpjs_tk: 0, bpjs_ks: 0 }); // Reset BPJS
            setShowModal(true);

        } else if (mode === 'kontrak' && pegawai) {
            // Edit FULL contract info (Basic + Komponen + BPJS)
            let tunjanganTetap = 0;
            let loadedKomponen = [];

            if (pegawai.komponen_tambahan) {
                try {
                    const raw = typeof pegawai.komponen_tambahan === 'string' ? JSON.parse(pegawai.komponen_tambahan) : pegawai.komponen_tambahan;

                    // Extract Tunjangan Tetap
                    const t = raw.find(k => k.nama === 'Tunjangan Tetap');
                    if (t) tunjanganTetap = Number(t.nominal);

                    // Extract Other Components
                    loadedKomponen = raw.filter(k => k.nama !== 'Tunjangan Tetap');
                } catch (e) { }
            }

            setFormKontrak({
                id_pegawai: pegawai.id_pegawai,
                id_kontrak: pegawai.id_kontrak,
                jabatan: pegawai.jabatan || '',
                tanggal_mulai: pegawai.tanggal_mulai || '',
                tanggal_berakhir: pegawai.tanggal_berakhir || '',
                jenis_kontrak: pegawai.jenis_kontrak || 'TETAP',
                status_ptkp: pegawai.status_ptkp || 'TK/0',
                gaji_pokok: pegawai.gaji_pokok || 0,
                tunjangan: tunjanganTetap,
                catatan: pegawai.catatan || '',
                komponen_tambahan: loadedKomponen
            });

            setNewKomponen({ nama: '', nominal: 0, tipe: 'tetap' });

            // Fetch BPJS Data
            try {
                const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/read_bpjs.php', {
                    params: { id_pegawai: pegawai.id_pegawai }
                });
                if (res.data.status === 'success' && res.data.data) {
                    setBpjsData({
                        bpjs_tk: Number(res.data.data.bpjs_tk || 0),
                        bpjs_ks: Number(res.data.data.bpjs_ks || 0)
                    });
                } else {
                    setBpjsData({ bpjs_tk: 0, bpjs_ks: 0 });
                }
            } catch (e) {
                setBpjsData({ bpjs_tk: 0, bpjs_ks: 0 });
            }

            setShowModal(true);

        } else if (mode === 'ptkp' && pegawai) {
            setFormPtkp({
                id_pegawai: pegawai.id_pegawai,
                id_kontrak: pegawai.id_kontrak || '',
                status_ptkp: pegawai.status_ptkp || 'TK/0'
            });
            setShowModal(true);
        }
    };

    // --- KOMPONEN TAMBAHAN HANDLERS ---
    const handleAddKomponen = () => {
        if (!newKomponen.nama.trim()) { showToast('error', 'Nama komponen harus diisi!'); return; }
        if (!newKomponen.nominal || newKomponen.nominal <= 0) { showToast('error', 'Nominal harus lebih dari 0!'); return; }
        setFormKontrak(prev => ({
            ...prev,
            komponen_tambahan: [...prev.komponen_tambahan, { ...newKomponen, nominal: Number(newKomponen.nominal) }]
        }));
        setNewKomponen({ nama: '', nominal: 0, tipe: 'tetap' });
    };

    const handleRemoveKomponen = (index) => {
        setFormKontrak(prev => ({
            ...prev,
            komponen_tambahan: prev.komponen_tambahan.filter((_, i) => i !== index)
        }));
    };

    const handleSaveKontrak = async (e) => {
        e.preventDefault();
        if (!formKontrak.id_pegawai) { showToast('error', "Pilih Pegawai!"); return; }

        try {
            // 1. Save Main Contract (Basic Data + Tunjangan Tetap)
            // Note: save_kontrak.php handles Tunjangan Tetap logic internally by adding it to komponen
            const resKontrak = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_kontrak.php', formKontrak);

            if (resKontrak.data.status === 'success') {
                // FIXED: structure is res.data.data.id_kontrak
                const savedIdKontrak = resKontrak.data.data?.id_kontrak || formKontrak.id_kontrak;
                const savedIdPegawai = formKontrak.id_pegawai;

                // 2. Save Extra Komponen Tambahan
                // Need to filter OUT Tunjangan Tetap because save_kontrak handles it? 
                // Actually save_komponen.php REPLACES the komponen list for that contract.
                // So we should send ALL components including Tunjangan Tetap if we want them persisted properly 
                // OR rely on save_kontrak to have set Tunjangan Tetap, and save_komponen to ADD to it?
                // Checking functionality: save_komponen.php calls usually overwrite/update.
                // To be safe and consistent with previous logic:
                // The previous logic had split forms. "Save Kontrak" saved basic info AND "Tunjangan Tetap" (via internal logic likely).
                // "Save Komponen" saved the rest.
                // If we call save_komponen NOW, it might overwrite what save_kontrak did regarding Tunjangan Tetap if we are not careful.
                // Let's check if we can just trigger save_komponen with everything BUT Tunjangan Tetap (if save_kontrak handles it).

                // However, the cleanest way in this frontend refactor without touching backend too much:
                // Call save_komponen with ONLY the extra components. 
                // BUT wait, does save_komponen DELETE existing components?
                // If the backend save_komponen.php does "DELETE FROM komponen WHERE id_kontrak... INSERT..." then we have a problem if we don't send Tunjangan Tetap too.
                // Since I cannot see save_komponen.php content easily here, I will assume it might replace.
                // SAFE STRATEGY: Send the Combined components (Tunjangan Tetap + Extras) to `save_komponen.php`.

                // Re-construct Tunjangan Tetap object
                let allKomponen = [...formKontrak.komponen_tambahan];
                if (formKontrak.tunjangan > 0) {
                    // Check if it already exists in the list to avoid duplicate
                    if (!allKomponen.find(k => k.nama === 'Tunjangan Tetap')) {
                        allKomponen.push({
                            nama: 'Tunjangan Tetap',
                            nominal: formKontrak.tunjangan,
                            tipe: 'tetap',
                            is_permanent: 1 // Flag just in case
                        });
                    }
                }

                // Call Save Komponen
                const payloadKomponen = {
                    id_kontrak: savedIdKontrak,
                    komponen_tambahan: allKomponen
                };
                await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_komponen.php', payloadKomponen);

                // 3. Save BPJS Logic - REMOVED PER REQ
                // const payloadBpjs = {
                //     id_pegawai: savedIdPegawai,
                //     bpjs_tk: bpjsData.bpjs_tk,
                //     bpjs_ks: bpjsData.bpjs_ks
                // };
                // await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_bpjs.php', payloadBpjs);

                showToast('success', 'Data Kontrak Disimpan!');
                setShowModal(false);
                fetchData();

            } else {
                showToast('error', resKontrak.data.message);
            }
        } catch (e) {
            showToast('error', e.response?.data?.message || e.message);
        }
    };

    const handleSavePtkp = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/update_ptkp.php', formPtkp);
            if (res.data.status === 'success') {
                showToast('success', 'Status PTKP Updated!');
                setShowModal(false); fetchData();
            } else {
                showToast('error', res.data.message);
            }
        } catch (e) {
            showToast('error', e.response?.data?.message || e.message);
        }
    };

    const handleDelete = (kontrak) => {
        if (!kontrak.id_kontrak) return;
        setDeleteTarget(kontrak);
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDeleteKontrak = async () => {
        if (deleteInput !== 'hapus data') {
            showToast('error', 'Validasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/delete_kontrak.php', { id_kontrak: deleteTarget.id_kontrak });
            if (res.data.status === 'success') {
                showToast('success', 'Kontrak berhasil dihapus!');
                setShowDeleteModal(false);
                fetchData();
            } else {
                showToast('error', res.data.message);
            }
        } catch (e) {
            showToast('error', e.response?.data?.message || e.message);
        }
    };


    const calculateTotal = (c) => {
        if (!c) return { total: 0, hasDaily: false };
        let total = Number(c.gaji_pokok || 0);
        let hasDaily = false;

        if (c.komponen_tambahan) {
            try {
                const list = typeof c.komponen_tambahan === 'string' ? JSON.parse(c.komponen_tambahan) : c.komponen_tambahan;
                list.forEach(k => {
                    if (k.tipe === 'harian' || k.tipe === 'kehadiran') {
                        hasDaily = true;
                        // Use hari_kerja_efektif from backend (dynamic from absensi)
                        const days = c.hari_kerja_efektif || 22;
                        total += Number(k.nominal || 0) * days;
                    }
                    else {
                        // Assuming tetap, bulanan, non_alfa are added directly to the total estimation
                        total += Number(k.nominal || 0);
                    }
                });
            } catch (e) { }
        }
        return { total, hasDaily };
    };


    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Kontrak Kerja</h1>
                        <p className="modern-subtitle">Kelola data kontrak & komponen gaji pegawai (Multi-Kontrak Support).</p>
                    </div>
                    <div className="date-picker-container" onClick={() => {
                        try {
                            if (monthInputRef.current && typeof monthInputRef.current.showPicker === 'function') {
                                monthInputRef.current.showPicker();
                            } else {
                                monthInputRef.current?.focus();
                            }
                        } catch (error) {
                            console.error("Error opening picker:", error);
                        }
                    }} style={{ cursor: 'pointer' }}>
                        <span className="label-periode">Periode Data:</span>
                        <input type="month" className="modern-input-date"
                            ref={monthInputRef}
                            value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} />
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={18} color="#64748b" /></span>
                        <input
                            type="text"
                            placeholder="Cari Nama / NIK..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="toolbar-actions">
                        <button className="btn-modern btn-outline" onClick={fetchData}><span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><RefreshCcw size={18} /> Refresh</span></button>
                        <button className="btn-modern btn-gradient" onClick={() => handleOpenModal('create_kontrak')}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><PlusCircle size={18} /> Buat Kontrak Baru</span>
                        </button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                <th style={{ textAlign: 'center', paddingLeft: '2rem', background: 'transparent', color: 'white' }}>NAMA PEGAWAI</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>JABATAN</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>STATUS PTKP</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>JENIS KONTRAK</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>MASA KONTRAK</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>TOTAL GAJI</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>Loading Data...</td></tr>
                            ) : currentItems.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Data tidak ditemukan</td></tr>
                            ) : currentItems.map((group) => {
                                const { pegawai, contracts } = group;

                                // Handle case where no contracts exist for employee
                                const displayContracts = contracts.length > 0 ? contracts : [null];

                                return (
                                    <tr key={pegawai.id_pegawai} style={{ verticalAlign: 'top' }}>
                                        <td style={{ verticalAlign: 'middle', paddingLeft: '2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                {pegawai.foto_profil ? (
                                                    <img
                                                        src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${pegawai.foto_profil}`}
                                                        alt="Profile"
                                                        style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                                        onClick={() => setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${pegawai.foto_profil}`)}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: '45px', minWidth: '45px', height: '45px', borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                            color: 'white', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold',
                                                            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', cursor: 'pointer'
                                                        }}
                                                        onClick={() => navigate('/data-pegawai', { state: { search: pegawai.nik } })}
                                                    >
                                                        {pegawai.nama_lengkap ? pegawai.nama_lengkap.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                                    <span
                                                        onClick={() => navigate('/data-pegawai', { state: { search: pegawai.nik } })}
                                                        style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', cursor: 'pointer' }}
                                                        title="Lihat Detail Pegawai"
                                                    >
                                                        {pegawai.nama_lengkap}
                                                    </span>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{pegawai.nik}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* STACKED COLUMNS */}

                                        {/* Jabatan - Column 3 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => (
                                                <div key={idx} style={{
                                                    padding: 16,
                                                    borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {c ? (c.jabatan || '-') : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>-</span>}
                                                </div>
                                            ))}
                                        </td>

                                        {/* STATUS PTKP (Contract Level) - Column 4 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => (
                                                <div key={idx} style={{
                                                    padding: 16,
                                                    borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {c ? (
                                                        <span style={{
                                                            background: '#f1f5f9', color: '#475569',
                                                            padding: '4px 8px', borderRadius: 6,
                                                            fontSize: '0.8rem', fontWeight: 600
                                                        }}>
                                                            {c.status_ptkp || '-'}
                                                        </span>
                                                    ) : <span style={{ color: '#94a3b8' }}>-</span>}
                                                </div>
                                            ))}
                                        </td>

                                        {/* Jenis Kontrak - Column 5 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => (
                                                <div key={idx} style={{
                                                    padding: 16,
                                                    borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {c ? (
                                                        <span className={`badge-status ${c.jenis_kontrak === 'TETAP' ? 'tetap' : 'kontrak'}`}>
                                                            {c.jenis_kontrak || '-'}
                                                        </span>
                                                    ) : <span style={{ color: '#94a3b8' }}>-</span>}
                                                </div>
                                            ))}
                                        </td>

                                        {/* Masa Kontrak - Column 6 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => (
                                                <div key={idx} style={{
                                                    padding: 16,
                                                    borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    fontSize: '0.9rem', color: '#334155'
                                                }}>
                                                    {c ? calculateDuration(c.tanggal_mulai, c.tanggal_berakhir) : '-'}
                                                </div>
                                            ))}
                                        </td>

                                        {/* Gaji Pokok (Total) - Column 7 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => {
                                                const { total, hasDaily } = calculateTotal(c);
                                                return (
                                                    <div key={idx} style={{
                                                        padding: 16,
                                                        borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                        color: c ? '#10b981' : '#94a3b8',
                                                        fontWeight: c ? 600 : 400
                                                    }}>
                                                        {c ? (
                                                            <>
                                                                {formatRp(total)}
                                                                {hasDaily && <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: 5, fontStyle: 'italic' }}>(Est.)</span>}
                                                            </>
                                                        ) : '-'}
                                                    </div>
                                                );
                                            })}
                                        </td>

                                        {/* Aksi - Column 8 */}
                                        <td style={{ padding: 0 }}>
                                            {displayContracts.map((c, idx) => {
                                                let isExpired = false;
                                                if (c && c.tanggal_berakhir && c.tanggal_berakhir !== '0000-00-00') {
                                                    const endD = new Date(c.tanggal_berakhir);
                                                    const nowD = new Date();
                                                    endD.setHours(0, 0, 0, 0);
                                                    nowD.setHours(0, 0, 0, 0);
                                                    if (!isNaN(endD.getTime()) && endD < nowD) {
                                                        isExpired = true;
                                                    }
                                                }

                                                return (
                                                    <div key={idx} style={{
                                                        padding: 16,
                                                        borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                        display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {c ? (
                                                            isExpired ? (
                                                                <button className="btn-icon-modern edit" title="Preview Rincian Gaji" onClick={() => setPreviewContract(c)}><Eye size={18} /></button>
                                                            ) : (
                                                                <>
                                                                    <button className="btn-icon-modern edit" title="Preview Rincian Gaji" onClick={() => setPreviewContract(c)}><Eye size={18} /></button>
                                                                    <button className="btn-icon-modern edit" style={{ background: '#fef3c7', color: '#92400e' }} title="Edit Kontrak & Komponen" onClick={() => handleOpenModal('kontrak', c)}><Settings size={18} /></button>
                                                                    <button className="btn-icon-modern edit" style={{ background: '#dcfce7', color: '#166534' }} title="Edit Status PTKP" onClick={() => handleOpenModal('ptkp', c)}><ClipboardList size={18} /></button>
                                                                    {c.id_kontrak && (
                                                                        <button className="btn-icon-modern delete" title="Hapus Kontrak" onClick={() => handleDelete(c)}><Trash2 size={18} /></button>
                                                                    )}
                                                                </>
                                                            )
                                                        ) : (
                                                            <>
                                                                <button
                                                                    className="btn-icon-modern edit"
                                                                    title="Buat Kontrak"
                                                                    style={{ background: '#dbeafe', color: '#1e40af', width: 'auto', padding: '0 10px', fontSize: '0.8rem', gap: '5px' }}
                                                                    onClick={() => {
                                                                        setFormKontrak(prev => ({ ...prev, id_pegawai: pegawai.id_pegawai }));
                                                                        handleOpenModal('create_kontrak', pegawai);
                                                                    }}
                                                                >
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><PlusCircle size={14} /> Buat</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </td>
                                    </tr>
                                );
                            })}
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

                {/* MODAL CONTRACT (CREATE & EDIT BASIC) */}
                {showModal && (modalMode === 'kontrak' || modalMode === 'create_kontrak') && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 650, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header-modern">
                                <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> {modalMode === 'create_kontrak' ? 'Buat Kontrak Baru' : 'Edit Data Kontrak'}</span></h3>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <form onSubmit={handleSaveKontrak}>

                                    {/* SELECTION PEGAWAI (If Create New) */}
                                    <div className="form-group">
                                        <label>Pegawai *</label>
                                        {modalMode === 'create_kontrak' && !selectedPegawai ? (
                                            <select
                                                value={formKontrak.id_pegawai}
                                                onChange={e => setFormKontrak({ ...formKontrak, id_pegawai: e.target.value })}
                                                required
                                                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                                            >
                                                <option value="">-- Pilih Pegawai --</option>
                                                {pegawaiOptions.map(p => (
                                                    <option key={p.id_pegawai} value={p.id_pegawai}>
                                                        {p.nik} - {p.nama_lengkap}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: 8, fontWeight: 600 }}>
                                                {selectedPegawai?.nama_lengkap || '-'} <span style={{ fontSize: '0.85em', color: '#64748b' }}>({selectedPegawai?.nik})</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label>Tanggal Mulai *</label>
                                            <input type="date" value={formKontrak.tanggal_mulai} onChange={e => setFormKontrak({ ...formKontrak, tanggal_mulai: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Tanggal Berakhir</label>
                                            <input type="date" value={formKontrak.tanggal_berakhir} onChange={e => setFormKontrak({ ...formKontrak, tanggal_berakhir: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label>Jabatan *</label>
                                            <input type="text" value={formKontrak.jabatan} onChange={e => setFormKontrak({ ...formKontrak, jabatan: e.target.value })} required placeholder="cth: Staff IT" />
                                        </div>
                                        <div className="form-group">
                                            <label>Jenis Kontrak</label>
                                            <select value={formKontrak.jenis_kontrak} onChange={e => setFormKontrak({ ...formKontrak, jenis_kontrak: e.target.value })}>
                                                <option value="TETAP">TETAP</option>
                                                <option value="TIDAK TETAP">TIDAK TETAP</option>
                                                <option value="LEPAS">LEPAS</option>
                                                <option value="PART TIME">PART TIME</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label>Gaji Pokok *</label>
                                            <input type="number" value={formKontrak.gaji_pokok} onChange={e => setFormKontrak({ ...formKontrak, gaji_pokok: Number(e.target.value || 0) })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Tunjangan Tetap</label>
                                            <input type="number" value={formKontrak.tunjangan} onChange={e => setFormKontrak({ ...formKontrak, tunjangan: Number(e.target.value || 0) })} />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: 15 }}>
                                        <label>Catatan</label>
                                        <textarea
                                            value={formKontrak.catatan}
                                            onChange={e => setFormKontrak({ ...formKontrak, catatan: e.target.value })}
                                            rows="3"
                                            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit' }}
                                            placeholder="Tambahkan catatan khusus..."
                                        ></textarea>
                                    </div>

                                    {/* KOMPONEN TAMBAHAN SECTION */}
                                    <div style={{ marginTop: 25, borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
                                        <h4 style={{ fontSize: '0.95rem', color: '#1e293b', marginBottom: 15 }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Banknote size={16} /> Komponen Tambahan (Di luar Gaji Pokok & Tunjangan Tetap)</span></h4>

                                        {/* INPUT ROW */}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                            <div style={{ flex: 2 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nama Komponen</label>
                                                <select
                                                    value={newKomponen.nama}
                                                    onChange={e => setNewKomponen({ ...newKomponen, nama: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, backgroundColor: 'white' }}
                                                >
                                                    <option value="">-- Pilih Komponen --</option>
                                                    {masterKomponenOptions.map(mk => (
                                                        <option key={mk.id} value={mk.nama_komponen}>{mk.nama_komponen}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1.5 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nominal (Rp)</label>
                                                <input type="number" placeholder="0" value={newKomponen.nominal} onChange={e => setNewKomponen({ ...newKomponen, nominal: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipe</label>
                                                <select value={newKomponen.tipe} onChange={e => setNewKomponen({ ...newKomponen, tipe: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                                                    <option value="tetap">Tetap (Bulanan)</option>
                                                    <option value="non_alfa">Non Alfa</option>
                                                    <option value="kehadiran">Kehadiran (Harian)</option>
                                                </select>
                                            </div>
                                            <button type="button" onClick={handleAddKomponen} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Add</button>
                                        </div>

                                        {/* LIST */}
                                        {formKontrak.komponen_tambahan.length > 0 ? (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                                                        <th style={{ padding: 8, textAlign: 'left', fontSize: '0.8rem' }}>Komponen</th>
                                                        <th style={{ padding: 8, textAlign: 'right', fontSize: '0.8rem' }}>Nominal</th>
                                                        <th style={{ padding: 8, textAlign: 'center', fontSize: '0.8rem' }}>Tipe</th>
                                                        <th style={{ padding: 8, width: 30 }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {formKontrak.komponen_tambahan.map((k, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: 8 }}>{k.nama}</td>
                                                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatRp(k.nominal)}</td>
                                                            <td style={{ padding: 8, textAlign: 'center' }}><span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#e2e8f0', borderRadius: 4 }}>{k.tipe}</span></td>
                                                            <td style={{ padding: 8, textAlign: 'center' }}>
                                                                <button type="button" onClick={() => handleRemoveKomponen(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: 10, fontSize: '0.9rem' }}>Belum ada komponen tambahan.</p>
                                        )}
                                    </div>



                                    <div className="modal-footer-modern" style={{ marginTop: 20 }}>
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                        <button type="submit" className="btn-save">{modalMode === 'create_kontrak' ? 'Buat Kontrak' : 'Simpan Perubahan'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}



                {/* MODAL FOR PTKP (Sama seperti sebelumnya) */}
                {showModal && modalMode === 'ptkp' && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 450 }}>
                            <div className="modal-header-modern">
                                <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> Status PTKP</span></h3>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <form onSubmit={handleSavePtkp}>
                                    <div className="form-group">
                                        <label>Pegawai: <strong>{selectedPegawai?.nama_lengkap}</strong></label>
                                    </div>
                                    <div className="form-group">
                                        <label>Status PTKP *</label>
                                        <select value={formPtkp.status_ptkp} onChange={e => setFormPtkp({ ...formPtkp, status_ptkp: e.target.value })} required>
                                            <option value="">-- Pilih Status PTKP --</option>
                                            {ptkpOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="modal-footer-modern" style={{ marginTop: 20 }}>
                                        <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                        <button type="submit" className="btn-save">Simpan</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* PREVIEW DETAIL MODAL */}
                {previewContract && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 450 }}>
                            <div className="modal-header-modern">
                                <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={20} /> Rincian Gaji</span></h3>
                                <button type="button" onClick={() => setPreviewContract(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#334155' }}>{previewContract.nama_lengkap} <span style={{ fontWeight: 400, color: '#64748b' }}>({previewContract.jabatan})</span></h4>

                                <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ color: '#475569' }}>Gaji Pokok</span>
                                        <span style={{ fontWeight: 600 }}>{formatRp(previewContract.gaji_pokok)}</span>
                                    </div>

                                    {(() => {
                                        let comps = [];
                                        try {
                                            comps = typeof previewContract.komponen_tambahan === 'string' ? JSON.parse(previewContract.komponen_tambahan) : previewContract.komponen_tambahan;
                                        } catch (e) { }

                                        return comps.map((k, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ color: '#475569' }}>{k.nama} {k.tipe === 'harian' && <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>(Harian)</span>}</span>
                                                <span style={{ fontWeight: 500 }}>{formatRp(k.nominal)}</span>
                                            </div>
                                        ));
                                    })()}

                                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>Total Estimasi (Bulanan)</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: 700, color: '#10b981', display: 'block', fontSize: '1.1rem' }}>
                                                {formatRp(calculateTotal(previewContract).total)}
                                            </span>
                                            {calculateTotal(previewContract).hasDaily && (
                                                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontStyle: 'italic' }}>
                                                    * Termasuk estimasi komponen harian ({previewContract.hari_kerja_efektif || 22} hari kerja)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer-modern" style={{ marginTop: 20 }}>
                                    <button onClick={() => setPreviewContract(null)} className="btn-cancel" style={{ width: '100%' }}>Tutup</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL HAPUS DATA KONTRAK */}
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
                                    Anda akan menghapus kontrak <strong>{deleteTarget?.jenis_kontrak}</strong> untuk:
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
                                        onClick={confirmDeleteKontrak}
                                        className="btn-modern"
                                        style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Hapus Kontrak
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
            </main>

            <style>{`
                .date-picker-container { background: white; padding: 5px 10px 5px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
                .modern-input-date { border: none; font-family: inherit; color: #0f172a; font-weight: 600; cursor: pointer; outline: none; }
                .label-periode { font-weight: 600; color: #475569; font-size: 0.9rem; }
            `}</style>
        </div >
    );
};

export default KontrakPegawai;
