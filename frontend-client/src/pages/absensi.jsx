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
    const [hariKerjaEfektif, setHariKerjaEfektif] = useState(20);

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // State Modal sesuai struktur database absensi
    const [showModal, setShowModal] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const [editData, setEditData] = useState({
        pegawai_id: '', nik: '', nama_lengkap: '',
        hadir: 0, sakit: 0, izin: 0, cuti: 0, hari_terlambat: 0, menit_terlambat: 0
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
        }
    }, [navigate, bulanFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/absensi/read.php?bulan=${bulanFilter}`);
            if (res.data.status === 'success') {
                setListAbsensi(res.data.data);
                setFilteredList(res.data.data);
                if (res.data.hari_efektif !== undefined) {
                    setHariKerjaEfektif(res.data.hari_efektif);
                }
            }
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
        if (x <= 0) return 0;
        // Aturan: 5rb flat per kejadian + 20rb per kelipatan 15 menit
        return (x * 5000) + (Math.ceil(m / 15) * 20000);
    };

    // --- FUNGSI EXPORT & TEMPLATE ---
    const handleDownloadTemplate = () => {
        const header = "NIK,Nama,Hadir,Sakit,Izin,Cuti,HariTerlambat,MenitTerlambat\n";
        const rows = listAbsensi.map(p => `${p.nik},${p.nama_lengkap},0,0,0,0,0,0`).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Template_Absensi_${bulanFilter}.csv`;
        a.click();
    };

    // --- FUNGSI IMPORT CSV ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split("\n").filter(r => r.trim() !== "");
            if (rows.length < 2) { alert('File kosong atau tidak ada data.'); e.target.value = null; return; }

            // parse header and normalize
            const header = rows[0].split(",").map(h => h.trim().toLowerCase());
            // acceptable mappings
            const mapHeaderToKey = (h) => {
                h = h.replace(/\s+/g, '_');
                if (['nik', 'id_karyawan'].includes(h)) return 'nik';
                if (['nama', 'name'].includes(h)) return 'nama_lengkap';
                if (['hadir', 'kehadiran'].includes(h)) return 'hadir';
                if (['sakit'].includes(h)) return 'sakit';
                if (['izin'].includes(h)) return 'izin';
                if (['cuti'].includes(h)) return 'cuti';
                if (['alpha', 'absen'].includes(h)) return 'alpha';
                if (['hariterlambat', 'hari_terlambat', 'telat_frekuensi', 'telat_x', 'telat_frequency'].includes(h)) return 'hari_terlambat';
                if (['menitterlambat', 'menit_terlambat', 'telat_menit', 'telat_m', 'telat_minutes'].includes(h)) return 'menit_terlambat';
                return null;
            };

            const headerMap = header.map(h => mapHeaderToKey(h));
            const required = ['nik', 'hadir', 'sakit', 'izin', 'cuti', 'hari_terlambat', 'menit_terlambat'];
            const missing = required.filter(rk => !headerMap.includes(rk));
            if (missing.length > 0) {
                alert('Header CSV tidak sesuai. Kolom yang hilang: ' + missing.join(', '));
                e.target.value = null; return;
            }

            const dataToImport = [];
            const errors = [];

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(",").map(c => c.trim());
                if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

                const rowObj = {};
                for (let c = 0; c < headerMap.length; c++) {
                    const key = headerMap[c];
                    if (!key) continue;
                    rowObj[key] = cols[c] !== undefined ? cols[c] : '';
                }

                const rowNum = i + 1;
                if (!rowObj.nik || rowObj.nik === '') { errors.push(`Baris ${rowNum}: kolom NIK kosong`); continue; }

                // validate numeric fields
                const numFields = ['hadir', 'sakit', 'izin', 'cuti', 'hari_terlambat', 'menit_terlambat'];
                let skip = false;
                for (const nf of numFields) {
                    const val = rowObj[nf] === undefined || rowObj[nf] === '' ? '0' : rowObj[nf];
                    if (isNaN(val)) { errors.push(`Baris ${rowNum}: kolom ${nf} harus angka`); skip = true; break; }
                    if (Number(val) < 0) { errors.push(`Baris ${rowNum}: kolom ${nf} tidak boleh negatif`); skip = true; break; }
                    rowObj[nf] = parseInt(Number(val));
                }
                if (skip) continue;

                // compute alpha if missing
                if (rowObj.alpha === undefined || rowObj.alpha === '') {
                    rowObj.alpha = Math.max(0, hariKerjaEfektif - (rowObj.hadir + rowObj.sakit + rowObj.izin + rowObj.cuti));
                } else {
                    rowObj.alpha = parseInt(Number(rowObj.alpha));
                }

                dataToImport.push(rowObj);
            }

            if (errors.length > 0) { alert('Validasi gagal:\n' + errors.join('\n')); e.target.value = null; return; }

            if (dataToImport.length > 0) {
                setLoading(true);
                try {
                    const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/import_excel.php`, {
                        bulan: bulanFilter, data: dataToImport, hari_efektif: hariKerjaEfektif
                    });
                    alert(res.data.message);
                    await fetchData();
                } catch (err) { alert("Gagal Import."); }
                finally { setLoading(false); e.target.value = null; }
            }
        };
        reader.readAsText(file);
    };

    const handleSaveAbsensi = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/save.php`, {
                ...editData, bulan: bulanFilter, hari_efektif: hariKerjaEfektif
            });
            if (res.data.status === 'success') {
                setShowModal(false);
                await fetchData(); // Update UI langsung
            } else { alert(res.data.message); }
        } catch (e) { alert("Gagal Simpan"); }
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content" style={{ background: '#f4f7fe', minHeight: '100vh' }}>

                <div className="page-header-modern" style={{ marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1b2559', margin: 0 }}>Input Absensi</h1>
                        <p style={{ color: '#a3aed0', fontWeight: '500' }}>Kelola kehadiran dan denda keterlambatan pegawai.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: '12px 20px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', gap: '12px', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1b2559' }}>Periode:</span>
                        <input type="month" value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} style={{ border: 'none', fontWeight: '600', color: '#1b2559', outline: 'none' }} />
                    </div>
                    <div style={{ background: 'white', padding: '12px 20px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', gap: '12px', boxShadow: '0px 4px 12px rgba(0,0,0,0.03)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1b2559' }}>📅 Hari Kerja Efektif:</span>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={hariKerjaEfektif}
                            onChange={(e) => setHariKerjaEfektif(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                            style={{
                                border: '2px solid #e0e5f2',
                                fontWeight: '700',
                                color: '#4318ff',
                                outline: 'none',
                                width: '60px',
                                textAlign: 'center',
                                padding: '6px 10px',
                                borderRadius: '10px',
                                fontSize: '1rem',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#4318ff'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e5f2'}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#a3aed0' }}>hari</span>
                    </div>
                </div>

                {/* --- CARD IMPORT EXPORT --- */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', boxShadow: '0px 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ background: '#fff9e6', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>📂</div>
                        <div>
                            <h4 style={{ margin: 0, color: '#1b2559', fontWeight: '700' }}>Import / Export Data</h4>
                            <p style={{ margin: 0, color: '#a3aed0', fontSize: '0.85rem' }}>Upload CSV untuk update massal kehadiran.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="btn-modern btn-outline" onClick={handleDownloadTemplate}>⬇️ Template CSV</button>
                        <button className="btn-modern btn-outline" onClick={() => setShowFormatModal(true)}>📋 Format</button>
                        <button className="btn-modern btn-outline" style={{ color: '#22c55e' }} onClick={() => window.open(`http://localhost/project_web_payroll/backend-api/modules/absensi/export_excel.php?bulan=${bulanFilter}`, '_blank')}>📊 Export Excel</button>
                        <button className="btn-modern btn-primary" style={{ background: '#4318ff' }} onClick={() => fileInputRef.current.click()}>⬆️ Import CSV</button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={handleFileChange} />
                    </div>
                </div>

                <div className="table-container-modern" style={{ background: 'white', borderRadius: '25px', padding: '10px 25px 25px', boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.02)' }}>
                    <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f4f7fe' }}>
                                <th style={{ textAlign: 'left', color: '#a3aed0', padding: '20px 10px' }}>Pegawai</th>
                                <th className="text-center" style={{ color: '#a3aed0' }}>Hadir</th>
                                <th className="text-center" style={{ color: '#a3aed0' }}>Sakit</th>
                                <th className="text-center" style={{ color: '#a3aed0' }}>Izin</th>
                                <th className="text-center" style={{ color: '#a3aed0' }}>Cuti</th>
                                <th className="text-center" style={{ color: '#22c55e' }}>Hari Efektif</th>
                                <th className="text-center" style={{ color: '#ee5d50' }}>Hari Terlambat</th>
                                <th className="text-center" style={{ color: '#ee5d50' }}>Menit Terlambat</th>
                                <th className="text-center" style={{ color: '#ee5d50' }}>Denda</th>
                                <th className="text-center" style={{ color: '#a3aed0' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && filteredList.map((row) => (
                                <tr key={row.pegawai_id} style={{ borderBottom: '1px solid #f4f7fe' }}>
                                    <td style={{ padding: '20px 10px' }}>
                                        <div className="user-profile">
                                            <div className="avatar-circle" style={{ background: '#f4f7fe', color: '#4318ff', fontWeight: '700' }}>{row.nama_lengkap?.charAt(0)}</div>
                                            <div><div className="user-name" style={{ color: '#1b2559', fontWeight: '700' }}>{row.nama_lengkap}</div><div className="user-nik" style={{ color: '#a3aed0', fontSize: '0.8rem' }}>{row.nik}</div></div>
                                        </div>
                                    </td>
                                    <td className="text-center"><div style={{ background: '#f4f7fe', padding: '8px 15px', borderRadius: '10px', fontWeight: '700', color: '#1b2559' }}>{row.hadir}</div></td>
                                    <td className="text-center"><div style={{ background: '#f4f7fe', padding: '8px 15px', borderRadius: '10px', fontWeight: '700', color: '#1b2559' }}>{row.sakit}</div></td>
                                    <td className="text-center"><div style={{ background: '#f4f7fe', padding: '8px 15px', borderRadius: '10px', fontWeight: '700', color: '#1b2559' }}>{row.izin}</div></td>
                                    <td className="text-center"><div style={{ background: '#f4f7fe', padding: '8px 15px', borderRadius: '10px', fontWeight: '700', color: '#1b2559' }}>{row.cuti}</div></td>
                                    <td className="text-center"><div style={{ background: '#f0fdf4', padding: '8px 15px', borderRadius: '10px', fontWeight: '700', color: '#22c55e' }}>{row.hari_efektif ?? hariKerjaEfektif}</div></td>
                                    <td className="text-center"><div style={{ color: row.hari_terlambat > 0 ? '#ee5d50' : '#1b2559', fontWeight: '800' }}>{row.hari_terlambat}</div></td>
                                    <td className="text-center"><span style={{ fontWeight: '700' }}>{row.menit_terlambat}</span></td>
                                    <td className="text-center" style={{ color: '#ee5d50', fontWeight: '800', fontSize: '0.85rem' }}>{row.hari_terlambat > 0 ? formatRp(calculateLatePenalty(row.hari_terlambat, row.menit_terlambat)) : '-'}</td>
                                    <td className="text-center">
                                        <button className="btn-icon-modern edit" onClick={() => { setEditData({ ...row }); setShowModal(true); }}>⚙️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL EDIT */}
            {showModal && (
                <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-content-modern" style={{ background: 'white', width: '450px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.1)' }}>
                        <div className="modal-header-modern" style={{ padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#1b2559', fontWeight: '800' }}>Update Kehadiran</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <form onSubmit={handleSaveAbsensi} style={{ padding: '20px 30px 30px' }}>
                            <div className="form-group-modern" style={{ marginBottom: '15px' }}><label>Hadir (Hari)</label><input type="number" value={editData.hadir} onChange={e => setEditData({ ...editData, hadir: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                <div className="form-group-modern"><label>Sakit</label><input type="number" value={editData.sakit} onChange={e => setEditData({ ...editData, sakit: e.target.value })} /></div>
                                <div className="form-group-modern"><label>Izin</label><input type="number" value={editData.izin} onChange={e => setEditData({ ...editData, izin: e.target.value })} /></div>
                                <div className="form-group-modern"><label>Cuti</label><input type="number" value={editData.cuti} onChange={e => setEditData({ ...editData, cuti: e.target.value })} /></div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '20px', marginBottom: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="form-group-modern"><label>Hari Terlambat</label><input type="number" value={editData.hari_terlambat} onChange={e => setEditData({ ...editData, hari_terlambat: e.target.value })} /></div>
                                    <div className="form-group-modern"><label>Menit Terlambat</label><input type="number" value={editData.menit_terlambat} onChange={e => setEditData({ ...editData, menit_terlambat: e.target.value })} /></div>
                                </div>
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#4318ff', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Update Data</button>
                        </form>
                    </div>
                </div>
            )}

            {showFormatModal && (
                <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="modal-content-modern" style={{ background: 'white', width: '850px', borderRadius: '30px', overflow: 'hidden', boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.1)', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div className="modal-header-modern" style={{ padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#1b2559', fontWeight: '800' }}>📋 Format Import Data Absensi</h3>
                            <button onClick={() => setShowFormatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <div style={{ padding: '25px' }}>
                            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '0.95rem' }}>Gunakan format CSV berikut untuk import data absensi. Pastikan semua kolom sesuai dengan urutan dan tipe data yang ditentukan:</p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                                    <thead>
                                        <tr style={{ background: '#4318ff', color: 'white' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem' }}>No</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem' }}>Kolom</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem' }}>Tipe Data</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '0.85rem' }}>Contoh</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { no: 1, col: 'NIK', tipe: 'Text (max 20)', contoh: '2024001' },
                                            { no: 2, col: 'Hadir', tipe: 'Angka (0-30)', contoh: '20' },
                                            { no: 3, col: 'Sakit', tipe: 'Angka (0-30)', contoh: '1' },
                                            { no: 4, col: 'Izin', tipe: 'Angka (0-30)', contoh: '0' },
                                            { no: 5, col: 'Cuti', tipe: 'Angka (0-30)', contoh: '0' },
                                            { no: 6, col: 'HariTerlambat', tipe: 'Angka (jumlah hari terlambat)', contoh: '2' },
                                            { no: 7, col: 'MenitTerlambat', tipe: 'Angka (total menit terlambat)', contoh: '45' },
                                        ].map((item) => (
                                            <tr key={item.no} style={{ borderBottom: '1px solid #f1f5f9', background: item.no % 2 === 0 ? '#f8fafc' : 'white' }}>
                                                <td style={{ padding: '12px', fontSize: '0.9rem' }}><strong>{item.no}</strong></td>
                                                <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: '600', color: '#4318ff' }}>{item.col}</td>
                                                <td style={{ padding: '12px', fontSize: '0.9rem', color: '#64748b' }}>{item.tipe}</td>
                                                <td style={{ padding: '12px', fontSize: '0.9rem', fontFamily: 'monospace', background: '#f1f5f9', borderRadius: '4px' }}>{item.contoh}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <p style={{ margin: '0', fontSize: '0.9rem', color: '#92400e' }}><strong>⚠️ Catatan:</strong> Kolom HariTerlambat adalah jumlah hari pegawai terlambat. MenitTerlambat adalah total menit keterlambatan. Jumlah hadir + sakit + izin + cuti harus = {hariKerjaEfektif} hari kerja (sesuai hari kerja efektif yang diatur).</p>
                            </div>
                            <button onClick={() => setShowFormatModal(false)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#4318ff', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Mengerti</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .form-group-modern input { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e0e5f2; outline: none; font-weight: 600; box-sizing: border-box; }
                .form-group-modern label { display: block; color: #1b2559; font-weight: 700; font-size: 0.8rem; margin-bottom: 5px; }
            `}</style>
        </div>
    );
};

export default Absensi;