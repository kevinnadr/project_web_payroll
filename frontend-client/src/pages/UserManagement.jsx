// FILE: frontend-client/src/pages/UserManagement.jsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const UserManagement = () => {
    // --- STATE ---
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    
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
                alert("⛔ Akses Ditolak! Halaman ini khusus Admin.");
                navigate('/dashboard');
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
            }
        } catch (error) {
            console.error(error);
        }
    };

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
                alert(isEdit ? "User berhasil diupdate!" : "User baru berhasil ditambahkan!");
                setShowModal(false);
                fetchUsers();
                resetForm();
            } else {
                alert("Gagal: " + res.data.message);
            }
        } catch (error) {
            alert("Terjadi kesalahan sistem.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Yakin ingin menghapus user ini? Akses login mereka akan hilang.")) return;
        
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/users/delete.php', { id });
            if (res.data.status === 'success') {
                alert("User dihapus!");
                fetchUsers();
            }
        } catch (error) {
            alert("Gagal menghapus user.");
        }
    };

    const resetForm = () => {
        setFormData({ id: '', nama: '', email: '', password: '', role: 'user' });
        setIsEdit(false);
    };

    const handleEdit = (u) => {
        setIsEdit(true);
        setFormData({ ...u, password: '' }); // Kosongkan password saat edit (biar gak keganti otomatis)
        setShowModal(true);
    };

    const handleLogout = () => {
        if(window.confirm("Yakin mau logout?")) {
            localStorage.clear();
            navigate('/');
        }
    };

    return (
        <div className="app-layout">
            
            {/* --- SIDEBAR (SAMA PERSIS DENGAN HALAMAN LAIN) --- */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">WEB <span>PAYROLL</span></div>
                </div>
                
                <nav className="sidebar-menu">
                    <button className="menu-item" onClick={() => navigate('/dashboard')}>
                        <span>📊</span> <span>Dashboard Overview</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/master-gaji')}>
                        <span>⚙️</span> <span>Atur Komponen Gaji</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/absensi')}>
                        <span>📅</span> <span>Input Absensi</span>
                    </button>

                    {/* Menu Aktif */}
                    <button className="menu-item active">
                        <span>👥</span> <span>Manajemen User</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{currentUser?.nama?.charAt(0) || 'A'}</div>
                        <span style={{fontSize:'0.9rem', color:'#cbd5e1'}}>Halo, <br/><strong style={{color:'white'}}>{currentUser?.nama}</strong></span>
                    </div>
                    <button onClick={handleLogout} className="btn btn-logout">
                        Logout Keluar
                    </button>
                </div>
            </aside>

            {/* --- KONTEN UTAMA --- */}
            <main className="main-content">
                
                <div className="page-header">
                    <h1 className="page-title">Manajemen User</h1>
                    <p className="page-subtitle">Kelola akun Admin dan User yang dapat mengakses aplikasi.</p>
                </div>

                {/* CARD TABLE */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <span className="card-title">👥 Daftar Pengguna</span>
                            <div style={{fontSize:'0.85rem', color:'#64748b'}}>Total: {users.length} Akun</div>
                        </div>
                        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary" style={{padding:'8px 16px'}}>
                            + Tambah User
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nama User</th>
                                    <th>Email Login</th>
                                    <th>Role / Hak Akses</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{fontWeight:'700', color:'#0f172a'}}>{u.nama}</div>
                                            <div style={{fontSize:'0.8rem', color:'#64748b'}}>ID: {u.id}</div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span style={{
                                                background: u.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                                                color: u.role === 'admin' ? '#1e40af' : '#475569',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', textTransform:'uppercase'
                                            }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td align="center" style={{display:'flex', justifyContent:'center', gap:'8px'}}>
                                            <button onClick={() => handleEdit(u)} className="btn btn-sm" style={{background:'#3b82f6', color:'white'}} title="Edit">✏️</button>
                                            
                                            {/* Cegah Hapus Diri Sendiri */}
                                            {u.id !== currentUser?.id && (
                                                <button onClick={() => handleDelete(u.id)} className="btn btn-sm btn-danger" title="Hapus">🗑️</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {/* --- MODAL FORM (Style sama dengan Dashboard) --- */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{width: '500px', maxHeight: '90vh', overflowY: 'auto'}}>
                        <div className="card-header" style={{display:'flex', justifyContent:'space-between'}}>
                            <span className="card-title">{isEdit ? '✏️ Edit User' : '➕ Tambah User Baru'}</span>
                            <button onClick={() => setShowModal(false)} style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer'}}>❌</button>
                        </div>
                        <div style={{padding:'20px'}}>
                            <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                                <div>
                                    <label>Nama Lengkap</label>
                                    <input type="text" required className="form-input"
                                        value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
                                </div>
                                <div>
                                    <label>Email Login</label>
                                    <input type="email" required className="form-input"
                                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label>Role</label>
                                    <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                        <option value="user">User Biasa</option>
                                        <option value="admin">Super Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Password {isEdit && <span style={{fontSize:'0.8rem', color:'#64748b'}}>(Kosongkan jika tidak diubah)</span>}</label>
                                    <input type="password" className="form-input"
                                        required={!isEdit} // Wajib jika user baru
                                        placeholder={isEdit ? "********" : "Minimal 6 karakter"}
                                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>

                                <div style={{display:'flex', gap:'10px', marginTop:'10px', justifyContent:'flex-end'}}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn" style={{background:'#cbd5e1', color:'#334155'}}>Batal</button>
                                    <button type="submit" className="btn btn-primary">{loading ? 'Menyimpan...' : 'Simpan Data'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .form-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    margin-top: 5px;
                }
            `}</style>
        </div>
    );
};

export default UserManagement;