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
        A: { title: 'TER A', ptkp: 'PTKP : TK/0 (54 juta); TK/1 & K/0 (58,5 juta)', color: '#3b82f6', bg: '#eff6ff' },
        B: { title: 'TER B', ptkp: 'PTKP : TK/2 & K/1 (63 juta); TK/3 & K/2 (67,5 juta)', color: '#8b5cf6', bg: '#f5f3ff' },
        C: { title: 'TER C', ptkp: 'PTKP : K/3 (72 juta)', color: '#059669', bg: '#ecfdf5' },
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

    // Helper for formatting currency
    const formatRp = (n) => {
        const val = parseFloat(n);
        if (isNaN(val) || val === 0) return '-';
        return new Intl.NumberFormat('id-ID').format(val);
    };

    const filteredList = pphList.filter(p => p.kategori === activeTab);

    // Split data into 2 columns for display
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
                        <p className="modern-subtitle">Tarif Efektif Rata-rata PPh 21 — Update Terakhir 2024</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-modern-primary">
                        <span>➕ Tambah Tarif</span>
                    </button>
                </div>

                {/* MAIN CARD CONTAINER */}
                <div className="content-card">
                    {/* TOP CONTROL BAR: TABS & INFO */}
                    <div className="control-bar">
                        <div className="tab-container">
                            {Object.entries(terInfo).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                                    style={{
                                        '--active-color': val.color,
                                        '--active-bg': val.bg
                                    }}
                                >
                                    {val.title}
                                </button>
                            ))}
                        </div>

                        <div className="info-badge" style={{ borderColor: info.color, background: info.bg }}>
                            <span className="info-icon" style={{ background: info.color }}>ℹ️</span>
                            <div className="info-text">
                                <strong>{info.ptkp}</strong>
                                <small>Total {filteredList.length} lapisan penghasilan</small>
                            </div>
                        </div>
                    </div>

                    {/* TABLE LAYOUT */}
                    <div className="table-layout-wrapper">
                        {loading ? (
                            <div className="loading-state">⏳ Sedang memuat data...</div>
                        ) : filteredList.length === 0 ? (
                            <div className="empty-state">📭 Belum ada data untuk kategori ini</div>
                        ) : (
                            <div className="split-table-container">
                                {/* KOLOM KIRI */}
                                <div className="table-column">
                                    <TableContent
                                        data={leftCol}
                                        info={info}
                                        onEdit={handleOpenModal}
                                        startIndex={0}
                                        formatRp={formatRp}
                                        colType="left"
                                    />
                                </div>
                                {/* KOLOM KANAN */}
                                <div className="table-column">
                                    <TableContent
                                        data={rightCol}
                                        info={info}
                                        onEdit={handleOpenModal}
                                        startIndex={halfLen}
                                        formatRp={formatRp}
                                        colType="right"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="footer-credits">
                    <span>Sumber Data: Direktorat Jenderal Pajak (www.pajak.go.id)</span>
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern">
                            <div className="modal-header-modern">
                                <h3>{isEdit ? '✏️ Edit Tarif PPH TER' : '➕ Tambah Tarif Baru'}</h3>
                                <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
                            </div>
                            <form onSubmit={handleSave} className="modal-body-modern">
                                <div className="form-group">
                                    <label>Kategori TER</label>
                                    <select
                                        value={formData.kategori}
                                        onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                                        required
                                        className="modern-input"
                                    >
                                        <option value="">-- Pilih Kategori --</option>
                                        <option value="A">TER A (TK/0, TK/1, K/0)</option>
                                        <option value="B">TER B (TK/2, TK/3, K/1, K/2)</option>
                                        <option value="C">TER C (K/3)</option>
                                    </select>
                                </div>
                                <div className="grid-2-col">
                                    <div className="form-group">
                                        <label>Min. Penghasilan (Rp)</label>
                                        <input
                                            type="number"
                                            value={formData.min}
                                            onChange={e => setFormData({ ...formData, min: Number(e.target.value || 0) })}
                                            required
                                            className="modern-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Max. Penghasilan (Rp)</label>
                                        <input
                                            type="number"
                                            value={formData.max}
                                            onChange={e => setFormData({ ...formData, max: Number(e.target.value || 0) })}
                                            required
                                            className="modern-input"
                                        />
                                        <span className="helper-text">Isi 0 untuk "lebih dari"</span>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Tarif Pajak (%)</label>
                                    <div className="input-suffix">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tarif}
                                            onChange={e => setFormData({ ...formData, tarif: Number(e.target.value || 0) })}
                                            required
                                            className="modern-input"
                                        />
                                        <span className="suffix">%</span>
                                    </div>
                                </div>
                                <div className="modal-footer-modern">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">Simpan Perubahan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                /* Layout & Typography */
                .app-layout { display: flex; min-height: 100vh; background: #f1f5f9; font-family: 'Inter', system-ui, sans-serif; }
                .main-content { flex: 1; padding: 24px 32px; overflow-y: auto; margin-left: 260px; width: calc(100% - 260px); }
                .page-header-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
                .modern-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
                .modern-subtitle { color: #64748b; margin: 4px 0 0; font-size: 0.9rem; font-weight: 500; }
                
                /* Buttons */
                .btn-modern-primary { 
                    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); 
                    color: white; 
                    padding: 10px 20px; 
                    border-radius: 10px; 
                    border: none; 
                    font-weight: 600; 
                    font-size: 0.9rem;
                    cursor: pointer; 
                    transition: all 0.2s; 
                    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); 
                    display: flex; align-items: center; gap: 8px;
                }
                .btn-modern-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }
                
                /* Card & Control Bar */
                .content-card { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; overflow: hidden; }
                
                .control-bar { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 16px 24px; 
                    border-bottom: 1px solid #f1f5f9;
                    background: #fff;
                }
                
                /* Tabs */
                .tab-container { display: flex; gap: 6px; background: #f8fafc; padding: 4px; border-radius: 10px; border: 1px solid #e2e8f0; }
                .tab-btn {
                    padding: 8px 20px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.85rem;
                    color: #64748b;
                    background: transparent;
                    transition: all 0.2s ease;
                }
                .tab-btn:hover { color: #334155; background: #f1f5f9; }
                .tab-btn.active {
                    background: var(--active-color);
                    color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                /* Info Badge */
                .info-badge {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 16px;
                    border-radius: 10px;
                    border: 1px solid transparent;
                }
                .info-icon {
                    width: 24px; height: 24px;
                    border-radius: 50%;
                    color: white;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.75rem;
                }
                .info-text { display: flex; flex-direction: column; line-height: 1.2; }
                .info-text strong { font-size: 0.85rem; color: #1e293b; }
                .info-text small { font-size: 0.75rem; color: #64748b; }

                /* Table Layout */
                .table-layout-wrapper { padding: 0; }
                .split-table-container { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 1px; 
                    background: #e2e8f0; /* Helper for gap appearance */
                }
                .table-column { background: white; }
                
                .modern-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .modern-table thead tr { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
                .modern-table th { 
                    padding: 10px 12px; 
                    text-align: left; 
                    font-weight: 700; 
                    color: #475569; 
                    text-transform: uppercase; 
                    font-size: 0.75rem;
                    letter-spacing: 0.5px;
                }
                .text-right { text-align: right !important; }
                .text-center { text-align: center !important; }
                
                .modern-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
                .modern-table tbody tr:last-child { border-bottom: none; }
                .modern-table tbody tr:hover { background: #f8fafc; }
                .modern-table td { padding: 6px 12px; color: #334155; vertical-align: middle; }
                .font-mono { font-family: 'JetBrains Mono', 'Menlo', 'Consolas', monospace; font-size: 0.82rem; color: #0f172a; letter-spacing: -0.5px; }

                /* Specific column widths to reduce gaps */
                .col-no { width: 40px; text-align: center; }
                .col-money { width: 120px; text-align: right; white-space: nowrap; }
                .col-mid { width: 40px; text-align: center; font-size: 0.75rem; color: #64748b; }
                .col-tarif { width: 80px; text-align: center; }
                .col-action { width: 40px; text-align: center; }
                
                .tarif-badge { 
                    display: inline-block; 
                    padding: 2px 8px; 
                    border-radius: 6px; 
                    background: #f0f9ff; 
                    color: #0369a1; 
                    font-weight: 700; 
                    font-size: 0.8rem; 
                }
                
                /* Action Button */
                .btn-icon-xs {
                    width: 28px; height: 28px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #64748b;
                    cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                    font-size: 0.8rem;
                }
                .btn-icon-xs:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }

                /* Footer */
                .footer-credits { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 0.8rem; }
                
                /* Modal Styles */
                .modal-backdrop { 
                    position: fixed; inset: 0; 
                    background: rgba(15, 23, 42, 0.4); 
                    backdrop-filter: blur(4px); 
                    display: flex; justify-content: center; align-items: center; 
                    z-index: 50; 
                    animation: fadeIn 0.2s;
                }
                .modal-content-modern { 
                    background: white; 
                    border-radius: 16px; 
                    width: 100%; max-width: 480px; 
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
                    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header-modern { 
                    padding: 20px 24px; 
                    border-bottom: 1px solid #f1f5f9; 
                    display: flex; justify-content: space-between; align-items: center; 
                }
                .modal-header-modern h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
                .close-btn { background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; }
                .close-btn:hover { color: #ef4444; }
                
                .modal-body-modern { padding: 24px; }
                .form-group { margin-bottom: 20px; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #334155; margin-bottom: 8px; }
                .modern-input { 
                    width: 100%; 
                    padding: 10px 12px; 
                    border: 1px solid #cbd5e1; 
                    border-radius: 8px; 
                    font-size: 0.95rem; 
                    transition: all 0.2s;
                    outline: none;
                }
                .modern-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
                .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .helper-text { font-size: 0.75rem; color: #64748b; margin-top: 4px; display: block; }
                
                .input-suffix { position: relative; }
                .input-suffix .suffix { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 500; }
                
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
                .btn-save { background: #0f172a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .btn-save:hover { background: #1e293b; }
                .btn-cancel { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
                .btn-cancel:hover { background: #f8fafc; }

                .loading-state, .empty-state { padding: 48px; text-align: center; color: #64748b; font-style: italic; }

                /* Animations */
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

// Subcomponent for cleaner code
const TableContent = ({ data, info, onEdit, startIndex, formatRp, colType }) => {
    return (
        <table className="modern-table">
            <thead>
                <tr>
                    <th className="col-no">No</th>
                    <th colSpan="3" style={{ paddingLeft: 16 }}>Lapisan Penghasilan Bruto (Rp)</th>
                    <th className="col-tarif">Tarif %</th>
                    <th className="col-action"></th>
                </tr>
            </thead>
            <tbody>
                {data.map((pph, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const isLast = parseFloat(pph.max) === 0;

                    let displayMin, displayMid, displayMax;

                    if (colType === 'left' && idx === 0 && parseFloat(pph.min) === 0) {
                        // Case: First row is 0
                        displayMin = '';
                        displayMid = 'sampai dengan';
                        displayMax = formatRp(pph.max);
                    } else if (isLast) {
                        // Case: Last row > X
                        displayMin = '';
                        displayMid = 'lebih dari';
                        displayMax = formatRp(pph.min);
                        // Note: If max is 0, logic says it's > min. 
                        // Previous code logic was: max=0 means use min-1? 
                        // Re-reading logic: min=X, max=0 (means > X). 
                        // The table should show: "" "lebih dari" "X"
                        // So I will put X in the 3rd column.
                    } else {
                        // Normal case: X s.d. Y
                        displayMin = formatRp(pph.min);
                        displayMid = 's.d.';
                        displayMax = formatRp(pph.max);
                    }

                    return (
                        <tr key={pph.id}>
                            <td className="col-no" style={{ color: '#94a3b8', fontWeight: 600 }}>{globalIdx}</td>
                            <td className="col-money font-mono">{displayMin}</td>
                            <td className="col-mid">{displayMid}</td>
                            <td className="col-money font-mono">{displayMax}</td>
                            <td className="col-tarif">
                                <span className="tarif-badge" style={{ color: info.color, background: info.color + '15' }}>
                                    {parseFloat(pph.tarif).toFixed(2)}%
                                </span>
                            </td>
                            <td className="col-action">
                                <button className="btn-icon-xs" onClick={() => onEdit(pph)}>✏️</button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default PPHTer;
