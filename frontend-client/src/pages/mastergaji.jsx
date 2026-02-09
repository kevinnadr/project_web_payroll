import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import '../App.css';

const MasterGaji = () => {
    const [listGaji, setListGaji] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selectedData, setSelectedData] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => { fetchData(); }, [bulanFilter]);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/master_gaji/read_all.php`, {
                params: { bulan: bulanFilter }
            });
            if (res.data.status === 'success') {
                setListGaji(res.data.data);
                setFilteredList(res.data.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Fungsi simpan yang diperbaiki
    const handleSaveManual = async (e) => {
        e.preventDefault();
        if (!selectedData) return;

        try {
            const payload = {
                pegawai_id: selectedData.id,
                gaji_pokok: Number(selectedData.gaji_pokok || 0),
                tunjangan_jabatan: Number(selectedData.tunjangan_jabatan || 0),
                tunjangan_mode: selectedData.tunjangan_mode || 'perbulan',
                components: selectedData.components || [],
                ikut_bpjs_tk: selectedData.ikut_bpjs_tk === 1 ? 1 : 0,
                ikut_bpjs_ks: selectedData.ikut_bpjs_ks === 1 ? 1 : 0
            };

            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_gaji_full.php', payload);

            if (res.data.status === 'success') {
                alert("✅ " + res.data.message);
                setShowEdit(false);
                fetchData();
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (err) {
            alert("❌ Gagal menghubungi server: " + err.message);
        }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listGaji.filter(item => 
            (item.nama_lengkap || '').toLowerCase().includes(lower) || String(item.nik || '').toLowerCase().includes(lower)
        ));
    }, [searchTerm, listGaji]);

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
                        <h1 className="modern-title">Master Penggajian</h1>
                        <p className="modern-subtitle">Kelola komponen gaji per pegawai dan bulan.</p>
                    </div>
                    <div style={{display:'flex', gap:12, alignItems:'center'}}>
                        <input type="month" value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} style={{height:42, padding:8, borderRadius:10, border:'1px solid #e2e8f0'}} />
                        <button onClick={fetchData} className="btn-modern btn-outline">🔄 Refresh</button>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={() => window.open(`http://localhost/project_web_payroll/backend-api/modules/master_gaji/export_excel.php?bulan=${bulanFilter}`,'_blank')} className="btn-modern btn-outline">📥 Excel</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                                <tr>
                                <th>Pegawai</th>
                                    <th>Jabatan</th>
                                    <th>Tunj. Jabatan</th>
                                    <th>Gaji Pokok</th>
                                    <th>Komponen</th>
                                <th className="text-center">BPJS</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="text-center p-4">⏳ Memuat...</td></tr> : 
                                filteredList.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <div className="user-profile">
                                            <div className="avatar-circle">{(row.nama_lengkap||'').charAt(0)}</div>
                                            <div>
                                                <div className="user-name">{row.nama_lengkap}</div>
                                                <div className="user-nik">{row.nik}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{fontWeight:600}}>{row.jabatan || '-'}</td>
                                    <td style={{fontWeight:600}}>{formatRp(row.tunjangan_jabatan || 0)}</td>
                                    <td style={{fontWeight:'bold', color:'#10b981'}}>{formatRp(row.gaji_pokok)}</td>
                                    <td>
                                        {(row.list_komponen && row.list_komponen.length > 0) ? (
                                            row.list_komponen.map((c, i) => (
                                                <div key={i} style={{fontSize:'0.9rem', marginBottom:4}}>
                                                        <span style={{fontWeight:600}}>{c.nama || c.nama_komponen}</span>
                                                        <span style={{marginLeft:8, color:'#10b981', fontWeight:700}}>{formatRp(c.nominal || 0)}</span>
                                                        <small style={{marginLeft:8, color:'#64748b'}}>{(() => {
                                                            const raw = (c.tipe || c.tipe_hitungan || '').toString().toLowerCase();
                                                            return raw.indexOf('hari') !== -1 ? 'Per Hari' : 'Per Bulan';
                                                        })()}</small>
                                                    </div>
                                            ))
                                        ) : (<span style={{color:'#94a3b8'}}>-</span>)}
                                    </td>
                                    <td className="text-center">{row.ikut_bpjs_tk === 1 ? 'TK ' : ''}{row.ikut_bpjs_ks === 1 ? 'KS' : ''}</td>
                                    <td className="text-center">
                                        <button className="btn-icon-modern edit" onClick={() => {
                                            const mappedComponents = (row.list_komponen || []).map(c => {
                                                const raw = (c.tipe || c.tipe_hitungan || '').toString().toLowerCase();
                                                return {
                                                    nama: c.nama || c.nama_komponen || '',
                                                    nominal: Number(c.nominal || 0),
                                                    jenis: c.jenis || 'tunjangan',
                                                    tipe: raw.indexOf('hari') !== -1 ? 'perhari' : 'perbulan'
                                                };
                                            });
                                                                                        setSelectedData({
                                                                                            ...row,
                                                                                            gaji_pokok: Number(row.gaji_pokok || 0),
                                                                                            tunjangan_jabatan: Number(row.tunjangan_jabatan || 0),
                                                                                            components: mappedComponents,
                                                                                            tunjangan_mode: row.tunjangan_mode || 'perbulan',
                                                                                            ikut_bpjs_tk: row.ikut_bpjs_tk === 1 ? 1 : 0,
                                                                                            ikut_bpjs_ks: row.ikut_bpjs_ks === 1 ? 1 : 0,
                                                                                        });
                                            setShowEdit(true);
                                        }}>⚙️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showEdit && selectedData && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{width:560}}>
                            <div className="modal-header-modern">
                                <h3>⚙️ Edit Komponen Gaji: {selectedData.nama_lengkap}</h3>
                                <button onClick={()=>setShowEdit(false)}>✕</button>
                            </div>
                            <div style={{padding:20}}>
                                <form onSubmit={handleSaveManual}>
                                    <div className="form-grid-2">
                                        <div className="form-group"><label>Gaji Pokok</label><input type="number" value={selectedData.gaji_pokok} onChange={e => setSelectedData({...selectedData, gaji_pokok: Number(e.target.value||0)})} required /></div>
                                        <div className="form-group"><label>Tunj. Jabatan</label><input type="number" value={selectedData.tunjangan_jabatan} onChange={e => setSelectedData({...selectedData, tunjangan_jabatan: Number(e.target.value||0)})} /></div>
                                    </div>
                                    <div style={{marginTop:12}}>
                                        <label style={{display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:8}}>Tipe Tunjangan</label>
                                        <select value={selectedData.tunjangan_mode || 'perbulan'} onChange={e => setSelectedData({...selectedData, tunjangan_mode: e.target.value})} style={{width:160, padding:8, borderRadius:8, border:'1px solid #cbd5e1'}}>
                                            <option value="perbulan">Per Bulan</option>
                                            <option value="perhari">Per Hari</option>
                                        </select>
                                    </div>

                                    <div style={{marginTop:12}}>
                                        <label style={{display:'block', fontSize:12, fontWeight:700, color:'#475569', marginBottom:8}}>Komponen Tambahan</label>
                                        {(selectedData.components || []).map((comp, idx) => (
                                            <div key={idx} style={{display:'grid', gridTemplateColumns:'2fr 1fr 140px 80px', gap:8, marginBottom:8, alignItems:'center'}}>
                                                <input type="text" placeholder="Nama komponen (e.g. Uang Makan)" value={comp.nama} onChange={e => {
                                                    const arr = [...(selectedData.components||[])]; arr[idx] = {...arr[idx], nama: e.target.value}; setSelectedData({...selectedData, components: arr});
                                                }} />
                                                <input type="number" placeholder="Nominal" value={comp.nominal} onChange={e => {
                                                    const arr = [...(selectedData.components||[])]; arr[idx] = {...arr[idx], nominal: Number(e.target.value||0)}; setSelectedData({...selectedData, components: arr});
                                                }} />
                                                <select value={comp.tipe || 'perbulan'} onChange={e => {
                                                    const arr = [...(selectedData.components||[])]; arr[idx] = {...arr[idx], tipe: e.target.value}; setSelectedData({...selectedData, components: arr});
                                                }} style={{padding:8, borderRadius:8, border:'1px solid #cbd5e1'}}>
                                                    <option value="perbulan">Per Bulan</option>
                                                    <option value="perhari">Per Hari</option>
                                                </select>
                                                <button type="button" className="btn-cancel" onClick={() => {
                                                    const arr = [...(selectedData.components||[])]; arr.splice(idx,1); setSelectedData({...selectedData, components: arr});
                                                }}>Hapus</button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn-modern btn-gradient" style={{marginTop:8}} onClick={() => {
                                            const arr = [...(selectedData.components||[]) , { nama: '', nominal: 0, tipe: 'perbulan' }];
                                            setSelectedData({...selectedData, components: arr});
                                        }}>+ Tambah Komponen</button>
                                    </div>
                                    <div className="bpjs-wrapper" style={{marginTop:12}}>
                                        <label className="checkbox-label"><input type="checkbox" checked={selectedData.ikut_bpjs_tk === 1} onChange={e => setSelectedData({...selectedData, ikut_bpjs_tk: e.target.checked ? 1 : 0})} /> BPJS TK</label>
                                        <label className="checkbox-label"><input type="checkbox" checked={selectedData.ikut_bpjs_ks === 1} onChange={e => setSelectedData({...selectedData, ikut_bpjs_ks: e.target.checked ? 1 : 0})} /> BPJS KS</label>
                                    </div>
                                    <div className="modal-footer-modern" style={{marginTop:20}}>
                                        <button type="button" onClick={()=>setShowEdit(false)} className="btn-cancel">Batal</button>
                                        <button type="submit" className="btn-save">Simpan</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                /* Reuse styles from DataPegawai for consistent UI */
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                .toolbar-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .search-box { display: flex; align-items: center; background: white; padding: 0 15px; border-radius: 10px; border: 1px solid #e2e8f0; width: 320px; height: 42px; }
                .search-box input { border: none; outline: none; width: 100%; margin-left: 10px; }
                .toolbar-actions { display: flex; gap: 10px; }
                .btn-modern { padding: 8px 15px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; color: white; transition: 0.2s; }
                .btn-outline { background: white; border: 1px solid #cbd5e1; color: #475569; }
                .btn-gradient { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); }
                .table-container-modern { background: white; border-radius: 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #f1f5f9; }
                .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .modern-table th { background: #f8fafc; padding: 15px; text-align: left; font-weight: 600; color: #475569; font-size: 0.85rem; border-bottom: 1px solid #e2e8f0; }
                .modern-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.95rem; }
                .user-profile { display: flex; align-items: center; gap: 12px; }
                .avatar-circle { width: 38px; height: 38px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
                .user-name { font-weight: 600; color: #0f172a; }
                .user-nik { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
                .btn-icon-modern { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 5px; }
                .edit { background: #eff6ff; color: #3b82f6; }
                .delete { background: #fee2e2; color: #ef4444; }
                .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 5px; }
                .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; }
                .bpjs-wrapper { display: flex; gap: 20px; margin-top: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; }
                .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; }
                .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 100; }
                .modal-content-modern { background: white; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); overflow: hidden; animation: slideUp 0.3s; }
                .modal-header-modern { background: #f8fafc; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
                .modal-footer-modern { display: flex; justify-content: flex-end; gap: 10px; }
                .btn-save { background: linear-gradient(135deg,#4f46e5,#3b82f6); color:white; padding:10px 16px; border-radius:8px; border:none; font-weight:700; }
                .btn-cancel { background:#f1f5f9; padding:10px 16px; border-radius:8px; border:none; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
        </div>
    );
};

export default MasterGaji;
