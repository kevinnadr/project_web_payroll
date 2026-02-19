import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const Absensi = () => {
    const [user, setUser] = useState(null);
    const [listAbsensi, setListAbsensi] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));


    const fileInputRef = useRef(null);
    const monthInputRef = useRef(null);
    const navigate = useNavigate();

    // State Modal
    const [showModal, setShowModal] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
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
                alert("✅ Pengaturan berhasil disimpan!");
                setShowSettingsModal(false);
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (e) {
            alert("Error saving settings");
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
    }, [searchTerm, listAbsensi]);

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
                    'hadir',
                    'sakit',
                    'izin',
                    'cuti',
                    'hari_terlambat',
                    'menit_terlambat'
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

                alert("Import Berhasil ✅");
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


    const handleSaveAbsensi = async (e) => {
        e.preventDefault();

        // Validation: Total days cannot exceed effective days
        const total = parseInt(editData.hadir || 0) + parseInt(editData.sakit || 0) + parseInt(editData.izin || 0) + parseInt(editData.cuti || 0);
        const limit = parseInt(editData.hari_efektif || 0);

        if (limit > 0 && total > limit) {
            alert(`Total kehadiran (${total}) tidak boleh melebihi Hari Efektif (${limit})!`);
            return;
        }

        try {
            const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/save.php`, { ...editData, bulan: bulanFilter });
            if (res.data.status === 'success') { setShowModal(false); fetchData(); }
            else { alert(res.data.message); }
        } catch (e) { alert("Error saving data"); }
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

                {/* HEADER SECTION */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', margin: '0 0 5px 0' }}>Data Absensi</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0 }}>Monitor kehadiran, sakit, izin, dan keterlambatan</p>
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
                            <span>⚙️ Pengaturan</span>
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
                                <span style={{ opacity: 0.7 }}>📅</span>
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

                {/* MAIN CARD */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>

                    {/* TOOLBAR INSIDE CARD */}
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                📋
                            </div>
                            <span style={{ fontWeight: 700, color: '#374151', fontSize: '1rem' }}>Data Absensi</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input
                                type="text"
                                placeholder="Cari Nama / NIK"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db',
                                    fontSize: '0.9rem', outline: 'none', width: '220px', color: '#374151'
                                }}
                            />
                            <button onClick={() => setShowFormatModal(true)} style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white',
                                color: '#374151', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                📄 Format Excel
                            </button>
                            <button onClick={() => fileInputRef.current.click()} style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb',
                                color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                📤 Import Excel
                            </button>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={handleFileChange} />
                        </div>
                    </div>

                    {/* TABLE */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Pegawai</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Hadir</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Cuti</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Sakit</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Izin</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Telat (X)</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Menit</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Lembur</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Hari Efektif</th>
                                <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
                            ) : filteredList.map((row) => (
                                <tr key={row.pegawai_id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                                                background: `hsl(${(row.nama_lengkap.length * 25) % 360}, 70%, 50%)` // Dynamic color based on name length
                                            }}>
                                                {row.nama_lengkap.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.95rem' }}>{row.nama_lengkap}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{row.jabatan || 'PEGAWAI'}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981', fontSize: '1rem' }}>{row.hadir}</td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.cuti > 0 ? '#ef4444' : '#e5e7eb', fontSize: '1rem' }}>
                                        {row.cuti > 0 ? row.cuti : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.sakit > 0 ? '#ef4444' : '#e5e7eb', fontSize: '1rem' }}>
                                        {row.sakit > 0 ? row.sakit : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.izin > 0 ? '#ef4444' : '#e5e7eb', fontSize: '1rem' }}>
                                        {row.izin > 0 ? row.izin : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.hari_terlambat > 0 ? '#ef4444' : '#e5e7eb', fontSize: '1rem' }}>
                                        {row.hari_terlambat > 0 ? row.hari_terlambat : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.menit_terlambat > 0 ? '#ef4444' : '#e5e7eb', fontSize: '0.95rem' }}>
                                        {row.menit_terlambat > 0 ? `${row.menit_terlambat}m` : '0m'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: row.jam_lembur > 0 ? '#0ea5e9' : '#e5e7eb', fontSize: '1rem' }}>
                                        {row.jam_lembur > 0 ? `${row.jam_lembur}j` : '0'}
                                    </td>

                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: '1rem' }}>
                                        {row.hari_efektif}
                                    </td>

                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => { setEditData({ ...row, jam_lembur: row.jam_lembur || 0, hari_efektif: row.hari_efektif || 25 }); setShowModal(true); }}
                                                style={{ border: '1px solid #fbbf24', background: 'white', color: '#d97706', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                title="Edit Absensi"
                                            >
                                                ✏️
                                            </button>
                                            {/* Delete button disabled visually as requested in 'Aksi' column but no function */}
                                            <button
                                                style={{ border: '1px solid #fecaca', background: 'white', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', opacity: 0.5 }}
                                                title="Hapus (Non-aktif)"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL SETTINGS */}
                {showSettingsModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: '450px' }}>
                            <div className="modal-header-modern">
                                <h3>⚙️ Pengaturan Absensi</h3>
                                <button onClick={() => setShowSettingsModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSaveSettings} style={{ padding: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#334155' }}>💰 Denda Keterlambatan</h4>
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

                                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #bae6fd' }}>
                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#0369a1' }}>🕒 Lembur</h4>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: '#0c4a6e' }}>Tarif Lembur Per Jam (Rp)</label>
                                        <input type="number" className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #7dd3fc', borderRadius: '6px' }}
                                            value={settings.tarif_lembur_per_jam || ''}
                                            onChange={e => setSettings({ ...settings, tarif_lembur_per_jam: e.target.value })}
                                        />
                                        <small style={{ display: 'block', marginTop: '4px', color: '#0ea5e9', fontSize: '0.75rem' }}>
                                            Perhitungan = Jam Lembur x Tarif Per Jam
                                        </small>
                                    </div>
                                </div>

                                <button type="submit" className="btn-modern btn-gradient" style={{ width: '100%' }}>Simpan Pengaturan</button>
                            </form>
                        </div>
                    </div>
                )
                }

                {/* MODAL EDIT (Kept functional but same style as before for simplicity, or slightly updated) */}
                {
                    showModal && (
                        <div className="modal-backdrop">
                            <div className="modal-content-modern" style={{ width: '450px' }}>
                                <div className="modal-header-modern">
                                    <h3>Update Kehadiran</h3>
                                    <button onClick={() => setShowModal(false)}>✕</button>
                                </div>
                                <form onSubmit={handleSaveAbsensi} style={{ padding: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Hadir</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px' }} value={editData.hadir} onChange={e => setEditData({ ...editData, hadir: e.target.value })} /></div>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Cuti</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px' }} value={editData.cuti} onChange={e => setEditData({ ...editData, cuti: e.target.value })} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Sakit</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px' }} value={editData.sakit} onChange={e => setEditData({ ...editData, sakit: e.target.value })} /></div>
                                        <div><label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Izin</label><input type="number" className="form-control" style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '8px' }} value={editData.izin} onChange={e => setEditData({ ...editData, izin: e.target.value })} /></div>
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
                                            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Telat (Hari)</label><input type="number" className="form-control" style={{ border: '1px solid #fcd34d', padding: '8px', borderRadius: '8px' }} value={editData.hari_terlambat} onChange={e => setEditData({ ...editData, hari_terlambat: e.target.value })} /></div>
                                            <div><label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Telat (Menit)</label><input type="number" className="form-control" style={{ border: '1px solid #fcd34d', padding: '8px', borderRadius: '8px' }} value={editData.menit_terlambat} onChange={e => setEditData({ ...editData, menit_terlambat: e.target.value })} /></div>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-modern btn-gradient" style={{ width: '100%' }}>Simpan Perubahan</button>
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
                                        ❌ Import Gagal
                                    </h3>
                                    <button onClick={() => setShowErrorModal(false)} style={{ color: '#991b1b' }}>✕</button>
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
                                <div className="modal-header-modern"><h3>📋 Format Import Data Absensi</h3><button onClick={() => setShowFormatModal(false)}>✕</button></div>
                                <div style={{ padding: '25px' }}>
                                    <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template yang disediakan untuk hasil terbaik. Pastikan format kolom sesuai contoh berikut:</p>
                                    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>nik</th>
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
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>20</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>1</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>0</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>2</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>30</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>5</td>
                                                    <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>25</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '10px', fontWeight: '600', color: '#1e293b' }}>2024002</td>
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
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}>📥 Download Template CSV</button>
                                        <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}>📂 Langsung Import</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </main >
        </div >
    );
};

export default Absensi;