import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // Import Sidebar Terpisah
import '../App.css';

const Dashboard = () => {
    // --- STATE ---
    const [stats, setStats] = useState({ total_pegawai: 0, total_budget: 0, total_alpha: 0 });
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // --- INITIAL LOAD ---
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/');
        } else {
            setUser(JSON.parse(userData));
            fetchStats();
        }
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master/get_stats.php');
            if (res.data.status === 'success') setStats(res.data.data);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="app-layout">
            
            {/* Panggil Komponen Sidebar */}
            <Sidebar user={user} />

            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <h1 className="page-title">Dashboard Overview</h1>
                    <p className="page-subtitle">Selamat datang kembali, <strong>{user?.nama}</strong>!</p>
                </div>

                {/* Widget Statistik */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon bg-blue">👥</div>
                        <div className="stat-info">
                            <h4>Total Pegawai</h4>
                            <p>{stats.total_pegawai} Orang</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-green">💰</div>
                        <div className="stat-info">
                            <h4>Estimasi Gaji</h4>
                            <p>Rp {parseInt(stats.total_budget).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bg-red">⚠️</div>
                        <div className="stat-info">
                            <h4>Total Alpha</h4>
                            <p>{stats.total_alpha} Hari</p>
                        </div>
                    </div>
                </div>

                {/* Shortcut Menu Cepat */}
                <h3 style={{marginTop:'30px', color:'#334155'}}>Akses Cepat</h3>
                <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                    
                    <div className="card hover-card" onClick={()=>navigate('/data-pegawai')} style={{padding:'25px', flex:'1', minWidth:'250px', cursor:'pointer', borderLeft:'5px solid #3b82f6'}}>
                        <div style={{fontSize:'24px', marginBottom:'10px'}}>👥</div>
                        <h3 style={{margin:0, fontSize:'16px'}}>Kelola Pegawai</h3>
                        <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'#64748b'}}>Tambah, Edit biodata & Cek masa kerja.</p>
                    </div>

                    <div className="card hover-card" onClick={()=>navigate('/absensi')} style={{padding:'25px', flex:'1', minWidth:'250px', cursor:'pointer', borderLeft:'5px solid #f59e0b'}}>
                        <div style={{fontSize:'24px', marginBottom:'10px'}}>📅</div>
                        <h3 style={{margin:0, fontSize:'16px'}}>Input Absensi</h3>
                        <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'#64748b'}}>Update kehadiran bulanan pegawai.</p>
                    </div>

                    <div className="card hover-card" onClick={()=>navigate('/master-gaji')} style={{padding:'25px', flex:'1', minWidth:'250px', cursor:'pointer', borderLeft:'5px solid #10b981'}}>
                        <div style={{fontSize:'24px', marginBottom:'10px'}}>💰</div>
                        <h3 style={{margin:0, fontSize:'16px'}}>Atur Gaji</h3>
                        <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'#64748b'}}>Seting Gaji Pokok & Komponen Tunjangan.</p>
                    </div>

                </div>
            </main>

            <style>{`
                .hover-card:hover { transform: translateY(-3px); transition: transform 0.2s; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
};

export default Dashboard;