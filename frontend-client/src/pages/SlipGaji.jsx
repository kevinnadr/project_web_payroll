import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import '../App.css';

const SlipGaji = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSendingAll, setIsSendingAll] = useState(false); // New state for bulk email
    const [sendingEmailId, setSendingEmailId] = useState(null);

    const [periodFilter, setPeriodFilter] = useState(new Date().toISOString().slice(0, 7));
    const periodInputRef = useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) navigate('/');
        else {
            setUser(JSON.parse(userData));
            fetchPegawai();
        }
    }, [navigate]);

    const fetchPegawai = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/pegawai/read.php');
            const responseData = res.data.data || res.data || [];
            const list = Array.isArray(responseData) ? responseData : [];
            const sorted = [...list].sort((a, b) => (parseInt(a.nik) || 0) - (parseInt(b.nik) || 0));
            setPegawaiList(sorted);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // Filter Logic: Search + Period
    useEffect(() => {
        let filtered = pegawaiList;

        // 1. Filter by Period (if selected)
        if (periodFilter) {
            // Parse period string "YYYY-MM" to Local Date boundaries
            const [pYear, pMonth] = periodFilter.split('-').map(Number);
            const periodStart = new Date(pYear, pMonth - 1, 1);       // 1st of Month
            const periodEnd = new Date(pYear, pMonth, 0, 23, 59, 59); // Last of Month

            filtered = filtered.filter(item => {
                // If no contracts, show them (permanent/generic)
                if (!item.contracts || item.contracts.length === 0) return true;

                // Check if ANY contract overlaps with the period
                return item.contracts.some(contract => {
                    if (!contract.tanggal_mulai) return true; // Assume active if no start date?

                    const [sYear, sMonth, sDay] = contract.tanggal_mulai.split('-').map(Number);
                    const startDate = new Date(sYear, sMonth - 1, sDay);

                    let endDate = null;
                    if (contract.tanggal_berakhir && contract.tanggal_berakhir !== '0000-00-00') {
                        const [eYear, eMonth, eDay] = contract.tanggal_berakhir.split('-').map(Number);
                        endDate = new Date(eYear, eMonth - 1, eDay);
                    }

                    const isStarted = startDate <= periodEnd;
                    const isNotEnded = !endDate || endDate >= periodStart;
                    return isStarted && isNotEnded;
                });
            });
        }

        // 2. Filter by Search Term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower) ||
                (item.contracts && item.contracts.some(c => (c.jabatan || '').toLowerCase().includes(lower)))
            );
        }

        setFilteredList(filtered);
    }, [searchTerm, periodFilter, pegawaiList]);

    // --- ACTIONS DOWNLOAD & EMAIL ---
    const handlePdfAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfSlipsAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_slips_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfOne = (id) => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_one.php?id=${id}&bulan=${periodFilter}`, '_blank');

    const handleSendEmail = async (id, email) => {
        if (!email) return alert("Pegawai ini tidak memiliki email.");
        if (!confirm(`Kirim notifikasi data ke email: ${email}?`)) return;
        setSendingEmailId(id);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id });
            if (res.data.status === 'success') alert("✅ Email Terkirim!");
            else alert("❌ Gagal: " + res.data.message);
        } catch (e) { alert("Error koneksi server."); }
        finally { setSendingEmailId(null); }
    };

    const handleSendEmailAll = async () => {
        if (!confirm("Kirim slip gaji via email ke SEMUA pegawai yang memiliki email? Proses mungkin memakan waktu.")) return;
        setIsSendingAll(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email_all.php');
            if (res.data.status === 'success') {
                alert(`✅ Proses Selesai!\n${res.data.message}`);
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (e) {
            alert("Error server: " + (e.response?.data?.message || e.message));
        } finally {
            setIsSendingAll(false);
        }
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div><h1 className="modern-title">Slip Gaji</h1><p className="modern-subtitle">Kelola dan Download Slip Gaji Pegawai.</p></div>
                </div>

                <div className="toolbar-modern">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div
                            style={{ background: 'white', padding: '0 15px', borderRadius: '10px', border: '1px solid #e2e8f0', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => {
                                try {
                                    if (periodInputRef.current && typeof periodInputRef.current.showPicker === 'function') {
                                        periodInputRef.current.showPicker();
                                    } else {
                                        periodInputRef.current?.focus();
                                    }
                                } catch (error) {
                                    console.error("Error opening picker:", error);
                                }
                            }}
                        >
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Periode:</span>
                            <input
                                ref={periodInputRef}
                                type="month"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                    <div className="toolbar-actions">
                        <button onClick={handleSendEmailAll} className="btn-modern btn-outline" disabled={isSendingAll} title="Kirim Email ke Semua Pegawai">
                            {isSendingAll ? '⏳ Sending...' : '📧 Email All'}
                        </button>
                        <button onClick={handlePdfSlipsAll} className="btn-modern btn-outline" title="Download Semua Slip Gaji (per Halaman)">📄 Slip All</button>
                        <button onClick={handlePdfAll} className="btn-modern btn-outline" title="Download Rekap Data Pegawai (Tabel)">📄 Data All</button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead>
                            <tr><th>Pegawai</th><th>Email</th><th>NPWP</th><th>Status</th><th>Masa Kerja</th><th className="text-center">Aksi</th></tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="text-center p-4">⏳ Memuat...</td></tr> :
                                filteredList.map((row) => (
                                    <tr key={row.id_pegawai}>
                                        <td><div className="user-profile"><div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div><div><div className="user-name-modern">{row.nama_lengkap}</div><div className="user-nik-modern">{row.nik}</div></div></div></td>
                                        <td style={{ fontSize: '0.9rem' }}>{row.email || '-'}</td>
                                        <td style={{ fontWeight: '600', fontSize: '0.85rem' }}>{row.npwp || '-'}</td>
                                        <td style={{ verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {row.contracts && row.contracts.length > 0 ? (
                                                    row.contracts.map((k, idx) => (
                                                        <span key={idx} className={`badge-status ${k.jenis_kontrak === 'PKWTT' || k.jenis_kontrak === 'TETAP' ? 'tetap' : 'kontrak'}`}>
                                                            {k.jenis_kontrak}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Belum ada kontrak</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                                                {(() => {
                                                    // Find earliest start date from all contracts
                                                    if (!row.contracts || row.contracts.length === 0) return <span style={{ color: '#94a3b8' }}>-</span>;

                                                    const validDates = row.contracts
                                                        .map(c => c.tanggal_mulai)
                                                        .filter(d => d && d !== '0000-00-00')
                                                        .map(d => new Date(d));

                                                    if (validDates.length === 0) return <span style={{ color: '#64748b' }}>-</span>;

                                                    const startDate = new Date(Math.min(...validDates));
                                                    const endDate = new Date(); // Masa Kerja is until NOW

                                                    let years = endDate.getFullYear() - startDate.getFullYear();
                                                    let months = endDate.getMonth() - startDate.getMonth();

                                                    if (endDate.getDate() < startDate.getDate()) months--;
                                                    if (months < 0) { years--; months += 12; }

                                                    const parts = [];
                                                    if (years > 0) parts.push(`${years} Tahun`);
                                                    if (months > 0) parts.push(`${months} Bulan`);

                                                    return (
                                                        <div>
                                                            <div>{parts.length > 0 ? parts.join(' ') : 'Kurang dari 1 Bulan'}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                                Sejak {startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="text-center aksi-full">
                                            <button onClick={() => handlePdfOne(row.id_pegawai)} className="btn-icon-modern pdf" title="Download Slip Gaji PDF">📄</button>
                                            <button
                                                onClick={() => handleSendEmail(row.id_pegawai, row.email)}
                                                className="btn-icon-modern email"
                                                title="Kirim Email Notifikasi"
                                                disabled={sendingEmailId === row.id_pegawai}
                                            >
                                                {sendingEmailId === row.id_pegawai ? '⏳' : '📧'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default SlipGaji;