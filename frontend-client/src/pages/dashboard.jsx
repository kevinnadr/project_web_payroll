// frontend-client/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css'; 

const Dashboard = () => {
    // --- STATE ---
    const [user, setUser] = useState(null);
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [dataPegawai, setDataPegawai] = useState([]);
    const [stats, setStats] = useState({ total_pegawai: 0, total_budget: 0, total_alpha: 0 });
    
    const navigate = useNavigate();

    // --- INITIAL LOAD ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            navigate('/'); 
        } else {
            setUser(JSON.parse(userData));
            fetchPegawai();
            fetchStats();
        }
    }, [navigate]);

    // --- API CALLS ---
    const fetchPegawai = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            if(res.data.status === 'success') setDataPegawai(res.data.data);
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master/get_stats.php');
            if(res.data.status === 'success') setStats(res.data.data);
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        if(window.confirm("Yakin mau logout?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return setMessage("Pilih file Excel dulu!");
        
        const formData = new FormData();
        formData.append('file_excel', file);
        setLoading(true);

        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/import_excel.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.status === 'success') {
                setMessage("✅ " + res.data.message);
                setFile(null);
                fetchPegawai();
                fetchStats();
            }
        } catch (e) {
            setMessage("❌ Gagal: " + (e.response?.data?.message || e.message));
        } finally { setLoading(false); }
    };

    // Helper Actions
    const handlePrint = (id) => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_pdf.php?id=${id}`, '_blank');
    
    const handleEmail = async (id, nama) => {
        if(!window.confirm(`Kirim slip ke ${nama}?`)) return;
        setMessage(`⏳ Mengirim email ke ${nama}...`);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            if(res.data.status === 'success') setMessage(`✅ Email terkirim ke ${nama}`);
        } catch (e) { setMessage("❌ Gagal kirim email"); }
    };

    const handleDelete = async (id, nama) => {
        if(!window.confirm(`Hapus pegawai ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id });
            if(res.data.status === 'success') {
                alert("Terhapus!");
                fetchPegawai();
                fetchStats();
            }
        } catch (e) { alert("Gagal hapus"); }
    };

    return (
        <div className="app-layout">
            
            {/* --- SIDEBAR KIRI --- */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">WEB <span>PAYROLL</span></div>
                </div>
                
                <nav className="sidebar-menu">
                    <button className="menu-item active">
                        <span>📊</span> <span>Dashboard Overview</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/master-gaji')}>
                        <span>⚙️</span> <span>Atur Komponen Gaji</span>
                    </button>
                    <button className="menu-item" onClick={() => navigate('/absensi')}>
                        <span>📅</span> <span>Input Absensi</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">{user?.nama?.charAt(0) || 'A'}</div>
                        <span style={{fontSize:'0.9rem', color:'#cbd5e1'}}>Halo, <br/><strong style={{color:'white'}}>{user?.nama}</strong></span>
                    </div>
                    <button onClick={handleLogout} className="btn btn-logout">
                        Logout Keluar
                    </button>
                </div>
            </aside>

            {/* --- KONTEN UTAMA KANAN --- */}
            <main className="main-content">
                
                {/* Header Halaman */}
                <div className="page-header">
                    <h1 className="page-title">Dashboard Overview</h1>
                    <p className="page-subtitle">Ringkasan data pegawai dan penggajian bulan ini.</p>
                </div>

                {/* 1. Widget Statistik */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon bg-blue">👥</div>
                        <div className="stat-info">
                            <h4>Total Pegawai</h4>
                            <p>{stats.total_pegawai}</p>
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

                {/* 2. Upload Area */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📂 Upload Data Baru</span>
                    </div>
                    <form onSubmit={handleUpload} className="upload-area">
                        <input type="file" onChange={(e) => {setFile(e.target.files[0]); setMessage("")}} accept=".xlsx, .xls" />
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Uploading...' : 'Import Excel'}
                        </button>
                        {message && <span style={{marginLeft:'10px', fontWeight:'500', color: message.includes('✅')?'green':'red'}}>{message}</span>}
                    </form>
                </div>

                {/* 3. Tabel Data */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📋 Data Pegawai Aktif</span>
                        <span style={{fontSize:'0.85rem', color:'#64748b'}}>Total: {dataPegawai.length} Pegawai</span>
                    </div>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>NIK & Nama</th>
                                    <th>Jabatan</th>
                                    <th>Gaji Pokok</th>
                                    <th style={{textAlign: 'center'}}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataPegawai.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <div style={{fontWeight:'700', color:'#0f172a'}}>{row.nama_lengkap}</div>
                                            <div style={{fontSize:'0.8rem', color:'#64748b'}}>{row.nik}</div>
                                        </td>
                                        <td>
                                            <span style={{background:'#f1f5f9', color:'#475569', padding:'4px 10px', borderRadius:'6px', fontSize:'0.8rem', fontWeight:'600'}}>
                                                {row.jabatan}
                                            </span>
                                        </td>
                                        <td style={{fontWeight:'600', color:'#334155'}}>
                                            Rp {parseInt(row.gaji_pokok).toLocaleString('id-ID')}
                                        </td>
                                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button onClick={() => handlePrint(row.id)} className="btn btn-sm btn-primary" title="Cetak PDF">🖨️</button>
                                            <button onClick={() => handleEmail(row.id, row.nama_lengkap)} className="btn btn-sm" style={{background:'#f59e0b', color:'white'}} title="Email">📧</button>
                                            <button onClick={() => handleDelete(row.id, row.nama_lengkap)} className="btn btn-sm btn-danger" title="Hapus">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Dashboard;