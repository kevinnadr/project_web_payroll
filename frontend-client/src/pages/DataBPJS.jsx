import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const DataBPJS = () => {
    const [user, setUser] = useState(null);
    const [rawList, setRawList] = useState([]); // Store raw API data (with nested contracts)
    const [filteredList, setFilteredList] = useState([]); // Store display data (flattened with BPJS info)
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(false);

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
    }, [searchTerm, rawList]);

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
                alert(`✅ Data BPJS (${periodFilter}) Disimpan!`);
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (error) {
            alert('Gagal simpan!');
        }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus/Reset data BPJS untuk ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/delete.php', { id_pegawai: id });
            if (res.data.status === 'success') {
                alert('✅ Data Direset!');
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (e) {
            alert('Gagal hapus');
        }
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
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
                </div>

                <div className="toolbar-modern">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Cari Nama / NIK..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Period Picker */}
                        <div
                            style={{ background: 'white', padding: '0 15px', borderRadius: '10px', border: '1px solid #e2e8f0', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
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
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Periode:</span>
                            <input
                                ref={periodInputRef}
                                type="month"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>Pegawai</th>
                                <th>BPJS TK</th>
                                <th>BPJS KS</th>
                                <th>Dasar Upah</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">⏳ Memuat...</td></tr>
                            ) : (
                                filteredList.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td>
                                            <div className="user-profile">
                                                <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                <div>
                                                    <div className="user-name-modern">{row.nama_lengkap}</div>
                                                    <div className="user-nik-modern">{row.nik}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatRupiah(row.bpjs_tk)}</td>
                                        <td>{formatRupiah(row.bpjs_ks)}</td>
                                        <td>{formatRupiah(row.dasar_upah)}</td>
                                        <td className="text-center aksi-full">
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit">✏️</button>
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
            </main>

            {/* MODAL FORM */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '400px' }}>
                        <div className="modal-header-modern">
                            <h3>✏️ Edit Data BPJS</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
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
        </div>
    );
};

export default DataBPJS;
