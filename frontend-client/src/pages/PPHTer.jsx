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
        A: { title: 'TER A', ptkp: 'PTKP : TK/0 (54 juta); TK/1 & K/0 (58,5 juta)', color: '#3b82f6', bg: '#eff6ff', accent: 'from-blue-500 to-cyan-500' },
        B: { title: 'TER B', ptkp: 'PTKP : TK/2 & K/1 (63 juta); TK/3 & K/2 (67,5 juta)', color: '#8b5cf6', bg: '#f5f3ff', accent: 'from-purple-500 to-indigo-500' },
        C: { title: 'TER C', ptkp: 'PTKP : K/3 (72 juta)', color: '#059669', bg: '#ecfdf5', accent: 'from-emerald-500 to-teal-500' },
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
            const msg = e.response?.data?.message || e.message;
            alert('❌ Error: ' + msg);
        }
    };

    // Helper for formatting currency
    const formatRp = (n) => {
        const val = parseFloat(n);
        if (isNaN(val) || val === 0) return '0';
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
                <header className="page-header">
                    <div className="header-content">
                        <div className="header-icon">📊</div>
                        <div>
                            <h1 className="header-title">Manajemen PPH TER</h1>
                            <p className="header-subtitle">Tarif Efektif Rata-rata PPh 21 — Permenkeu No. 168 Tahun 2023</p>
                        </div>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-primary-gradient">
                        <span className="btn-icon">+</span>
                        <span>Tambah Tarif</span>
                    </button>
                </header>

                {/* MAIN CARD CONTAINER */}
                <div className="premium-card">
                    {/* TOP CONTROL BAR: TABS & INFO */}
                    <div className="control-bar">
                        <div className="tab-pills">
                            {Object.entries(terInfo).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`tab-pill ${activeTab === key ? 'active' : ''}`}
                                    style={{
                                        '--accent-color': val.color,
                                    }}
                                >
                                    <span className="pill-dot" style={{ background: val.color }}></span>
                                    {val.title}
                                </button>
                            ))}
                        </div>

                        <div className="info-banner" style={{ background: `linear-gradient(to right, ${info.bg}, white)`, borderLeftColor: info.color }}>
                            <div className="info-icon-circle" style={{ background: info.color }}>i</div>
                            <div className="info-content">
                                <strong style={{ color: info.color }}>{info.ptkp}</strong>
                                <span>Total {filteredList.length} lapisan penghasilan untuk kategori ini.</span>
                            </div>
                        </div>
                    </div>

                    {/* TABLE LAYOUT */}
                    <div className="table-wrapper">
                        {loading ? (
                            <div className="state-message">
                                <div className="spinner"></div>
                                <p>Sedang memuat data...</p>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="state-message">
                                <div className="empty-icon">📂</div>
                                <p>Belum ada data tarif untuk kategori ini.</p>
                            </div>
                        ) : (
                            <div className="columns-container">
                                {/* KOLOM KIRI */}
                                <div className="data-column">
                                    <TableContent
                                        data={leftCol}
                                        info={info}
                                        onEdit={handleOpenModal}
                                        onDelete={handleDelete}
                                        startIndex={0}
                                        formatRp={formatRp}
                                        colType="left"
                                    />
                                </div>
                                {/* KOLOM KANAN */}
                                <div className="data-column">
                                    <TableContent
                                        data={rightCol}
                                        info={info}
                                        onEdit={handleOpenModal}
                                        onDelete={handleDelete}
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
                    <p>Data mengacu pada Peraturan Pemerintah terbaru mengenai Tarif Pemotongan PPh 21.</p>
                    <a href="https://pajak.go.id" target="_blank" rel="noreferrer">www.pajak.go.id</a>
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-card">
                            <div className="modal-header">
                                <h3>{isEdit ? 'Edit Tarif' : 'Tambah Tarif Baru'}</h3>
                                <button onClick={() => setShowModal(false)} className="close-btn">×</button>
                            </div>
                            <form onSubmit={handleSave} className="modal-form">
                                <div className="form-section">
                                    <label>Kategori TER</label>
                                    <select
                                        value={formData.kategori}
                                        onChange={e => setFormData({ ...formData, kategori: e.target.value })}
                                        required
                                        className="premium-input"
                                    >
                                        <option value="">Pilih Kategori</option>
                                        <option value="A">TER A</option>
                                        <option value="B">TER B</option>
                                        <option value="C">TER C</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-section">
                                        <label>Penghasilan Min (Rp)</label>
                                        <input
                                            type="number"
                                            value={formData.min}
                                            onChange={e => setFormData({ ...formData, min: Number(e.target.value || 0) })}
                                            required
                                            className="premium-input"
                                        />
                                    </div>
                                    <div className="form-section">
                                        <label>Penghasilan Max (Rp)</label>
                                        <input
                                            type="number"
                                            value={formData.max}
                                            onChange={e => setFormData({ ...formData, max: Number(e.target.value || 0) })}
                                            required
                                            className="premium-input"
                                        />
                                        <span className="input-hint">Isi 0 jika tidak terhingga</span>
                                    </div>
                                </div>
                                <div className="form-section">
                                    <label>Tarif Pajak (%)</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tarif}
                                            onChange={e => setFormData({ ...formData, tarif: Number(e.target.value || 0) })}
                                            required
                                            className="premium-input"
                                        />
                                        <span className="addon">%</span>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                                    <button type="submit" className="btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                /* CORE LAYOUT */
                .app-layout { display: flex; min-height: 100vh; background: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; }
                .main-content { flex: 1; margin-left: 260px; padding: 40px; }
                
                /* HEADER */
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .header-content { display: flex; align-items: center; gap: 16px; }
                .header-icon { 
                    width: 48px; height: 48px; 
                    background: linear-gradient(135deg, #3b82f6, #2563eb); 
                    color: white; 
                    border-radius: 12px; 
                    display: flex; align-items: center; justify-content: center; 
                    font-size: 24px; 
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                }
                .header-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
                .header-subtitle { font-size: 14px; color: #64748b; margin: 4px 0 0; }

                /* BUTTONS */
                .btn-primary-gradient {
                    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    display: flex; align-items: center; gap: 8px;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 6px rgba(15, 23, 42, 0.1);
                }
                .btn-primary-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 12px rgba(15, 23, 42, 0.15); }

                /* CARD */
                .premium-card {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 20px 40px -20px rgba(0,0,0,0.05);
                    border: 1px solid #f1f5f9;
                    overflow: hidden;
                }

                /* TABS & CONTROLS */
                .control-bar {
                    padding: 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #ffffff;
                }
                .tab-pills { display: flex; gap: 8px; background: #f1f5f9; padding: 6px; border-radius: 12px; }
                .tab-pill {
                    border: none;
                    background: transparent;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    display: flex; align-items: center; gap: 8px;
                    transition: all 0.2s;
                    font-size: 14px;
                }
                .pill-dot { width: 8px; height: 8px; border-radius: 50%; opacity: 0.5; }
                .tab-pill.active { background: white; color: #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .tab-pill.active .pill-dot { opacity: 1; }

                .info-banner {
                    display: flex; align-items: center; gap: 16px;
                    padding: 12px 20px;
                    border-radius: 12px;
                    border-left: 4px solid;
                    background: #f8fafc;
                }
                .info-icon-circle {
                    width: 24px; height: 24px; border-radius: 50%;
                    color: white; display: flex; align-items: center; justify-content: center;
                    font-weight: bold; font-size: 12px; font-family: serif;
                }
                .info-content { display: flex; flex-direction: column; }
                .info-content strong { font-size: 14px; }
                .info-content span { font-size: 12px; color: #64748b; }

                /* TABLE SECTION */
                .table-wrapper { padding: 0 32px 32px; background: transparent; }
                .columns-container { 
                    display: flex; 
                    width: 100%;
                    border-radius: 12px; 
                    overflow: hidden; 
                    border: 1px solid #e2e8f0; 
                    margin-top: 20px;
                }
                .data-column { 
                    flex: 1;
                    background: white; 
                }
                .data-column:first-child { border-right: 1px solid #e2e8f0; }

                .premium-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .premium-table th {
                    background: #f8fafc;
                    padding: 16px;
                    text-align: left;
                    font-size: 17px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .premium-table td {
                    padding: 14px 16px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    font-size: 20px;
                }
                .premium-table tr:last-child td { border-bottom: none; }
                .premium-table tr:hover td { background: #f8fafc; }

                .font-numeric { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #0f172a; }
                
                .tarif-tag {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-weight: 700;
                    font-size: 17px;
                }
                
                /* STATE MESSAGES */
                .state-message { padding: 60px; text-align: center; color: #94a3b8; }
                .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
                .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }

                /* MODAL */
                .modal-overlay {
                    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center; z-index: 100;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-card {
                    background: white; width: 100%; max-width: 500px;
                    border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header {
                    padding: 24px; border-bottom: 1px solid #f1f5f9;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .modal-header h3 { margin: 0; font-size: 18px; color: #0f172a; }
                .close-btn { font-size: 24px; background: none; border: none; color: #94a3b8; cursor: pointer; }
                
                .modal-form { padding: 24px; }
                .form-section { margin-bottom: 20px; }
                .form-section label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #334155; }
                .premium-input {
                    width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px;
                    font-size: 14px; transition: border 0.2s, box-shadow 0.2s;
                }
                .premium-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .input-hint { font-size: 12px; color: #64748b; margin-top: 4px; display: block; }
                
                .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
                .btn-secondary { background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; }
                .btn-primary { background: #0f172a; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; }

                /* FOOTER */
                .footer-credits { text-align: center; margin-top: 40px; color: #94a3b8; font-size: 13px; }
                .footer-credits a { color: #64748b; text-decoration: none; font-weight: 600; }

                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

const TableContent = ({ data, info, onEdit, onDelete, startIndex, formatRp, colType }) => {
    return (
        <table className="premium-table" style={{ width: '100%' }}>
            <colgroup>
                <col style={{ width: '50px' }} />   {/* No */}
                <col style={{ width: 'auto' }} />   {/* Min */}
                <col style={{ width: '40px' }} />   {/* s.d. */}
                <col style={{ width: 'auto' }} />   {/* Max */}
                <col style={{ width: '100px' }} />  {/* Tarif */}
                <col style={{ width: '80px' }} />   {/* Action */}
            </colgroup>
            <thead>
                <tr>
                    <th style={{ textAlign: 'center', padding: '12px 4px' }}>No</th>
                    <th colSpan="3" style={{ textAlign: 'center', padding: '12px 4px' }}>Lapisan Penghasilan Bruto</th>
                    <th style={{ textAlign: 'center', padding: '12px 4px' }}>Tarif</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {data.map((pph, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const isLast = parseFloat(pph.max) === 0;

                    let displayMin = formatRp(pph.min);
                    let displayMax = formatRp(pph.max);

                    let rowContent;
                    if (isLast) {
                        rowContent = (
                            <>
                                <td className="font-numeric" style={{ textAlign: 'right', paddingRight: '8px' }}>{displayMin}</td>
                                <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '15px', padding: 0 }}>ke atas</td>
                                <td className="font-numeric" style={{ paddingLeft: '8px' }}></td>
                            </>
                        );
                    } else if (parseFloat(pph.min) === 0 && colType === 'left' && idx === 0) {
                        rowContent = (
                            <>
                                <td className="font-numeric" style={{ textAlign: 'right', paddingRight: '8px' }}>0</td>
                                <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '15px', padding: 0 }}>s.d.</td>
                                <td className="font-numeric" style={{ textAlign: 'left', paddingLeft: '8px' }}>{displayMax}</td>
                            </>
                        );
                    } else {
                        rowContent = (
                            <>
                                <td className="font-numeric" style={{ textAlign: 'right', paddingRight: '8px' }}>{displayMin}</td>
                                <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '15px', padding: 0 }}>s.d.</td>
                                <td className="font-numeric" style={{ textAlign: 'left', paddingLeft: '8px' }}>{displayMax}</td>
                            </>
                        );
                    }

                    return (
                        <tr key={pph.id}>
                            <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>{globalIdx}</td>
                            {rowContent}
                            <td style={{ textAlign: 'center' }}>
                                <span className="tarif-tag" style={{ color: info.color, background: info.color + '15' }}>
                                    {parseFloat(pph.tarif).toFixed(2)}%
                                </span>
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                    onClick={() => onEdit(pph)}
                                    title="Edit"
                                    style={{
                                        border: 'none', background: 'transparent', cursor: 'pointer',
                                        fontSize: '18px', opacity: 0.7, padding: '4px', marginRight: '8px'
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => onDelete(pph.id)}
                                    title="Hapus"
                                    style={{
                                        border: 'none', background: 'transparent', cursor: 'pointer',
                                        fontSize: '18px', opacity: 0.7, padding: '4px'
                                    }}
                                >
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default PPHTer;
