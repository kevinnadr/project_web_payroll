import React, { useState, useEffect } from 'react';
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
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState(''); // 'kontrak', 'ptkp', 'pph'
    const [selectedPegawai, setSelectedPegawai] = useState(null);
    const navigate = useNavigate();

    // --- FORM STATE ---
    const [formKontrak, setFormKontrak] = useState({
        id_pegawai: '', jabatan: '', tanggal_mulai: '', tanggal_berakhir: '',
        jenis_kontrak: 'TETAP', gaji_pokok: 0, tunjangan: 0, komponen: []
    });

    const [formPtkp, setFormPtkp] = useState({ id_pegawai: '', status_ptkp: 'TK/0' });
    const [formPph, setFormPph] = useState({ id_pegawai: '', kategori_ter: '', tarif: 0 });

    // Daftar PTKP standar sesuai peraturan pajak
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

    const [komponenList, setKomponenList] = useState([]);
    const [ptkpList, setPtkpList] = useState([]);
    const [pphTerList, setPphTerList] = useState([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
            fetchKomponen();
            fetchPtkp();
            fetchPphTer();
        }
    }, [navigate]);

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

    const fetchKomponen = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/get_komponen.php');
            if (res.data.status === 'success') {
                setKomponenList(res.data.data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchPtkp = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            if (res.data.status === 'success') {
                const uniquePtkp = [...new Set(res.data.data.map(p => p.status_ptkp).filter(Boolean))];
                setPtkpList(uniquePtkp.sort());
            }
        } catch (e) { console.error(e); }
    };

    const fetchPphTer = async () => {
        // PPH TER hanya 3 kategori, tidak perlu fetch dari API
        setPphTerList([
            { value: 'A', label: 'TER A — TK/0, TK/1, K/0' },
            { value: 'B', label: 'TER B — TK/2, TK/3, K/1, K/2' },
            { value: 'C', label: 'TER C — K/3' },
        ]);
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listKontrak.filter(item =>
            (item.nama_lengkap || '').toLowerCase().includes(lower) || String(item.nik || '').includes(lower)
        ));
    }, [searchTerm, listKontrak]);

    const handleOpenModal = (mode, pegawai = null) => {
        setModalMode(mode);
        setSelectedPegawai(pegawai);
        if (mode === 'kontrak' && pegawai) {
            setFormKontrak({
                id_pegawai: pegawai.id,
                jabatan: pegawai.jabatan || '',
                tanggal_mulai: pegawai.tanggal_mulai || '',
                tanggal_berakhir: pegawai.tanggal_berakhir || '',
                jenis_kontrak: pegawai.jenis_kontrak || 'TETAP',
                gaji_pokok: pegawai.gaji_total || 0,
                tunjangan: pegawai.tunjangan || 0,
                komponen: pegawai.komponen ? pegawai.komponen.split('|').map(k => {
                    const [nama, nominal] = k.split(':');
                    return { nama, nominal: parseInt(nominal) };
                }) : []
            });
        } else if (mode === 'ptkp' && pegawai) {
            setFormPtkp({ id_pegawai: pegawai.id, status_ptkp: pegawai.status_ptkp || 'TK/0' });
        } else if (mode === 'pph' && pegawai) {
            setFormPph({ id_pegawai: pegawai.id, kategori_ter: '', tarif: 0 });
        }
        setShowModal(true);
    };

    const handleSaveKontrak = async (e) => {
        e.preventDefault();
        if (!selectedPegawai) return alert('Pegawai tidak terpilih');

        // Ensure we have the contract ID if updating
        const payloadData = {
            ...formKontrak,
            id_pegawai: selectedPegawai.id,
            id_kontrak: selectedPegawai.id_kontrak || null // Include ID if updating
        };

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_kontrak.php', payloadData);
            if (res.data.status === 'success') {
                alert('✅ Kontrak berhasil disimpan!');
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (e) {
            alert('❌ Error: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleSavePtkp = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                id_pegawai: formPtkp.id_pegawai,
                status_ptkp: formPtkp.status_ptkp
            };
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/update_ptkp.php', payload);
            if (res.data.status === 'success') {
                alert('✅ ' + (res.data.message || 'Status PTKP berhasil diupdate!'));
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + (res.data.message || 'Unknown error'));
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            alert('❌ Error: ' + msg);
        }
    };

    const handleSavePph = async (e) => {
        e.preventDefault();
        if (!formPph.kategori_ter) {
            return alert('Pilih kategori TER terlebih dahulu!');
        }
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_pph_ter_pegawai.php', formPph);
            if (res.data.status === 'success') {
                alert('✅ ' + (res.data.message || 'PPH TER berhasil diset!'));
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + (res.data.message || 'Unknown error'));
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            alert('❌ Error: ' + msg);
        }
    };

    const formatRp = (n) => {
        const val = parseFloat(n);
        return isNaN(val) ? "Rp 0" : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Kontrak Kerja</h1>
                        <p className="modern-subtitle">Kelola data kontrak kerja dan komponen gaji pegawai.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input type="month" value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} style={{ height: 42, padding: 8, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                        <button onClick={fetchData} className="btn-modern btn-outline">🔄 Refresh</button>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={() => window.open(`http://localhost/project_web_payroll/backend-api/modules/master_gaji/export_excel.php?bulan=${bulanFilter}`, '_blank')} className="btn-modern btn-outline">📊 Export Excel</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>NIK</th>
                                <th>Nama Pegawai</th>
                                <th>Tanggal Mulai</th>
                                <th>Tanggal Berakhir</th>
                                <th>Jabatan</th>
                                <th>Gaji Pokok</th>
                                <th>Tunjangan</th>
                                <th>Jenis Kontrak</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="9" className="text-center p-4">⏳ Memuat...</td></tr> :
                                filteredList.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ fontWeight: 600 }}>{row.nik}</td>
                                        <td>{row.nama_lengkap}</td>
                                        <td>{row.tanggal_mulai || '-'}</td>
                                        <td>{row.tanggal_berakhir || '-'}</td>
                                        <td>{row.jabatan || '-'}</td>
                                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatRp(row.gaji_total)}</td>
                                        <td style={{ color: '#3b82f6', fontWeight: 600 }}>{formatRp(row.tunjangan)}</td>
                                        <td><span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600 }}>{row.jenis_kontrak}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button className="btn-icon-modern edit" title="Pengaturan Kontrak" onClick={() => handleOpenModal('kontrak', row)}>⚙️</button>
                                                <button className="btn-icon-modern edit" title="Status PTKP" onClick={() => handleOpenModal('ptkp', row)}>📋</button>
                                                <button className="btn-icon-modern edit" title="PPH TER" onClick={() => handleOpenModal('pph', row)}>💳</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL FOR KONTRAK */}
                {showModal && modalMode === 'kontrak' && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 600 }}>
                            <div className="modal-header-modern">
                                <h3>⚙️ Pengaturan Kontrak Kerja</h3>
                                <button onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <form onSubmit={handleSaveKontrak}>
                                    <div className="form-group">
                                        <label>Pegawai: {selectedPegawai?.nama_lengkap}</label>
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
                                            <input type="text" value={formKontrak.jabatan} onChange={e => setFormKontrak({ ...formKontrak, jabatan: e.target.value })} required />
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
                                            <label>Tunjangan Bulanan</label>
                                            <input type="number" value={formKontrak.tunjangan} onChange={e => setFormKontrak({ ...formKontrak, tunjangan: Number(e.target.value || 0) })} />
                                        </div>
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

                {/* MODAL FOR PTKP */}
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
                                        <label>Pegawai: {selectedPegawai?.nama_lengkap}</label>
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

                {/* MODAL FOR PPH TER */}
                {showModal && modalMode === 'pph' && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: 450 }}>
                            <div className="modal-header-modern">
                                <h3>💳 PPH TER Setting</h3>
                                <button onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <form onSubmit={handleSavePph}>
                                    <div className="form-group">
                                        <label>Pegawai: {selectedPegawai?.nama_lengkap}</label>
                                    </div>
                                    <div className="form-group">
                                        <label>Kategori PPH TER *</label>
                                        <select value={formPph.kategori_ter} onChange={e => setFormPph({ ...formPph, kategori_ter: e.target.value })} required>
                                            <option value="">-- Pilih Kategori TER --</option>
                                            {pphTerList.map((opt) => (
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
            </main>

            <style>{`
                .app-layout { display: flex; min-height: 100vh; background: #f8fafc; }
                .main-content { flex: 1; padding: 25px; }
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                .toolbar-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .search-box { display: flex; align-items: center; background: white; padding: 0 15px; border-radius: 10px; border: 1px solid #e2e8f0; width: 320px; height: 42px; }
                .search-box input { border: none; outline: none; width: 100%; margin-left: 10px; }
                .toolbar-actions { display: flex; gap: 10px; }
                .btn-modern { padding: 8px 15px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; background: white; color: #475569; border: 1px solid #cbd5e1; transition: 0.2s; }
                .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
                .btn-icon-modern { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 5px; font-size: 1rem; }
                .edit { background: #eff6ff; color: #3b82f6; }
                .table-container-modern { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #f1f5f9; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; font-size: 0.85rem; border-bottom: 1px solid #e2e8f0; }
                .modern-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.95rem; }
                .text-center { text-align: center; }
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 100; }
                .modal-content-modern { background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s; }
                .modal-header-modern { background: #f8fafc; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .modal-header-modern h3 { margin: 0; color: #1e293b; font-size: 1.1rem; }
                .modal-header-modern button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 5px; }
                .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; transition: 0.2s; }
                .form-group input:focus, .form-group select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 10px; }
                .btn-save { background: linear-gradient(135deg,#4f46e5,#3b82f6); color:white; padding:10px 16px; border-radius:8px; border:none; font-weight:700; cursor:pointer; }
                .btn-cancel { background:#f1f5f9; padding:10px 16px; border-radius:8px; border:none; cursor:pointer; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div >
    );
};

export default KontrakPegawai;
