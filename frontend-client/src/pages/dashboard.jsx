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

    // --- STATE ADD/EDIT ---
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id: '', nik: '', nama_lengkap: '', jabatan: '', gaji_pokok: '', email: '', tanggal_masuk: ''
    });

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
            if (res.data.status === 'success') setDataPegawai(res.data.data);
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master/get_stats.php');
            if (res.data.status === 'success') setStats(res.data.data);
        } catch (e) { console.error(e); }
    };

    const handleLogout = () => {
        if (window.confirm("Yakin mau logout?")) {
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
        if (!window.confirm(`Kirim slip ke ${nama}?`)) return;
        setMessage(`⏳ Mengirim email ke ${nama}...`);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            if (res.data.status === 'success') setMessage(`✅ Email terkirim ke ${nama}`);
        } catch (e) { setMessage("❌ Gagal kirim email"); }
    };

    const handleDelete = async (id, nama) => {
        if (!window.confirm(`Hapus pegawai ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/delete.php', { id });
            if (res.data.status === 'success') {
                alert("Terhapus!");
                fetchPegawai();
                fetchStats();
            }
        } catch (e) { alert("Gagal hapus"); }
    };

    // --- FORM HANDLERS ---
    const handleAdd = () => {
        setIsEdit(false);
        setFormData({ id: '', nik: '', nama_lengkap: '', jabatan: '', gaji_pokok: '', email: '', tanggal_masuk: '' });
        setShowModal(true);
    };

    const handleEdit = (p) => {
        setIsEdit(true);
        setFormData({ ...p });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        const url = isEdit
            ? 'http://localhost/project_web_payroll/backend-api/modules/pegawai/update.php'
            : 'http://localhost/project_web_payroll/backend-api/modules/pegawai/create.php';

        try {
            const res = await axios.post(url, formData);
            if (res.data.status === 'success') {
                alert(isEdit ? "Data berhasil diupdate!" : "Pegawai berhasil ditambahkan!");
                setShowModal(false);
                fetchPegawai();
                fetchStats();
            } else {
                alert("Gagal: " + res.data.message);
            }
        } catch (e) {
            alert("Terjadi kesalahan sistem");
            console.error(e);
        } finally {
            setLoading(false);
        }
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
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Halo, <br /><strong style={{ color: 'white' }}>{user?.nama}</strong></span>
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
                        <input type="file" onChange={(e) => { setFile(e.target.files[0]); setMessage("") }} accept=".xlsx, .xls" />
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Uploading...' : 'Import Excel'}
                        </button>
                        {message && <span style={{ marginLeft: '10px', fontWeight: '500', color: message.includes('✅') ? 'green' : 'red' }}>{message}</span>}
                    </form>
                </div>

                {/* 3. Tabel Data */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <span className="card-title">📋 Data Pegawai Aktif</span>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total: {dataPegawai.length} Pegawai</div>
                        </div>
                        <button onClick={handleAdd} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                            + Tambah Pegawai
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>NIK & Nama</th>
                                    <th>Jabatan</th>
                                    <th>Gaji Pokok</th>
                                    <th style={{ textAlign: 'center' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataPegawai.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{row.nama_lengkap}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.nik}</div>
                                        </td>
                                        <td>
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>
                                                {row.jabatan}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '600', color: '#334155' }}>
                                            Rp {parseInt(row.gaji_pokok).toLocaleString('id-ID')}
                                        </td>
                                        <td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button onClick={() => handleEdit(row)} className="btn btn-sm" style={{ background: '#3b82f6', color: 'white' }} title="Edit">✏️</button>
                                            <button onClick={() => handlePrint(row.id)} className="btn btn-sm btn-primary" title="Cetak PDF">🖨️</button>
                                            <button onClick={() => handleEmail(row.id, row.nama_lengkap)} className="btn btn-sm" style={{ background: '#f59e0b', color: 'white' }} title="Email">📧</button>
                                            <button onClick={() => handleDelete(row.id, row.nama_lengkap)} className="btn btn-sm btn-danger" title="Hapus">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {/* --- MODAL FORM --- */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="card-title">{isEdit ? '✏️ Edit Pegawai' : '➕ Tambah Pegawai Baru'}</span>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>❌</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label>NIK</label>
                                    <input type="text" required className="form-input"
                                        value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })} />
                                </div>
                                <div>
                                    <label>Nama Lengkap</label>
                                    <input type="text" required className="form-input"
                                        value={formData.nama_lengkap} onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })} />
                                </div>
                                <div>
                                    <label>Jabatan</label>
                                    <select className="form-input" required value={formData.jabatan} onChange={e => setFormData({ ...formData, jabatan: e.target.value })}>
                                        <option value="">- Pilih Jabatan -</option>
                                        <option value="Staff">Staff</option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Manager">Manager</option>
                                        <option value="Direktur">Direktur</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Gaji Pokok</label>
                                    <input type="number" required className="form-input"
                                        value={formData.gaji_pokok} onChange={e => setFormData({ ...formData, gaji_pokok: e.target.value })} />
                                </div>
                                <div>
                                    <label>Email (Opsional)</label>
                                    <input type="email" className="form-input"
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div>
                                    <label>Tanggal Masuk</label>
                                    <input type="date" required className="form-input"
                                        value={formData.tanggal_masuk} onChange={e => setFormData({ ...formData, tanggal_masuk: e.target.value })} />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: '#cbd5e1', color: '#334155' }}>Batal</button>
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

export default Dashboard;