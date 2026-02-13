import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/sidebar';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        total_pegawai: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        cuti: 0,
        alpha: 0,
        telat: 0
    });

    // Default Bulan Ini
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/');
        } else {
            setUser(JSON.parse(userData));
            fetchStats();
        }
    }, [navigate, bulanFilter]);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/dashboard/stats.php?bulan=${bulanFilter}`);
            if (res.data.status === 'success') {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error("Gagal load statistik:", error);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">

                {/* HEADER */}
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Dashboard Overview</h1>
                        <p className="modern-subtitle">Ringkasan data kepegawaian & absensi.</p>
                    </div>
                    <div className="date-picker-container">
                        <span className="label-periode">Periode:</span>
                        <input type="month" className="modern-input-date"
                            value={bulanFilter} onChange={(e) => setBulanFilter(e.target.value)} />
                    </div>
                </div>

                {/* CARDS GRID */}
                <div className="dashboard-grid">
                    {/* Card Total Pegawai */}
                    <div className="stat-card blue-card">
                        <div className="icon-wrapper">👥</div>
                        <div className="stat-info">
                            <h3>Total Pegawai</h3>
                            <div className="stat-number">{stats.total_pegawai}</div>
                            <span className="stat-desc">Aktif bekerja</span>
                        </div>
                    </div>



                    {/* Card Alpha (Mangkir) */}
                    <div className="stat-card red-card">
                        <div className="icon-wrapper">❌</div>
                        <div className="stat-info">
                            <h3>Total Alpha</h3>
                            <div className="stat-number">{stats.alpha}</div>
                            <span className="stat-desc" style={{ color: '#fca5a5' }}>Tanpa Keterangan</span>
                        </div>
                    </div>

                    {/* Card Sakit/Izin/Cuti */}
                    <div className="stat-card yellow-card">
                        <div className="icon-wrapper">📝</div>
                        <div className="stat-info">
                            <h3>Absen Lainnya</h3>
                            <div className="mini-stats">
                                <span>🤒 Sakit: <strong>{stats.sakit}</strong></span>
                                <span>📨 Izin: <strong>{stats.izin}</strong></span>
                                <span>🏖️ Cuti: <strong>{stats.cuti}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WELCOME SECTION */}
                <div className="welcome-section">
                    <h2>👋 Selamat Datang, {user?.nama_lengkap}!</h2>
                    <p>
                        Sistem Payroll ini membantu Anda mengelola Absensi, Gaji, dan Data Pegawai dengan lebih mudah.
                        Pastikan data absensi bulan <strong>{bulanFilter}</strong> sudah diinput sebelum mencetak slip gaji.
                    </p>
                </div>

            </main>

            <style>{`
                /* GRID LAYOUT */
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                /* CARD STYLES */
                .stat-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                    transition: transform 0.2s;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .stat-card:hover { transform: translateY(-5px); }

                .stat-info h3 { margin: 0; font-size: 0.9rem; color: rgba(255,255,255,0.9); font-weight: 500; }
                .stat-number { font-size: 2.2rem; font-weight: 800; line-height: 1.2; margin: 5px 0; color: white; }
                .stat-desc { font-size: 0.8rem; color: rgba(255,255,255,0.8); }

                .icon-wrapper {
                    width: 50px; height: 50px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.5rem;
                }

                /* COLOR VARIANTS */
                .blue-card { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
                .green-card { background: linear-gradient(135deg, #10b981, #059669); color: white; }
                .red-card { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
                .yellow-card { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }

                /* MINI STATS (Untuk Card Kuning) */
                .mini-stats { display: flex; flex-direction: column; gap: 2px; margin-top: 5px; font-size: 0.85rem; color: white; }

                /* WELCOME SECTION */
                .welcome-section {
                    background: white;
                    padding: 30px;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }
                .welcome-section h2 { margin-top: 0; color: #1e293b; }
                .welcome-section p { color: #64748b; line-height: 1.6; }

                /* HEADER STYLES (Sama seperti Absensi) */
                .page-header-modern { display: flex; justify-content: space-between; align-items: end; margin-bottom: 25px; }
                .modern-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .modern-subtitle { color: #64748b; margin: 5px 0 0; font-size: 0.95rem; }
                
                .date-picker-container { background: white; padding: 5px 10px 5px 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
                .label-periode { font-weight: 600; color: #475569; font-size: 0.9rem; }
                .modern-input-date { border: none; font-family: inherit; color: #0f172a; font-weight: 600; cursor: pointer; outline: none; }
            `}</style>
        </div>
    );
};

export default Dashboard;