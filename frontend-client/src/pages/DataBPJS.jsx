import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const DataBPJS = () => {
    const [user, setUser] = useState(null);
    const [bpjsList, setBpjsList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        id_pegawai: '',
        bpjs_tk: 0,
        bpjs_ks: 0,
        dasar_upah: 0
    });

    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchData();
        }
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/bpjs/read.php');
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            const sorted = data.sort((a, b) => parseInt(a.nik) - parseInt(b.nik));
            setBpjsList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const filtered = bpjsList.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower)
            );
            setFilteredList(filtered);
        } else {
            setFilteredList(bpjsList);
        }
    }, [searchTerm, bpjsList]);

    const openModal = (row) => {
        setFormData({
            id_pegawai: row.id_pegawai,
            bpjs_tk: row.bpjs_tk || 0,
            bpjs_ks: row.bpjs_ks || 0,
            dasar_upah: row.dasar_upah || 0
        });
        setShowModal(true);
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/update.php', formData);
            if (res.data.status === 'success') {
                alert('✅ Data BPJS Disimpan!');
                setShowModal(false);
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (error) {
            alert('Gagal simpan!');
        }
    };

    const handleDelete = async (id, nama) => {
        if (!confirm(`Hapus/Reset data BPJS untuk ${nama}?`)) return;
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/bpjs/delete.php', { id_pegawai: id });
            if (res.data.status === 'success') {
                alert('✅ Data Direset!');
                fetchData();
            } else {
                alert('❌ Gagal: ' + res.data.message);
            }
        } catch (e) {
            alert('Gagal hapus');
        }
    };

    // Helper for formatting currency
    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Data BPJS</h1>
                        <p className="modern-subtitle">Kelola Data BPJS Ketenagakerjaan & Kesehatan</p>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari Nama / NIK..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Pegawai</th>
                                <th>BPJS TK</th>
                                <th>BPJS KS</th>
                                <th>Dasar Upah</th>
                                <th className="text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">⏳ Memuat...</td></tr>
                            ) : (
                                filteredList.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td>
                                            <div className="user-profile">
                                                <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                <div>
                                                    <div className="user-name-modern">{row.nama_lengkap}</div>
                                                    <div className="user-nik-modern">{row.nik}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatRupiah(row.bpjs_tk)}</td>
                                        <td>{formatRupiah(row.bpjs_ks)}</td>
                                        <td>{formatRupiah(row.dasar_upah)}</td>
                                        <td className="text-center aksi-full">
                                            <button onClick={() => openModal(row)} className="btn-icon-modern edit" title="Edit">✏️</button>
                                            <button onClick={() => handleDelete(row.id_pegawai, row.nama_lengkap)} className="btn-icon-modern delete" title="Reset">🗑️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* MODAL FORM */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content-modern" style={{ width: '400px' }}>
                        <div className="modal-header-modern">
                            <h3>✏️ Edit Data BPJS</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <form onSubmit={handleSave}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>BPJS Ketenagakerjaan (Rp)</label>
                                    <input type="number" name="bpjs_tk" value={formData.bpjs_tk} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>BPJS Kesehatan (Rp)</label>
                                    <input type="number" name="bpjs_ks" value={formData.bpjs_ks} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label>Dasar Upah (Rp)</label>
                                    <input type="number" name="dasar_upah" value={formData.dasar_upah} onChange={handleInput} placeholder="0" min="0" />
                                </div>
                                <div className="modal-footer-modern" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                                    <button type="submit" className="btn-save">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataBPJS;
