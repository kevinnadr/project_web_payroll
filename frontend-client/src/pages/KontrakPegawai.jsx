import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const KontrakPegawai = () => {
    const [listKontrak, setListKontrak] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    // Pegawai List for Dropdown
    const [pegawaiOptions, setPegawaiOptions] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState(''); // 'kontrak', 'create_kontrak', 'ptkp'
    const [selectedPegawai, setSelectedPegawai] = useState(null); // Full object row
    const [previewContract, setPreviewContract] = useState(null); // For detail preview
    const monthInputRef = useRef(null);
    const navigate = useNavigate();

    // --- NOTIFICATION STATE ---
    const [notification, setNotification] = useState(null); // { type: 'success'|'error', title: string, message: string }

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

    const [newKomponen, setNewKomponen] = useState({ nama: '', nominal: 0, tipe: 'bulanan' });
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

        const endDate = new Date(end);
        const now = new Date();

        // Reset hours to compare dates only
        now.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (isNaN(endDate.getTime())) return '-';

        // Check if expired
        if (endDate < now) {
            return (
                <div style={{ color: '#ef4444', fontWeight: 600 }}>
                    Sudah Berakhir
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 400 }}>
                        ({endDate.toLocaleDateString('id-ID')})
                    </div>
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

        if (parts.length === 0) return <span style={{ color: '#f59e0b', fontWeight: 600 }}>Berakhir Hari Ini</span>;

        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, color: years < 1 && months < 2 ? '#f59e0b' : '#334155' }}>
                    {parts.join(' ')} lagi
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    s/d {endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listKontrak.filter(item =>
            (item.nama_lengkap || '').toLowerCase().includes(lower) || String(item.nik || '').includes(lower)
        ));
    }, [searchTerm, listKontrak]);

    const handleOpenModal = async (mode, pegawai = null) => {
        setModalMode(mode);
        setSelectedPegawai(pegawai);

        if (mode === 'create_kontrak') {
            // Reset for new contract
            setFormKontrak({
                id_pegawai: pegawai ? pegawai.id_pegawai : '',
                id_kontrak: '',
                jabatan: '', tanggal_mulai: new Date().toISOString().split('T')[0], tanggal_berakhir: '',
                jenis_kontrak: 'TETAP', status_ptkp: pegawai?.status_ptkp || 'TK/0', gaji_pokok: 0, tunjangan: 0, komponen_tambahan: []
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
                komponen_tambahan: loadedKomponen
            });

            setNewKomponen({ nama: '', nominal: 0, tipe: 'bulanan' });

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
        if (!newKomponen.nama.trim()) return alert('Nama komponen harus diisi!');
        if (!newKomponen.nominal || newKomponen.nominal <= 0) return alert('Nominal harus lebih dari 0!');
        setFormKontrak(prev => ({
            ...prev,
            komponen_tambahan: [...prev.komponen_tambahan, { ...newKomponen, nominal: Number(newKomponen.nominal) }]
        }));
        setNewKomponen({ nama: '', nominal: 0, tipe: 'bulanan' });
    };

    const handleRemoveKomponen = (index) => {
        setFormKontrak(prev => ({
            ...prev,
            komponen_tambahan: prev.komponen_tambahan.filter((_, i) => i !== index)
        }));
    };

    const handleSaveKontrak = async (e) => {
        e.preventDefault();
        if (!formKontrak.id_pegawai) return alert("Pilih Pegawai!");

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
                            tipe: 'bulanan',
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

                setNotification({ type: 'success', title: '✅ Berhasil', message: 'Data Kontrak Disimpan!' });
                setShowModal(false);
                fetchData();

            } else {
                setNotification({ type: 'error', title: '❌ Gagal', message: resKontrak.data.message });
            }
        } catch (e) {
            setNotification({ type: 'error', title: '❌ Error', message: e.response?.data?.message || e.message });
        }
    };

    const handleSavePtkp = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/update_ptkp.php', formPtkp);
            if (res.data.status === 'success') {
                setNotification({ type: 'success', title: '✅ Berhasil', message: 'Status PTKP Updated!' });
                setShowModal(false); fetchData();
            } else {
                setNotification({ type: 'error', title: '❌ Gagal', message: res.data.message });
            }
        } catch (e) {
            setNotification({ type: 'error', title: '❌ Error', message: e.response?.data?.message || e.message });
        }
    };

    const handleDelete = async (kontrak) => {
        if (!kontrak.id_kontrak) return;
        if (!confirm(`Hapus kontrak ${kontrak.jenis_kontrak} untuk ${kontrak.nama_lengkap}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/delete_kontrak.php', { id_kontrak: kontrak.id_kontrak });
            if (res.data.status === 'success') {
                setNotification({ type: 'success', title: '✅ Terhapus', message: 'Kontrak berhasil dihapus!' });
                fetchData();
            } else {
                setNotification({ type: 'error', title: '❌ Gagal', message: res.data.message });
            }
        } catch (e) {
            setNotification({ type: 'error', title: '❌ Error', message: e.response?.data?.message || e.message });
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
                    if (k.tipe === 'harian') {
                        hasDaily = true;
                        // Use hari_kerja_efektif from backend (dynamic from absensi)
                        const days = c.hari_kerja_efektif || 22;
                        total += Number(k.nominal || 0) * days;
                    }
                    else {
                        total += Number(k.nominal || 0);
                    }
                });
            } catch (e) { }
        }
        return { total, hasDaily };
    };


    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
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
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari Nama / NIK..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <button className="btn-save" onClick={() => handleOpenModal('create_kontrak')}>
                            + Buat Kontrak Baru
                        </button>
                        <button className="btn-refresh" onClick={fetchData}>🔄 Refresh</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>NIK</th>
                                <th style={{ textAlign: 'center' }}>NAMA PEGAWAI</th>
                                <th style={{ textAlign: 'center' }}>JABATAN</th>
                                <th style={{ textAlign: 'center' }}>STATUS PTKP</th>
                                <th style={{ textAlign: 'center' }}>JENIS KONTRAK</th>
                                <th>MASA KONTRAK</th>
                                <th>TOTAL GAJI</th>
                                <th style={{ textAlign: 'center' }}>AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20 }}>Loading Data...</td></tr>
                            ) : filteredList.length === 0 ? (
                                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Data tidak ditemukan</td></tr>
                            ) : Object.values(filteredList.reduce((acc, item) => {
                                // Grouping Logic
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
                            }, {})).map((group) => {
                                const { pegawai, contracts } = group;

                                // Handle case where no contracts exist for employee
                                const displayContracts = contracts.length > 0 ? contracts : [null];

                                return (
                                    <tr key={pegawai.id_pegawai} style={{ verticalAlign: 'top' }}>
                                        <td style={{ fontWeight: 600, verticalAlign: 'middle', textAlign: 'center' }}>{pegawai.nik}</td>
                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{pegawai.nama_lengkap}</td>

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
                                            {displayContracts.map((c, idx) => (
                                                <div key={idx} style={{
                                                    padding: 16,
                                                    borderBottom: idx === displayContracts.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                    display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {c ? (
                                                        <>
                                                            <button className="btn-icon-modern edit" title="Preview Rincian Gaji" onClick={() => setPreviewContract(c)}>👁️</button>
                                                            <button className="btn-icon-modern edit" title="Edit Kontrak & Komponen" onClick={() => handleOpenModal('kontrak', c)}>⚙️</button>
                                                            <button className="btn-icon-modern edit" title="Edit Status PTKP" onClick={() => handleOpenModal('ptkp', c)}>📋</button>
                                                            {c.id_kontrak && (
                                                                <button className="btn-icon-modern delete" title="Hapus Kontrak" onClick={() => handleDelete(c)}>🗑️</button>
                                                            )}
                                                        </>
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
                                                                + Buat
                                                            </button>
                                                            <button className="btn-icon-modern edit" title="Edit Status PTKP" onClick={() => handleOpenModal('ptkp', pegawai)}>📋</button>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* MODAL CONTRACT (CREATE & EDIT BASIC) */}
                {showModal && (modalMode === 'kontrak' || modalMode === 'create_kontrak') && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 650, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header-modern">
                                <h3>⚙️ {modalMode === 'create_kontrak' ? 'Buat Kontrak Baru' : 'Edit Data Kontrak'}</h3>
                                <button onClick={() => setShowModal(false)}>✕</button>
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

                                    {/* KOMPONEN TAMBAHAN SECTION */}
                                    <div style={{ marginTop: 25, borderTop: '2px dashed #e2e8f0', paddingTop: 20 }}>
                                        <h4 style={{ fontSize: '0.95rem', color: '#1e293b', marginBottom: 15 }}>💰 Komponen Tambahan (Di luar Gaji Pokok & Tunjangan Tetap)</h4>

                                        {/* INPUT ROW */}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                                            <div style={{ flex: 2 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nama Komponen</label>
                                                <input type="text" placeholder="cth: Uang Makan" value={newKomponen.nama} onChange={e => setNewKomponen({ ...newKomponen, nama: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
                                            </div>
                                            <div style={{ flex: 1.5 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nominal (Rp)</label>
                                                <input type="number" placeholder="0" value={newKomponen.nominal} onChange={e => setNewKomponen({ ...newKomponen, nominal: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipe</label>
                                                <select value={newKomponen.tipe} onChange={e => setNewKomponen({ ...newKomponen, tipe: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
                                                    <option value="bulanan">Bulanan</option>
                                                    <option value="harian">Harian</option>
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
                                                                <button type="button" onClick={() => handleRemoveKomponen(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
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
                                <h3>📋 Status PTKP</h3>
                                <button onClick={() => setShowModal(false)}>✕</button>
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
                                <h3>👁️ Rincian Gaji</h3>
                                <button onClick={() => setPreviewContract(null)}>✕</button>
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
            </main>


            {/* NOTIFICATION MODAL */}
            {notification && (
                <div className="modal-backdrop" style={{ zIndex: 9999 }}>
                    <div className="modal-content-modern" style={{ width: 500, animation: 'slideUp 0.3s ease-out' }}>
                        <div className="modal-header-modern" style={{
                            background: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            borderBottom: notification.type === 'success' ? '1px solid #dcfce7' : '1px solid #fee2e2'
                        }}>
                            <h3 style={{
                                color: notification.type === 'success' ? '#166534' : '#991b1b',
                                margin: 0, fontSize: '1.25rem'
                            }}>
                                {notification.title}
                            </h3>
                            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>
                        <div style={{ padding: 25 }}>
                            <p style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>{notification.message}</p>
                            <button
                                onClick={() => setNotification(null)}
                                className="btn-save"
                                style={{
                                    width: '100%',
                                    background: notification.type === 'success' ? '#10b981' : '#ef4444',
                                    padding: '12px', fontSize: '1rem'
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* REUSE STYLES */
                .app-layout { display: flex; min-height: 100vh; background: #f8fafc; }
                .main-content { flex: 1; padding: 25px; }
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                .toolbar-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                
                .search-box { display: flex; align-items: center; background: white; padding: 8px 15px; border-radius: 10px; border: 1px solid #e2e8f0; width: 300px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
                .search-icon { margin-right: 10px; color: #94a3b8; }
                .search-box input { border: none; outline: none; background: transparent; width: 100%; color: #334155; }
                
                .btn-refresh { padding: 10px 18px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); margin-left:10px;}
                .btn-refresh:hover { background: #f1f5f9; border-color: #94a3b8; }

                .table-container-modern { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
                .modern-table { width: 100%; border-collapse: collapse; text-align: left; }
                .modern-table th { background: #f8fafc; padding: 16px; font-size: 0.8rem; font-weight: 700; color: #475569; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
                .modern-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #1e293b; vertical-align: middle; }
                .modern-table tr:hover { background: #fcfcfc; }
                
                .badge-status { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: inline-block; }
                .badge-status.tetap { background: #dcfce7; color: #166534; }
                .badge-status.kontrak { background: #e0f2fe; color: #075985; }

                .btn-icon-modern { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 1rem; }
                .btn-icon-modern.edit { background: #e0e7ff; color: #4338ca; }
                .btn-icon-modern.edit:hover { background: #c7d2fe; }

                /* MODAL STYLES */
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding:15px; }
                .modal-content-modern { background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); overflow: hidden; animation: slideUp 0.3s ease-out; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                
                .modal-header-modern { padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                .modal-header-modern h3 { margin: 0; color: #1e293b; font-size: 1.25rem; }
                .modal-header-modern button { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
                
                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #475569; font-size: 0.9rem; }
                .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
                .form-group input:focus, .form-group select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 10px; }
                .btn-cancel { padding: 10px 20px; background: #f1f5f9; color: #64748b; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .btn-save { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3); }
                .btn-save:hover { background: #2563eb; }
                
                .date-picker-container { background: white; padding: 5px 10px 5px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
                .modern-input-date { border: none; font-family: inherit; color: #0f172a; font-weight: 600; cursor: pointer; outline: none; }
                .label-periode { font-weight: 600; color: #475569; font-size: 0.9rem; }
            `}</style>
        </div>
    );
};

export default KontrakPegawai;
