import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const PPHTer = () => {
    const [pphList, setPphList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('A');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        id: '',
        kategori: '',
        min: 0,
        max: 0,
        tarif: 0
    });

    const terInfo = {
        A: { title: 'TER A', ptkp: 'PTKP : TK/0 (54 juta); TK/1 & K/0 (58,5 juta)', color: '#3b82f6' },
        B: { title: 'TER B', ptkp: 'PTKP : TK/2 & K/1 (63 juta); TK/3 & K/2 (67,5 juta)', color: '#8b5cf6' },
        C: { title: 'TER C', ptkp: 'PTKP : K/3 (72 juta)', color: '#059669' },
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
        }
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/read_pph_ter.php');
            if (res.data.status === 'success') {
                setPphList(res.data.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (pph = null) => {
        if (pph) {
            setFormData({
                id: pph.id,
                kategori: pph.kategori,
                min: pph.min,
                max: pph.max,
                tarif: pph.tarif
            });
            setIsEdit(true);
        } else {
            setFormData({ id: '', kategori: activeTab, min: 0, max: 0, tarif: 0 });
            setIsEdit(false);
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.kategori || formData.min < 0 || formData.tarif < 0) {
            return alert('Semua field harus diisi dengan benar!');
        }

        try {
            const url = isEdit
                ? 'http://localhost/project_web_payroll/backend-api/modules/master_gaji/update_pph_ter.php'
                : 'http://localhost/project_web_payroll/backend-api/modules/master_gaji/create_pph_ter.php';

            const res = await axios.post(url, formData);
            if (res.data.status === 'success') {
                alert(isEdit ? '✅ PPH TER berhasil diupdate!' : '✅ PPH TER baru berhasil ditambahkan!');
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (e) {
            alert('❌ Error: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus data ini?')) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/delete_pph_ter.php', { id });
            if (res.data.status === 'success') {
                alert('✅ Data berhasil dihapus!');
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (e) {
            alert('❌ Error: ' + e.message);
        }
    };

    const formatRp = (n) => {
        const val = parseFloat(n);
        if (isNaN(val) || val === 0) return '-';
        return new Intl.NumberFormat('id-ID').format(val);
    };

    const filteredList = pphList.filter(p => p.kategori === activeTab);

    // Bagi data jadi 2 kolom
    const halfLen = Math.ceil(filteredList.length / 2);
    const leftCol = filteredList.slice(0, halfLen);
    const rightCol = filteredList.slice(halfLen);

    const info = terInfo[activeTab];

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">PPH TER Management</h1>
                        <p className="modern-subtitle">Tarif Efektif Rata-rata PPh Pasal 21 — Sumber: www.pajak.go.id</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-modern" style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', padding: '10px 16px' }}>
                        ➕ Tambah PPH TER
                    </button>
                </div>

                {/* TAB SELECTOR */}
                <div style={{ display: 'flex', gap: '0px', marginBottom: '20px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                    {Object.entries(terInfo).map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                transition: 'all 0.2s',
                                background: activeTab === key ? val.color : 'transparent',
                                color: activeTab === key ? 'white' : '#64748b',
                                boxShadow: activeTab === key ? `0 4px 12px ${val.color}40` : 'none',
                            }}
                        >
                            {val.title}
                        </button>
                    ))}
                </div>

                {/* INFO BANNER */}
                <div style={{
                    background: `linear-gradient(135deg, ${info.color}10, ${info.color}05)`,
                    border: `1.5px solid ${info.color}30`,
                    padding: '16px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        background: info.color,
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        whiteSpace: 'nowrap'
                    }}>
                        {info.title}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{info.ptkp}</p>
                        <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                            Total {filteredList.length} lapisan penghasilan bruto
                        </p>
                    </div>
                </div>

                {/* TABLE - 2 COLUMN LAYOUT (LIKE PAJAK.GO.ID) */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>⏳ Memuat data...</div>
                ) : filteredList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>📭 Belum ada data TER {activeTab}</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* KOLOM KIRI */}
                        <div className="table-container-modern" style={{ overflow: 'hidden' }}>
                            <table className="modern-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ background: info.color }}>
                                        <th style={{ color: 'white', padding: '10px 8px', textAlign: 'center', width: '35px', fontWeight: 700 }}>No</th>
                                        <th style={{ color: 'white', padding: '10px 8px', fontWeight: 700 }} colSpan="3">Lapisan Penghasilan Bruto (Rp)</th>
                                        <th style={{ color: 'white', padding: '10px 8px', textAlign: 'center', fontWeight: 700, width: '60px' }}>{info.title}</th>
                                        <th style={{ color: 'white', padding: '10px 4px', textAlign: 'center', width: '30px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leftCol.map((pph, idx) => (
                                        <tr key={pph.id} style={{ background: idx % 2 === 0 ? '#fafbfc' : 'white' }}>
                                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8', padding: '8px 6px' }}>{idx + 1}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {idx === 0 && parseFloat(pph.min) === 0 ? '' : formatRp(pph.min)}
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 2px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                                {idx === 0 && parseFloat(pph.min) === 0 ? 'sampai dengan' :
                                                    parseFloat(pph.max) === 0 ? 'lebih' : 's.d.'}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {parseFloat(pph.max) === 0 ? '' : formatRp(pph.max)}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, color: info.color, padding: '8px 4px' }}>
                                                {parseFloat(pph.tarif).toFixed(2)}%
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '8px 2px' }}>
                                                <button className="btn-icon-modern edit" onClick={() => handleOpenModal(pph)} style={{ width: 24, height: 24, fontSize: '0.7rem' }}>✏️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* KOLOM KANAN */}
                        <div className="table-container-modern" style={{ overflow: 'hidden' }}>
                            <table className="modern-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ background: info.color }}>
                                        <th style={{ color: 'white', padding: '10px 8px', textAlign: 'center', width: '35px', fontWeight: 700 }}>No</th>
                                        <th style={{ color: 'white', padding: '10px 8px', fontWeight: 700 }} colSpan="3">Lapisan Penghasilan Bruto (Rp)</th>
                                        <th style={{ color: 'white', padding: '10px 8px', textAlign: 'center', fontWeight: 700, width: '60px' }}>{info.title}</th>
                                        <th style={{ color: 'white', padding: '10px 4px', textAlign: 'center', width: '30px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rightCol.map((pph, idx) => {
                                        const globalIdx = halfLen + idx;
                                        const isLast = parseFloat(pph.max) === 0;
                                        return (
                                            <tr key={pph.id} style={{ background: idx % 2 === 0 ? '#fafbfc' : 'white' }}>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8', padding: '8px 6px' }}>{globalIdx + 1}</td>
                                                <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {isLast ? '' : formatRp(pph.min)}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '8px 2px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                                    {isLast ? 'lebih dari' : 's.d.'}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {isLast ? formatRp(pph.min - 1) : formatRp(pph.max)}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: info.color, padding: '8px 4px' }}>
                                                    {parseFloat(pph.tarif).toFixed(2)}%
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '8px 2px' }}>
                                                    <button className="btn-icon-modern edit" onClick={() => handleOpenModal(pph)} style={{ width: 24, height: 24, fontSize: '0.7rem' }}>✏️</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* FOOTER INFO */}
                <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        📊 Menampilkan <strong>{filteredList.length}</strong> lapisan tarif {info.title}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Sumber: www.pajak.go.id
                    </span>
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern">
                            <div className="modal-header-modern">
                                <h3>{isEdit ? '✏️ Edit PPH TER' : '➕ Tambah PPH TER Baru'}</h3>
                                <button onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <div style={{ padding: 20 }}>
                                <form onSubmit={handleSave}>
                                    <div className="form-group">
                                        <label>Kategori TER *</label>
                                        <select
                                            value={formData.kategori}
                                            onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            <option value="A">TER A — TK/0, TK/1, K/0</option>
                                            <option value="B">TER B — TK/2, TK/3, K/1, K/2</option>
                                            <option value="C">TER C — K/3</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                        <div className="form-group">
                                            <label>Penghasilan Minimum (Rp) *</label>
                                            <input
                                                type="number"
                                                value={formData.min}
                                                onChange={e => setFormData({ ...formData, min: Number(e.target.value || 0) })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Penghasilan Maximum (Rp) *</label>
                                            <input
                                                type="number"
                                                value={formData.max}
                                                onChange={e => setFormData({ ...formData, max: Number(e.target.value || 0) })}
                                                required
                                            />
                                            <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Isi 0 untuk baris terakhir (lebih dari)</small>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Tarif Pajak (%) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tarif}
                                            onChange={e => setFormData({ ...formData, tarif: Number(e.target.value || 0) })}
                                            required
                                        />
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
                .main-content { flex: 1; padding: 25px; overflow-y: auto; }
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                .btn-modern { padding: 10px 16px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-modern:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
                .btn-icon-modern { width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; transition: all 0.15s; }
                .edit { background: #eff6ff; color: #3b82f6; }
                .edit:hover { background: #dbeafe; }
                .table-container-modern { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #e2e8f0; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { padding: 10px 8px; text-align: left; font-size: 0.8rem; }
                .modern-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
                .modern-table tr:hover { background: #f0f9ff !important; }
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 100; }
                .modal-content-modern { background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s; width: 500px; }
                .modal-header-modern { background: #f8fafc; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .modal-header-modern h3 { margin: 0; color: #1e293b; font-size: 1.1rem; }
                .modal-header-modern button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 5px; }
                .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box; }
                .form-group input:focus, .form-group select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 10px; }
                .btn-save { background: linear-gradient(135deg,#4f46e5,#3b82f6); color:white; padding:10px 16px; border-radius:8px; border:none; font-weight:700; cursor:pointer; }
                .btn-save:hover { box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
                .btn-cancel { background:#f1f5f9; padding:10px 16px; border-radius:8px; border:none; cursor:pointer; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
};

export default PPHTer;
