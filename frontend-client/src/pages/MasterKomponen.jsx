import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, AlertTriangle, X, PlusCircle, LayoutList, FolderOpen } from 'lucide-react';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import '../App.css';

const MasterKomponen = () => {
    const [komponenList, setKomponenList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const { toast, showToast, hideToast } = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [formData, setFormData] = useState({
        id: '',
        nama_komponen: ''
    });

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');

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
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_komponen/read.php');
            if (res.data.status === 'success') {
                setKomponenList(res.data.data || []);
            }
        } catch (e) {
            console.error(e);
            showToast('error', 'Gagal memuat data komponen');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (komp = null) => {
        if (komp) {
            setFormData({
                id: komp.id,
                nama_komponen: komp.nama_komponen
            });
            setIsEdit(true);
        } else {
            setFormData({ id: '', nama_komponen: '' });
            setIsEdit(false);
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.nama_komponen.trim()) {
            return showToast('error', 'Nama komponen tidak boleh kosong!');
        }

        try {
            const url = isEdit
                ? 'http://localhost/project_web_payroll/backend-api/modules/master_komponen/update.php'
                : 'http://localhost/project_web_payroll/backend-api/modules/master_komponen/create.php';

            const payload = isEdit
                ? { id: formData.id, nama_komponen: formData.nama_komponen.trim() }
                : { nama_komponen: formData.nama_komponen.trim() };

            const res = await axios.post(url, payload);
            if (res.data.status === 'success') {
                showToast('success', isEdit ? 'Komponen berhasil diupdate!' : 'Komponen baru berhasil ditambahkan!');
                setShowModal(false);
                fetchData();
            } else {
                showToast('error', 'Gagal: ' + res.data.message);
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            showToast('error', 'Error: ' + msg);
        }
    };

    const handleDelete = (id, nama) => {
        setDeleteTarget({ id, nama });
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (deleteInput !== 'hapus data') {
            showToast('error', 'Konfirmasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_komponen/delete.php', { id: deleteTarget.id });
            if (res.data.status === 'success') {
                showToast('success', 'Komponen berhasil dihapus!');
                setShowDeleteModal(false);
                fetchData();
            } else {
                showToast('error', 'Gagal: ' + res.data.message);
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            showToast('error', 'Error: ' + msg);
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = komponenList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(komponenList.length / itemsPerPage);

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <header className="page-header">
                    <div className="header-content">
                        <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><LayoutList size={24} color="white" /></div>
                        <div>
                            <h1 className="header-title">Master Nama Komponen</h1>
                            <p className="header-subtitle">Kelola daftar pilihan nama komponen tambahan pendapatan/potongan pegawai.</p>
                        </div>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-primary-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                        <span className="btn-icon" style={{ display: 'flex' }}><PlusCircle size={20} /></span>
                        <span>Tambah Komponen</span>
                    </button>
                </header>

                <div className="premium-card" style={{ padding: '32px' }}>
                    {loading ? (
                        <div className="state-message">
                            <div className="spinner"></div>
                            <p>Sedang memuat data...</p>
                        </div>
                    ) : currentItems.length === 0 ? (
                        <div className="state-message">
                            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}><FolderOpen size={48} color="#94a3b8" /></div>
                            <p>Belum ada data nama komponen.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper" style={{ padding: 0 }}>
                            <table className="premium-table">
                                <colgroup>
                                    <col style={{ width: '80px' }} />
                                    <col style={{ width: 'auto' }} />
                                    <col style={{ width: '120px' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }}>No</th>
                                        <th style={{ textAlign: 'left' }}>Nama Komponen</th>
                                        <th style={{ textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((k, index) => (
                                        <tr key={k.id}>
                                            <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>{index + 1}</td>
                                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{k.nama_komponen}</td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <button
                                                    onClick={() => handleOpenModal(k)}
                                                    title="Edit"
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', marginRight: '8px', color: '#64748b' }}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(k.id, k.nama_komponen)}
                                                    title="Hapus"
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#ef4444' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                                    >
                                        Prev
                                    </button>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                                        Halaman {currentPage} dari {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-card" style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3>
                                    {isEdit ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} /> Edit Komponen</span>
                                    ) : (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={20} /> Tambah Komponen Baru</span>
                                    )}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="close-btn" style={{ display: 'flex' }}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSave} className="modal-form">
                                <div className="form-section">
                                    <label>Nama Komponen Tambahan</label>
                                    <input
                                        type="text"
                                        value={formData.nama_komponen}
                                        onChange={e => setFormData({ ...formData, nama_komponen: e.target.value })}
                                        required
                                        className="premium-input"
                                        placeholder="Contoh: Uang Makan, Tunjangan Transport, dll"
                                    />
                                </div>
                                <div className="modal-actions" style={{ marginTop: '24px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                                    <button type="submit" className="btn-primary" style={{ background: '#059669' }}>Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL HAPUS */}
                {showDeleteModal && (
                    <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                        <div className="modal-card" style={{ width: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
                                    <AlertTriangle size={22} strokeWidth={2.5} /> Konfirmasi Penghapusan
                                </h3>
                                <button onClick={() => setShowDeleteModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '24px 20px' }}>
                                <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5', marginBottom: '15px' }}>
                                    Anda akan menghapus komponen <strong>{deleteTarget?.nama}</strong> secara permanen.
                                </p>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>
                                    Ketik <strong style={{ color: '#dc2626' }}>hapus data</strong> di bawah ini untuk mengonfirmasi:
                                </p>
                                <input
                                    type="text"
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value)}
                                    placeholder="hapus data"
                                    className="premium-input"
                                    style={{
                                        width: '100%', padding: '10px', border: '2px solid #e2e8f0',
                                        borderRadius: '8px', fontSize: '1rem', marginBottom: '20px',
                                        outlineColor: '#dc2626', boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />
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
                    border-radius: 12px; 
                    display: flex; align-items: center; justify-content: center; 
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
                .header-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
                .header-subtitle { font-size: 14px; color: #64748b; margin: 4px 0 0; }

                /* BUTTONS */
                .btn-primary-gradient {
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 6px rgba(5, 150, 105, 0.1);
                }
                .btn-primary-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 12px rgba(5, 150, 105, 0.2); }

                /* CARD */
                .premium-card {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 20px 40px -20px rgba(0,0,0,0.05);
                    border: 1px solid #f1f5f9;
                    overflow: hidden;
                }

                .premium-table { width: 100%; border-collapse: separate; border-spacing: 0; }
                .premium-table th {
                    background: #f8fafc;
                    padding: 16px;
                    font-size: 15px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .premium-table td {
                    padding: 16px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    font-size: 16px;
                }
                .premium-table tr:hover td { background: #f8fafc; }
                .premium-table tr:last-child td { border-bottom: none; }

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
                .premium-input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
                
                .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
                .btn-secondary { background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; color: #475569; }
                .btn-primary { border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; color: white; }

                /* MISC */
                .state-message { padding: 60px; text-align: center; color: #94a3b8; }
                .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #10b981; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
                
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default MasterKomponen;
