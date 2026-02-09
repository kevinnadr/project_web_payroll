import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css';

const MasterGaji = () => {
    const [user, setUser] = useState(null);
    const [listPegawai, setListPegawai] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Default periode adalah bulan ini
    const [bulanFilter, setBulanFilter] = useState(new Date().toISOString().slice(0, 7));

    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState({
        pegawai_id: '', nama_lengkap: '', gaji_pokok: 0, ikut_bpjs_tk: true, ikut_bpjs_ks: true
    });
    const [komponenPegawai, setKomponenPegawai] = useState([]); 
    const [inputNama, setInputNama] = useState("");
    const [inputJenis, setInputJenis] = useState("penerimaan"); 
    const [inputTipe, setInputTipe] = useState("bulanan"); 
    const [inputNominal, setInputNominal] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else { 
            setUser(JSON.parse(userData)); 
            fetchDataGaji(); 
        }
    }, [navigate, bulanFilter]); // Trigger fetch ulang saat bulan berubah

    const fetchDataGaji = async () => {
        setLoading(true);
        try {
            // Kita kirim parameter bulan ke backend
            const res = await axios.get(`http://localhost/project_web_payroll/backend-api/modules/master_gaji/read_all.php?bulan=${bulanFilter}`);
            if (res.data.status === 'success') {
                setListPegawai(res.data.data);
                setFilteredList(res.data.data);
            } else {
                setListPegawai([]);
                setFilteredList([]);
            }
        } catch (e) { 
            console.error(e);
            setListPegawai([]);
        } finally { setLoading(false); }
    };

    const handleGenerateGaji = async () => {
        if (!confirm(`Generate data gaji untuk periode ${bulanFilter}?`)) return;
        setLoading(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/generate_periode.php', { bulan: bulanFilter });
            alert(res.data.message);
            fetchDataGaji(); // Refresh data setelah generate
        } catch (e) { alert("Gagal generate data."); } 
        finally { setLoading(false); }
    };

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        const filtered = listPegawai.filter(item => 
            item.nama_lengkap.toLowerCase().includes(lower) || item.nik.includes(lower)
        );
        setFilteredList(filtered);
    }, [searchTerm, listPegawai]);

    const openEditModal = (row) => {
        setEditData({ 
            pegawai_id: row.id, nama_lengkap: row.nama_lengkap, gaji_pokok: row.gaji_pokok,
            ikut_bpjs_tk: row.ikut_bpjs_tk === 1, ikut_bpjs_ks: row.ikut_bpjs_ks === 1
        });
        const mapped = row.list_komponen ? row.list_komponen.map(k => ({
            nama_komponen: k.nama, jenis: k.jenis, tipe_hitungan: k.tipe, nominal: k.nominal
        })) : [];
        setKomponenPegawai(mapped);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...editData, komponen_list: komponenPegawai, bulan: bulanFilter };
            await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_gaji_full.php', payload);
            setShowModal(false);
            fetchDataGaji();
        } catch (err) { alert("Error Server"); }
    };

    const formatRp = (n) => new Intl.NumberFormat('id-ID').format(n);

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Master Gaji</h1>
                        <p className="modern-subtitle">Manajemen data pendapatan karyawan per periode.</p>
                    </div>
                    <div className="generate-toolbar">
                        <div className="periode-label">Periode:</div>
                        <input 
                            type="month" 
                            className="input-month-modern" 
                            value={bulanFilter} 
                            onChange={(e) => setBulanFilter(e.target.value)} 
                        />
                        <button onClick={handleGenerateGaji} className="btn-generate-gradient">
                            ⚡ Generate Gaji
                        </button>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box-modern">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="Cari Pegawai..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="table-card-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Pegawai</th>
                                <th>Gaji Pokok</th>
                                <th>Komponen & Status BPJS</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center-padding">Memuat data...</td></tr>
                            ) : filteredList.length > 0 ? (
                                filteredList.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <div className="user-info-flex">
                                                <div className="avatar-circle">{row.nama_lengkap.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <div className="user-name">{row.nama_lengkap}</div>
                                                    <div className="user-sub">{row.nik} • {row.jabatan}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="salary-text">Rp {formatRp(row.gaji_pokok)}</td>
                                        <td>
                                            <div className="tag-container-flex">
                                                {row.list_komponen && row.list_komponen.map((k, i) => (
                                                    <span key={i} className={`badge-custom ${k.jenis}`}>
                                                        {k.nama}: {formatRp(k.nominal)}
                                                    </span>
                                                ))}
                                                {row.ikut_bpjs_tk === 1 && <span className="badge-custom bpjs">BPJS TK</span>}
                                                {row.ikut_bpjs_ks === 1 && <span className="badge-custom bpjs">BPJS KS</span>}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <button onClick={() => openEditModal(row)} className="btn-action-cog">⚙️</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="empty-state-modern">
                                        <div className="empty-box">
                                            <p>Data gaji periode <b>{bulanFilter}</b> belum tersedia.</p>
                                            <small>Silakan klik tombol <b>Generate Gaji</b> di atas untuk menyalin data dari master.</small>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal Tetap Menggunakan Struktur Yang Sudah Diperbaiki Sebelumnya */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content-clean">
                         {/* ... Isi modal konfigurasi gaji ... */}
                    </div>
                </div>
            )}

            <style>{`
                .page-header-modern { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                .generate-toolbar { display: flex; align-items: center; gap: 12px; background: white; padding: 10px 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .periode-label { font-size: 13px; font-weight: 700; color: #64748b; }
                .input-month-modern { border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; outline: none; font-weight: 600; color: #1e293b; }
                .btn-generate-gradient { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
                .btn-generate-gradient:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
                
                .table-card-modern { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
                .modern-table { width: 100%; border-collapse: collapse; }
                .modern-table th { text-align: left; padding: 18px; background: #f8fafc; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
                .modern-table td { padding: 18px; border-bottom: 1px solid #f1f5f9; }
                
                .user-info-flex { display: flex; align-items: center; gap: 14px; }
                .avatar-circle { width: 42px; height: 42px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; border: 1px solid #dbeafe; }
                .user-name { font-weight: 700; color: #1e293b; }
                .user-sub { font-size: 12px; color: #94a3b8; }
                
                .salary-text { font-weight: 800; color: #10b981; font-size: 15px; }
                
                .tag-container-flex { display: flex; flex-wrap: wrap; gap: 6px; }
                .badge-custom { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
                .badge-custom.penerimaan { background: #dcfce7; color: #166534; }
                .badge-custom.potongan { background: #fee2e2; color: #991b1b; }
                .badge-custom.bpjs { background: #e0e7ff; color: #3730a3; }
                
                .empty-state-modern { padding: 80px 20px; text-align: center; }
                .empty-box { background: #f8fafc; border: 2px dashed #e2e8f0; padding: 30px; border-radius: 16px; color: #64748b; }
                .empty-box b { color: #1e293b; }
                .empty-box small { display: block; margin-top: 8px; }

                .btn-action-cog { background: #f1f5f9; border: none; padding: 10px; border-radius: 10px; cursor: pointer; transition: 0.2s; color: #64748b; }
                .btn-action-cog:hover { background: #e2e8f0; color: #1e293b; transform: rotate(45deg); }
            `}</style>
        </div>
    );
};

export default MasterGaji;