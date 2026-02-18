import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const DataPegawai = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showImportResult, setShowImportResult] = useState(false);
    const [showFormatModal, setShowFormatModal] = useState(false);
    const fileInputRef = useRef(null);

    // Form and Modal State
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id_pegawai: '',
        nik: '',
        nama_lengkap: '',
        email: '',
        no_hp: '',
        npwp: '',
        foto_profil: null
    });

    const [previewImage, setPreviewImage] = useState(null);
    const [zoomImage, setZoomImage] = useState(null); // Data URL or path
    const fileRef = useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchPegawai();
        }
    }, [navigate]);

    const fetchPegawai = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            const list = Array.isArray(res.data.data) ? res.data.data : [];
            const sorted = [...list].sort((a, b) => (parseInt(a.nik) || 0) - (parseInt(b.nik) || 0));
            setPegawaiList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const filtered = pegawaiList.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower) ||
                (item.email && item.email.toLowerCase().includes(lower))
            );
            setFilteredList(filtered);
        } else {
            setFilteredList(pegawaiList);
        }
    }, [searchTerm, pegawaiList]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, foto_profil: file }));
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const openModal = (row = null) => {
        if (row) {
            setIsEdit(true);
            setFormData({
                id_pegawai: row.id_pegawai,
                nik: row.nik,
                nama_lengkap: row.nama_lengkap,
                email: row.email || '',
                no_hp: row.no_hp || '',
                npwp: row.npwp || '',
                foto_profil: null
            });
            setPreviewImage(row.foto_profil ? `http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}` : null);
        } else {
            setIsEdit(false);
            setFormData({
                id_pegawai: '',
                nik: '',
                nama_lengkap: '',
                email: '',
                no_hp: '',
                npwp: '',
                foto_profil: null
            });
            setPreviewImage(null);
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const url = isEdit
            ? 'http://localhost/project_web_payroll/backend-api/modules/pegawai/update.php'
            : 'http://localhost/project_web_payroll/backend-api/modules/pegawai/create.php';

        const data = new FormData();
        data.append('id_pegawai', formData.id_pegawai);
        data.append('nik', formData.nik);
        data.append('nama_lengkap', formData.nama_lengkap);
        data.append('email', formData.email);
        data.append('no_hp', formData.no_hp);
        data.append('npwp', formData.npwp);
        if (formData.foto_profil) {
            data.append('foto_profil', formData.foto_profil);
        }

        try {
            const res = await axios.post(url, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.status === 'success') {
                alert(`✅ Sukses!`);
                setShowModal(false);
                fetchPegawai();
            } else {
                alert("❌ " + res.data.message);
            }
        } catch (error) {
            alert("Error Server: " + (error.response?.data?.message || error.message));
        }
    };

    // --- IMPORT / EXPORT HANDLERS ---
    const handleExport = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/export_excel.php', '_blank');
    const handleDownloadTemplate = () => window.open('http://localhost/project_web_payroll/backend-api/modules/pegawai/download_template.php', '_blank');

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
            alert('❌ Format file tidak valid! Gunakan file .xlsx atau .xls');
            e.target.value = null; return;
        }

        if (!confirm('Import data pegawai? Data NIK yang sama akan di-update.')) {
            e.target.value = null;
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file_excel', file);
        setIsUploading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data && res.data.status === 'success') {
                setImportResult({
                    type: 'success',
                    message: res.data.message || 'Import berhasil!',
                    detail: res.data.detail || null
                });
                setShowImportResult(true);
                fetchPegawai();
            } else {
                setImportResult({
                    type: 'error',
                    message: res.data?.message || 'Import gagal, periksa format file.'
                });
                setShowImportResult(true);
            }
        } catch (error) {
            const errMsg = error.response?.data?.message || error.message || 'Gagal upload. Periksa koneksi server.';
            setImportResult({ type: 'error', message: errMsg });
            setShowImportResult(true);
        }
        finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus pegawai ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id_pegawai: id });
            if (res.data.status === 'success') {
                alert("✅ Dihapus");
                fetchPegawai();
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (e) {
            alert("Gagal hapus");
        }
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Data Pegawai</h1>
                        <p className="modern-subtitle">Management Data Induk Pegawai</p>
                    </div>
                    <button onClick={() => openModal()} className="btn-modern btn-gradient">+ Tambah Pegawai</button>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari Nama / NIK..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={handleExport} className="btn-modern btn-outline">📥 Excel</button>
                        <button onClick={() => setShowFormatModal(true)} className="btn-modern btn-outline" title="Lihat Format Import">📋 Format</button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
                        <button onClick={() => fileInputRef.current.click()} className="btn-modern btn-gradient" disabled={isUploading}>
                            {isUploading ? '⏳ Uploading...' : '📂 Import'}
                        </button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Pegawai</th>
                                <th>Email</th>
                                <th>No HP</th>
                                <th>NPWP</th>
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
                                                {row.foto_profil ? (
                                                    <img
                                                        src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`}
                                                        alt="Profile"
                                                        className="avatar-circle"
                                                        style={{ objectFit: 'cover', cursor: 'pointer' }}
                                                        onClick={() => setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`)}
                                                    />
                                                ) : (
                                                    <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                )}
                                                <div>
                                                    <div className="user-name-modern">{row.nama_lengkap}</div>
                                                    <div className="user-nik-modern">{row.nik}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{row.email || '-'}</td>
                                        <td>{row.no_hp || '-'}</td>
                                        <td>{row.npwp || '-'}</td>
                                        <td className="text-center aksi-full">
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit">✏️</button>
                                            <button onClick={() => handleDelete(row.id_pegawai, row.nama_lengkap)} className="btn-icon-modern delete" title="Hapus">🗑️</button>
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
                    <div className="modal-content-modern" style={{ width: '500px' }}>
                        <div className="modal-header-modern">
                            <h3>{isEdit ? '✏️ Edit Pegawai' : '➕ Tambah Pegawai'}</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <form onSubmit={handleSave}>
                                <div className="form-group" style={{ marginBottom: '15px', textAlign: 'center' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {previewImage ? (
                                            <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '2rem', color: '#94a3b8' }}>📷</span>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                        accept="image/png, image/jpeg, image/jpg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current.click()}
                                        className="btn-modern btn-outline"
                                        style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                                    >
                                        Ganti Foto
                                    </button>
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>NIK <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="nik" value={formData.nik} onChange={handleChange} required placeholder="Contoh: 2024001" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required placeholder="Nama Lengkap" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@contoh.com" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>No HP</label>
                                    <input type="text" name="no_hp" value={formData.no_hp} onChange={handleChange} placeholder="08123456789" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>NPWP</label>
                                    <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} placeholder="00.000.000.0-000.000" />
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

            {/* MODAL FORMAT IMPORT */}
            {showFormatModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <div className="modal-header-modern"><h3>📋 Format Import Data Pegawai</h3><button onClick={() => setShowFormatModal(false)}>✕</button></div>
                        <div style={{ padding: '25px' }}>
                            <p style={{ marginBottom: '15px', color: '#64748b' }}>Gunakan template Excel untuk import data. Berikut adalah contoh format yang benar:</p>

                            <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NIK <span style={{ color: 'red' }}>*</span></th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Nama Lengkap <span style={{ color: 'red' }}>*</span></th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Email</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>No HP</th>
                                            <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>NPWP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>2024001</td>
                                            <td style={{ padding: '10px' }}>Alex Santoso</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>alex@email.com</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>081234567890</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>12.345.678.9-001.000</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '10px', fontWeight: 'bold' }}>2024002</td>
                                            <td style={{ padding: '10px' }}>Budi Pratama</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>budi@email.com</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>089876543210</td>
                                            <td style={{ padding: '10px', color: '#64748b' }}>-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e', marginBottom: '20px' }}>
                                <strong>Catatan:</strong><br />
                                • Kolom <strong>NIK</strong> dan <strong>Nama Lengkap</strong> WAJIB diisi.<br />
                                • Kolom lain bersifat opsional.<br />
                                • Format file harus <strong>.xlsx</strong> atau <strong>.xls</strong>.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                <button onClick={handleDownloadTemplate} className="btn-modern btn-outline" style={{ flex: 1 }}>📥 Download Template Excel</button>
                                <button onClick={() => { setShowFormatModal(false); fileInputRef.current.click(); }} className="btn-modern btn-gradient" style={{ flex: 1 }}>📂 Langsung Pilih File</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL IMPORT RESULT */}
            {showImportResult && importResult && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '600px' }}>
                        <div className="modal-header-modern" style={{ background: importResult.type === 'success' ? '#f0fdf4' : '#fef2f2' }}>
                            <h3 style={{ color: importResult.type === 'success' ? '#166534' : '#991b1b' }}>{importResult.type === 'success' ? '✅ Import Berhasil' : '❌ Import Gagal'}</h3>
                            <button onClick={() => setShowImportResult(false)}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '10px' }}>{importResult.message}</p>

                            {importResult.detail && (
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ textAlign: 'center', padding: '10px', background: '#dcfce7', borderRadius: '6px', color: '#166534' }}>
                                            <div style={{ fontSize: '0.8rem' }}>Berhasil</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{importResult.detail.berhasil}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '10px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
                                            <div style={{ fontSize: '0.8rem' }}>Gagal</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{importResult.detail.gagal}</div>
                                        </div>
                                    </div>

                                    {importResult.detail.errors && importResult.detail.errors.length > 0 && (
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem', color: '#b91c1c' }}>
                                            <strong style={{ display: 'block', marginBottom: '5px' }}>Detail Error:</strong>
                                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                {importResult.detail.errors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button onClick={() => setShowImportResult(false)} className="btn-modern btn-gradient" style={{ width: '100%' }}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ZOOM IMAGE */}
            {zoomImage && (
                <div className="modal-backdrop" onClick={() => setZoomImage(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                        <button
                            onClick={() => setZoomImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-20px',
                                right: '-20px',
                                background: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                color: '#333',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>✕</button>
                        <img src={zoomImage} alt="Zoom Pegawai" style={{ width: '100%', height: 'auto', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataPegawai;
