// frontend-client/src/components/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ user }) => {
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
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-brand">WEB <span>PAYROLL</span></div>
            </div>

            <nav className="sidebar-menu">
                <button className={isActive('/dashboard')} onClick={() => navigate('/dashboard')}>
                    <span>📊</span> <span>Dashboard Overview</span>
                </button>

                <button className={isActive('/data-pegawai')} onClick={() => navigate('/data-pegawai')}>
                    <span>👥</span> <span>Data Pegawai</span>
                </button>

                <button className={isActive('/kontrak-pegawai')} onClick={() => navigate('/kontrak-pegawai')}>
                    <span>📋</span> <span>Kontrak Kerja</span>
                </button>

                <button className={isActive('/data-bpjs')} onClick={() => navigate('/data-bpjs')}>
                    <span>🏥</span> <span>Data BPJS</span>
                </button>

                <button className={isActive('/absensi')} onClick={() => navigate('/absensi')}>
                    <span>📅</span> <span>Absensi</span>
                </button>

                <button className={isActive('/slip-gaji')} onClick={() => navigate('/slip-gaji')}>
                    <span>💰</span> <span>Slip Gaji</span>
                </button>

                <button className={isActive('/pph-ter')} onClick={() => navigate('/pph-ter')}>
                    <span>💳</span> <span>PPH TER Management</span>
                </button>

                {/* Menu Khusus Admin */}
                {user?.role === 'admin' && (
                    <button className={isActive('/users')} onClick={() => navigate('/users')}>
                        <span>⚙️</span> <span>Management User</span>
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
    );
};

export default Sidebar;