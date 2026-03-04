import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, ClipboardList, HeartPulse, CalendarDays, Banknote, Gift, CreditCard, Settings, LayoutList } from 'lucide-react';

const Sidebar = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation(); // Untuk mengecek halaman mana yang sedang aktif

    const handleLogout = () => {
        if (window.confirm("Yakin mau logout?")) {
            localStorage.clear();
            navigate('/');
        }
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

                    <button className={isActive('/slip-gaji')} onClick={() => { setIsOpen(false); navigate('/slip-gaji'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Banknote size={20} /> <span>Slip Gaji</span>
                    </button>

                    <button className={isActive('/pendapatan-lain')} onClick={() => { setIsOpen(false); navigate('/pendapatan-lain'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Gift size={20} /> <span>Pendapatan Lain</span>
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
                        <div className="avatar">{user?.nama?.charAt(0) || 'A'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Halo,</span>
                            <strong style={{ color: 'white', fontSize: '0.9rem' }}>{user?.nama || 'User'}</strong>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-logout">
                        Logout Keluar
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;