// FILE: frontend-client/src/pages/UserManagement.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2, PlusCircle, AlertTriangle, X } from 'lucide-react';
import Sidebar from '../components/sidebar'; // <--- Import Sidebar Baru
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import '../App.css';

const UserManagement = () => {
    // --- STATE ---
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const { toast, showToast, hideToast } = useToast();

    // Deletion Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteInput, setDeleteInput] = useState('');

    // State Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        nama: '',
        email: '',
        password: '',
        role: 'user'
    });

    const navigate = useNavigate();

    // --- 1. CEK LOGIN & ROLE ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/');
        } else {
            const userObj = JSON.parse(userData);
            setCurrentUser(userObj);

            // Proteksi: Hanya Admin yang boleh masuk sini
            if (userObj.role !== 'admin') {
                showToast('error', "⛔ Akses Ditolak! Halaman ini khusus Admin.");
                setTimeout(() => navigate('/dashboard'), 2000);
                return;
            }

            fetchUsers();
        }
    }, [navigate]);

    // --- 2. AMBIL DATA USER ---
    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/users/read.php');
            if (res.data.status === 'success') {
                setUsers(res.data.data);
                setFilteredUsers(res.data.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            setFilteredUsers(users.filter(item =>
                item.nama.toLowerCase().includes(lower) ||
                item.email.toLowerCase().includes(lower) ||
                item.role.toLowerCase().includes(lower)
            ));
        } else {
            setFilteredUsers(users);
        }
    }, [searchTerm, users]);

    // --- 3. HANDLE CRUD ---
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        const url = isEdit
            ? 'http://localhost/project_web_payroll/backend-api/modules/users/update.php'
            : 'http://localhost/project_web_payroll/backend-api/modules/users/create.php';

        try {
            const res = await axios.post(url, formData);
            if (res.data.status === 'success') {
                showToast('success', isEdit ? "User berhasil diupdate!" : "User baru berhasil ditambahkan!");
                setShowModal(false);
                fetchUsers();
                resetForm();
            } else {
                showToast('error', "Gagal: " + res.data.message);
            }
        } catch (error) {
            showToast('error', "Terjadi kesalahan sistem.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (userTarget) => {
        // Double check just in case
        if (String(userTarget.id) === String(currentUser?.id)) {
            showToast('error', "Anda tidak dapat menghapus akun Anda sendiri!");
            return;
        }

        setDeleteTarget(userTarget);
        setDeleteInput('');
        setShowDeleteModal(true);
    };

    const confirmDeleteUser = async () => {
        if (deleteInput !== 'hapus data') {
            showToast('error', 'Konfirmasi gagal. Hapus dibatalkan karena teks tidak sesuai.');
            return;
        }

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/users/delete.php', { id: deleteTarget.id });
            if (res.data.status === 'success') {
                showToast('success', "User dihapus!");
                setShowDeleteModal(false);
                fetchUsers();
            } else {
                showToast('error', "Gagal: " + res.data.message);
            }
        } catch (error) {
            showToast('error', "Gagal menghapus user.");
        }
    };

    const resetForm = () => {
        setFormData({ id: '', nama: '', email: '', password: '', role: 'user' });
        setIsEdit(false);
    };

    const handleEdit = (u) => {
        setIsEdit(true);
        setFormData({ ...u, password: '' }); // Kosongkan password saat edit
        setShowModal(true);
    };

    return (
        <div className="app-layout-modern">

            <Sidebar user={currentUser} />

            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Manajemen User</h1>
                        <p className="modern-subtitle">Kelola akun Admin dan User yang dapat mengakses aplikasi.</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-modern btn-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PlusCircle size={18} /> Tambah User
                    </button>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={18} color="#64748b" /></span>
                        <input
                            type="text"
                            placeholder="Cari Nama / Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <span style={{ color: '#64748b', fontWeight: 600, background: '#e2e8f0', padding: '6px 12px', borderRadius: '8px' }}>Total: {filteredUsers.length} Akun</span>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Nama User</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Email Login</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Role / Hak Akses</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Data tidak ditemukan</td></tr>
                            ) : filteredUsers.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem' }}>{u.nama}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {u.id}</div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge-status ${u.role === 'admin' ? 'tetap' : 'kontrak'}`} style={{ textTransform: 'uppercase', background: u.role === 'admin' ? '#dbeafe' : '#f1f5f9', color: u.role === 'admin' ? '#1e40af' : '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ display: 'flex', justifyContent: 'center', gap: '8px', height: '100%', alignItems: 'center', padding: '16px' }}>
                                        <button onClick={() => handleEdit(u)} className="btn-icon-modern edit" title="Edit">
                                            <Pencil size={18} />
                                        </button>

                                        {/* Cegah Hapus Diri Sendiri dengan String Casting */}
                                        {String(u.id) !== String(currentUser?.id) && (
                                            <button onClick={() => handleDelete(u)} className="btn-icon-modern delete" title="Hapus">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- MODAL FORM --- */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: 500 }}>
                        <div className="modal-header-modern">
                            <h3>
                                {isEdit ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Pencil size={20} /> Edit User</span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PlusCircle size={20} /> Tambah User Baru</span>
                                )}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <form onSubmit={handleSave}>
                                <div className="form-group">
                                    <label>Nama Lengkap</label>
                                    <input type="text" required value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div className="form-group">
                                    <label>Email Login</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                                        <option value="user">User Biasa</option>
                                        <option value="admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Password {isEdit && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Kosongkan jika tidak diubah)</span>}</label>
                                    <input type="password" required={!isEdit} placeholder={isEdit ? "********" : "Minimal 6 karakter"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>

                                <div className="modal-footer-modern" style={{ marginTop: '25px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">{loading ? 'Menyimpan...' : 'Simpan Data'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HAPUS USER */}
            {showDeleteModal && (
                <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                    <div className="modal-content-modern" style={{ width: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
                        <div className="modal-header-modern" style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '15px 20px' }}>
                            <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
                                <AlertTriangle size={22} strokeWidth={2.5} /> Konfirmasi Penghapusan
                            </h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '24px 20px' }}>
                            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5', marginBottom: '15px' }}>
                                Anda akan menghapus akses login untuk user:
                                <strong style={{ display: 'block', color: '#0f172a', marginTop: '5px' }}>{deleteTarget?.nama} ({deleteTarget?.role})</strong>
                            </p>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>
                                Ketik <strong style={{ color: '#dc2626' }}>hapus data</strong> di bawah ini untuk mengonfirmasi:
                            </p>
                            <input
                                type="text"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder="hapus data"
                                className="form-control"
                                style={{
                                    width: '100%', padding: '10px', border: '2px solid #e2e8f0',
                                    borderRadius: '8px', fontSize: '1rem', marginBottom: '20px',
                                    outlineColor: '#dc2626', boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDeleteUser}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Hapus User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM TOAST NOTIFICATION */}
            <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />

            <style>{`
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #475569; font-size: 0.9rem; }
            `}</style>
        </div>
    );
};

export default UserManagement;