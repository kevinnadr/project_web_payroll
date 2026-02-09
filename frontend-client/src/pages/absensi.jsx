import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css';

const Absensi = () => {
    const [user, setUser] = useState(null);
    const [listAbsensi, setListAbsensi] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));
    
    // Ref untuk input file import
    const fileInputRef = useRef(null);

    // State untuk Modal Edit
    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState({
        pegawai_id: '', nama_lengkap: '', hadir: 0, sakit: 0, izin: 0, alpha: 0
    });

    const navigate = useNavigate();

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
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // --- FUNGSI FORMAT & TEMPLATE ---
    const handleShowFormat = () => {
        alert("FORMAT IMPORT CSV:\n1. Kolom harus berurutan: NIK, Nama, Hadir, Sakit, Izin, Alpha\n2. Gunakan pemisah koma (,)\n3. Pastikan NIK sesuai dengan data di sistem.");
    };

    const handleDownloadTemplate = () => {
        const header = "NIK,Nama,Hadir,Sakit,Izin,Alpha\n";
        const rows = listAbsensi.map(p => `${p.nik},${p.nama_lengkap},0,0,0,0`).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Template_Absensi_${bulanFilter}.csv`;
        a.click();
    };

    // --- FUNGSI IMPORT ---
    const handleImportClick = () => fileInputRef.current.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split("\n").slice(1); // Lewati header
            
            setLoading(true);
            try {
                // Proses baris demi baris (sederhana)
                for (let row of rows) {
                    const cols = row.split(",");
                    if (cols.length >= 6) {
                        const nik = cols[0].trim();
                        // Cari ID pegawai berdasarkan NIK di list
                        const p = listAbsensi.find(item => item.nik === nik);
                        if (p) {
                            await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/save.php`, {
                                pegawai_id: p.pegawai_id,
                                bulan: bulanFilter,
                                hadir: cols[2], sakit: cols[3], izin: cols[4], alpha: cols[5]
                            });
                        }
                    }
                }
                alert("Import Berhasil!");
                fetchData();
            } catch (err) {
                alert("Terjadi kesalahan saat import.");
            } finally {
                setLoading(false);
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    };

    const handleSaveAbsensi = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`http://localhost/project_web_payroll/backend-api/modules/absensi/save.php`, {
                ...editData, bulan: bulanFilter
            });
            setShowModal(false);
            fetchData();
        } catch (e) { alert("Gagal simpan."); }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredList(listAbsensi.filter(item => 
            (item.nama_lengkap?.toLowerCase().includes(lower)) || (item.nik?.includes(lower))
        ));
    }, [searchTerm, listAbsensi]);

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Data Kehadiran</h1>
                        <p className="modern-subtitle">Kelola absensi pegawai periode <b>{bulanFilter}</b></p>
                    </div>
                    <div className="periode-wrapper">
                        <input type="month" className="input-month-modern" value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} />
                    </div>
                </div>

                <div className="absensi-card-top-modern">
                    <div className="top-toolbar">
                        <div className="search-box-modern">
                            <span>🔍</span>
                            <input type="text" placeholder="Cari Pegawai..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="action-group">
                            <button className="btn-action-outline" onClick={handleShowFormat}>ℹ️ Format</button>
                            <button className="btn-action-outline" onClick={handleDownloadTemplate}>📄 Template</button>
                            <button className="btn-action-danger">📥 Export</button>
                            
                            {/* Input File Tersembunyi */}
                            <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".csv" onChange={handleFileChange} />
                            <button className="btn-action-primary" onClick={handleImportClick}>📁 Import CSV</button>
                        </div>
                    </div>
                </div>

                <div className="table-card-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Pegawai</th>
                                <th className="text-center">Hadir</th>
                                <th className="text-center">Sakit</th>
                                <th className="text-center">Izin</th>
                                <th className="text-center">Alpha</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center-padding">⏳ Memproses data...</td></tr>
                            ) : filteredList.map((row) => (
                                <tr key={row.pegawai_id}>
                                    <td>
                                        <div className="user-flex">
                                            <div className="avatar-small">{row.nama_lengkap.charAt(0)}</div>
                                            <div>
                                                <div className="u-name">{row.nama_lengkap}</div>
                                                <div className="u-nik">{row.nik}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center font-bold text-success">{row.hadir}</td>
                                    <td className="text-center">{row.sakit}</td>
                                    <td className="text-center">{row.izin}</td>
                                    <td className="text-center text-danger font-bold">{row.alpha}</td>
                                    <td className="text-center">
                                        <button className="btn-edit-circle" onClick={() => {
                                            setEditData({...row});
                                            setShowModal(true);
                                        }}>✏️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal Edit (Gunakan style modal yang sudah ada di App.css) */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content-fixed" style={{maxWidth:'400px'}}>
                        <div className="modal-header-modern">
                            <h3>Edit Absen: {editData.nama_lengkap}</h3>
                            <button className="btn-close-x" onClick={()=>setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveAbsensi}>
                            <div className="modal-body-scrollable">
                                <div className="form-group-modern">
                                    <label>Hadir</label>
                                    <input type="number" className="input-hero-salary" value={editData.hadir} onChange={e=>setEditData({...editData, hadir: e.target.value})} />
                                </div>
                                <div className="form-group-modern">
                                    <label>Sakit</label>
                                    <input type="number" className="input-hero-salary" value={editData.sakit} onChange={e=>setEditData({...editData, sakit: e.target.value})} />
                                </div>
                                <div className="form-group-modern">
                                    <label>Izin</label>
                                    <input type="number" className="input-hero-salary" value={editData.izin} onChange={e=>setEditData({...editData, izin: e.target.value})} />
                                </div>
                                <div className="form-group-modern">
                                    <label>Alpha</label>
                                    <input type="number" className="input-hero-salary" value={editData.alpha} onChange={e=>setEditData({...editData, alpha: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer-sticky">
                                <button type="button" className="btn-batal" onClick={()=>setShowModal(false)}>Batal</button>
                                <button type="submit" className="btn-simpan-full">Update Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .absensi-card-top-modern { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
                .top-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
                .search-box-modern { display: flex; align-items: center; background: #f1f5f9; padding: 10px 15px; border-radius: 12px; flex: 1; max-width: 400px; }
                .search-box-modern input { border: none; background: transparent; outline: none; margin-left: 10px; width: 100%; font-size: 14px; }
                .action-group { display: flex; gap: 8px; }
                .btn-action-outline { padding: 10px 15px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-weight: 700; font-size: 13px; cursor: pointer; transition: 0.2s; }
                .btn-action-danger { padding: 10px 15px; border-radius: 10px; border: none; background: #fee2e2; color: #b91c1c; font-weight: 700; font-size: 13px; cursor: pointer; }
                .btn-action-primary { padding: 10px 20px; border-radius: 10px; border: none; background: #4f46e5; color: white; font-weight: 700; font-size: 13px; cursor: pointer; }
                
                .user-flex { display: flex; align-items: center; gap: 12px; }
                .avatar-small { width: 35px; height: 35px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
                .u-name { font-weight: 700; color: #1e293b; font-size: 14px; }
                .u-nik { font-size: 12px; color: #64748b; }
                .btn-edit-circle { width: 32px; height: 32px; border-radius: 50%; border: none; background: #f1f5f9; cursor: pointer; transition: 0.2s; }
                .btn-edit-circle:hover { background: #e2e8f0; transform: scale(1.1); }
            `}</style>
        </div>
    );
};

export default Absensi;