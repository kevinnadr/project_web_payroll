import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, ClipboardList, HeartPulse, CalendarDays, Banknote, Gift, CreditCard, Settings, LayoutList, AlertTriangle, X, LogOut } from 'lucide-react';

const Sidebar = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const navigate = useNavigate();
    const location = useLocation(); // Untuk mengecek halaman mana yang sedang aktif

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Fungsi helper untuk menentukan class active
    const isActive = (path) => {
        return location.pathname === path ? 'menu-item active' : 'menu-item';
    };

    return (
        <>

            <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={() => setIsOpen(false)}></div>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/LOGORAC.png" alt="Logo RAC" />
                    </div>
                    <div className="sidebar-brand"><span>WEB PAYROLL</span></div>
                </div>

                <nav className="sidebar-menu">
                    <button className={isActive('/dashboard')} onClick={() => { setIsOpen(false); navigate('/dashboard'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LayoutDashboard size={20} /> <span>Dashboard Overview</span>
                    </button>

                    <button className={isActive('/data-pegawai')} onClick={() => { setIsOpen(false); navigate('/data-pegawai'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} /> <span>Data Pegawai</span>
                    </button>

                    <button className={isActive('/kontrak-pegawai')} onClick={() => { setIsOpen(false); navigate('/kontrak-pegawai'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClipboardList size={20} /> <span>Kontrak Kerja</span>
                    </button>

                    <button className={isActive('/data-bpjs')} onClick={() => { setIsOpen(false); navigate('/data-bpjs'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HeartPulse size={20} /> <span>Data BPJS</span>
                    </button>

                    <button className={isActive('/absensi')} onClick={() => { setIsOpen(false); navigate('/absensi'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={20} /> <span>Absensi</span>
                    </button>

                    <button className={isActive('/pendapatan-lain')} onClick={() => { setIsOpen(false); navigate('/pendapatan-lain'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Gift size={20} /> <span>Pendapatan Lain</span>
                    </button>

                    <button className={isActive('/slip-gaji')} onClick={() => { setIsOpen(false); navigate('/slip-gaji'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Banknote size={20} /> <span>Slip Gaji</span>
                    </button>

                    <button className={isActive('/pph-ter')} onClick={() => { setIsOpen(false); navigate('/pph-ter'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={20} /> <span>PPH TER Management</span>
                    </button>

                    <button className={isActive('/master-komponen')} onClick={() => { setIsOpen(false); navigate('/master-komponen'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LayoutList size={20} /> <span>Master Komponen</span>
                    </button>

                    {/* Menu Khusus Admin */}
                    {user?.role === 'admin' && (
                        <button className={isActive('/users')} onClick={() => { setIsOpen(false); navigate('/users'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={20} /> <span>Management User</span>
                        </button>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">
                            {user?.nama ? user.nama.trim().charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user?.nama || 'User'}</span>
                            <span className={`user-role-badge ${user?.role === 'admin' ? 'admin' : ''}`}>{user?.role || 'Staff'}</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-logout-modern">
                        <LogOut size={18} /> <span>Logout Keluar</span>
                    </button>
                </div>
            </aside>

            {showLogoutModal && (
                <div className="modal-backdrop" style={{ zIndex: 10000 }}>
                    <div className="modal-content-modern" style={{ width: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
                        <div className="modal-header-modern" style={{ borderBottom: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
                                <AlertTriangle size={22} strokeWidth={2.5} /> Konfirmasi Logout
                            </h3>
                            <button onClick={() => setShowLogoutModal(false)} style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '24px 20px' }}>
                            <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                                Apakah Anda yakin ingin keluar dari aplikasi?
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmLogout}
                                    className="btn-modern"
                                    style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Ya, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;