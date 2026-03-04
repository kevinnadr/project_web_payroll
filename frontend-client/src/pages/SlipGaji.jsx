import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/sidebar';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { CalendarDays, Search, Download, FileText, FileSpreadsheet, Send, FileOutput, Mail, Lock, AlertTriangle, X } from 'lucide-react';
import '../App.css';

const SlipGaji = () => {
    const [user, setUser] = useState(null);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [filteredList, setFilteredList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSendingAll, setIsSendingAll] = useState(false); // New state for bulk email
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateInput, setGenerateInput] = useState('');

    const [periodFilter, setPeriodFilter] = useState(new Date().toISOString().slice(0, 7));
    const periodInputRef = useRef(null);
    const { toast, showToast, hideToast } = useToast();
    const [zoomImage, setZoomImage] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

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

    const handleGenerateGaji = () => {
        setGenerateInput('');
        setShowGenerateModal(true);
    };

    const confirmGenerateGaji = async () => {
        setShowGenerateModal(false);
        setLoading(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/penggajian/generate_slip.php', { bulan: periodFilter });
            if (res.data.status === 'success') {
                showToast('success', res.data.message);
                fetchPegawai(); // trigger refresh
            } else {
                showToast('error', res.data.message);
            }
        } catch (e) {
            showToast('error', e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic: Search + Period
    useEffect(() => {
        let filtered = pegawaiList;

        // 1. Filter by Search Term (Removed strict Period date overlap to always show all employees)
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.nama_lengkap.toLowerCase().includes(lower) ||
                String(item.nik).includes(lower) ||
                (item.contracts && item.contracts.some(c => (c.jabatan || '').toLowerCase().includes(lower)))
            );
        }

        setFilteredList(filtered);
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [searchTerm, periodFilter, pegawaiList]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);

    // --- ACTIONS DOWNLOAD & EMAIL ---
    const handlePdfAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfSlipsAll = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_slips_all.php?bulan=${periodFilter}`, '_blank');
    const handlePdfOne = (id) => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/download_pdf_one.php?id=${id}&bulan=${periodFilter}`, '_blank');
    const handleExcelRekap = () => window.open(`http://localhost/project_web_payroll/backend-api/modules/pegawai/export_rekap_excel.php?bulan=${periodFilter}`, '_blank');


    const handleSendEmail = async (id, email) => {
        if (!email) { showToast('error', "Pegawai ini tidak memiliki email."); return; }
        if (!confirm(`Kirim notifikasi data ke email: ${email}?`)) return;
        setSendingEmailId(id);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email.php', { id, bulan: periodFilter });
            if (res.data.status === 'success') showToast('success', "Email Terkirim!");
            else showToast('error', "Gagal: " + res.data.message);
        } catch (e) { showToast('error', "Error koneksi server."); }
        finally { setSendingEmailId(null); }
    };

    const handleSendEmailAll = async () => {
        if (!confirm("Kirim slip gaji via email ke SEMUA pegawai yang memiliki email? Proses mungkin memakan waktu.")) return;
        setIsSendingAll(true);
        try {
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/pegawai/send_email_all.php', { bulan: periodFilter });
            if (res.data.status === 'success') {
                showToast('success', `Proses Selesai!\n${res.data.message}`);
            } else {
                showToast('error', "Gagal: " + res.data.message);
            }
        } catch (e) {
            showToast('error', "Error server: " + (e.response?.data?.message || e.message));
        } finally {
            setIsSendingAll(false);
        }
    };

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const getMonthLabel = (dateStr) => {
        const date = new Date(dateStr + '-01');
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="app-layout-modern">
            <Sidebar user={user} />
            <main className="main-content-modern">
                <div className="page-header-modern">
                    <div>
                        <h1 className="modern-title">Slip Gaji</h1>
                        <p className="modern-subtitle">Kelola dan Download Slip Gaji Pegawai.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* PERIOD PILL */}
                        <div
                            style={{ position: 'relative', cursor: 'pointer' }}
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
                            <div style={{
                                background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '30px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                                <span>Periode: {getMonthLabel(periodFilter)}</span>
                                <span style={{ opacity: 0.7, display: 'flex' }}><CalendarDays size={18} /></span>
                            </div>
                            <input
                                ref={periodInputRef}
                                type="month"
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    opacity: 0, pointerEvents: 'none',
                                    zIndex: -1
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="toolbar-modern">
                    <div className="search-box">
                        <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={18} color="#64748b" /></span>
                        <input type="text" placeholder="Cari Nama / NIK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-modern btn-outline" onClick={handleGenerateGaji} style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }} title="Mengkalkulasi ulang slip gaji bulan ini">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Lock size={18} /> Generate Gaji</span>
                        </button>
                        <button onClick={handlePdfSlipsAll} className="btn-modern btn-outline" style={{ borderColor: '#3b82f6', color: '#3b82f6' }} title="Download Semua Slip Gaji (per Halaman)">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Download size={18} /> Slip All ({periodFilter})</span>
                        </button>
                        <button onClick={handlePdfAll} className="btn-modern btn-outline">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FileText size={18} /> Recap PDF</span>
                        </button>
                        <button onClick={handleExcelRekap} className="btn-modern btn-outline" style={{ borderColor: '#16a34a', color: '#16a34a' }} title="Download Recap Excel">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><FileSpreadsheet size={18} /> Recap Excel</span>
                        </button>
                        <button onClick={handleSendEmailAll} className="btn-modern btn-gradient" disabled={isSendingAll} title="Kirim Email ke Semua Pegawai">
                            {isSendingAll ? '⏳ Sending...' : <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Send size={18} /> Email All</span>}
                        </button>
                    </div>
                </div>

                <div className="table-container-modern">
                    <table className="modern-table">
                        <thead style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)' }}>
                            <tr>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Nama Pegawai</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Email</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>NPWP</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Status</th>
                                <th style={{ textAlign: 'center', background: 'transparent', color: 'white' }}>Masa Kerja</th>
                                <th className="text-center" style={{ background: 'transparent', color: 'white' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="text-center p-4">⏳ Memuat...</td></tr> :
                                currentItems.length === 0 ? <tr><td colSpan="6" className="text-center p-4" style={{ color: '#64748b' }}>Data tidak ditemukan</td></tr> :
                                    currentItems.map((row) => (
                                        <tr key={row.id_pegawai}>
                                            <td onClick={() => navigate('/data-pegawai', { state: { search: row.nik } })} style={{ cursor: 'pointer', textAlign: 'left' }} title="Klik untuk lihat detail pegawai">
                                                <div className="user-profile" style={{ justifyContent: 'flex-start' }}>
                                                    {row.foto_profil ? (
                                                        <img
                                                            src={`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`}
                                                            alt="Profile"
                                                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setZoomImage(`http://localhost/project_web_payroll/backend-api/uploads/pegawai/${row.foto_profil}`);
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="avatar-circle">{row.nama_lengkap.charAt(0)}</div>
                                                    )}
                                                    <div>
                                                        <div className="user-name-modern">{row.nama_lengkap}</div>
                                                        <div className="user-nik-modern">{row.nik}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                                                            {row.contracts && row.contracts.length > 0 ? row.contracts[0].jabatan : '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.9rem', textAlign: 'left' }}>{row.email || '-'}</td>
                                            <td style={{ fontWeight: '600', fontSize: '0.85rem', textAlign: 'center' }}>{row.npwp || '-'}</td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                                                    {row.contracts && row.contracts.length > 0 ? (
                                                        [...new Set(row.contracts.map(c => c.jenis_kontrak))].map((type, idx) => (
                                                            <span key={idx} style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                backgroundColor: (type === 'PKWTT' || type === 'TETAP') ? '#dcfce7' : '#fef9c3',
                                                                color: (type === 'PKWTT' || type === 'TETAP') ? '#166534' : '#854d0e',
                                                                border: '1px solid',
                                                                borderColor: (type === 'PKWTT' || type === 'TETAP') ? '#bbf7d0' : '#fde047',
                                                                letterSpacing: '0.02em',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {type}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
                                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>No Contract</span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate('/kontrak-pegawai'); }}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    fontSize: '0.7rem',
                                                                    background: '#eff6ff',
                                                                    color: '#2563eb',
                                                                    border: '1px solid #bfdbfe',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 600
                                                                }}
                                                                title="Tambah Kontrak"
                                                            >
                                                                + Add
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
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
                                                <button onClick={() => handlePdfOne(row.id_pegawai)} className="btn-icon-modern pdf" title="Download Slip Gaji PDF"><FileOutput size={18} /></button>
                                                <button
                                                    onClick={() => handleSendEmail(row.id_pegawai, row.email)}
                                                    className="btn-icon-modern email"
                                                    title="Kirim Email Notifikasi"
                                                    disabled={sendingEmailId === row.id_pegawai}
                                                >
                                                    {sendingEmailId === row.id_pegawai ? '⏳' : <Mail size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '15px' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                        >
                            Prev
                        </button>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f8fafc' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#475569', fontWeight: 600 }}
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* MODAL GENERATE GAJI */}
                {showGenerateModal && (
                    <div className="modal-backdrop">
                        <div className="modal-content-modern" style={{ width: '450px' }}>
                            <div className="modal-header-modern" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                                <h3><span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}><Lock size={20} /> Generate Gaji ({getMonthLabel(periodFilter)})</span></h3>
                                <button type="button" onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '4px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                                    <div style={{ fontSize: '0.9rem', color: '#92400e', lineHeight: '1.5' }}>
                                        <strong>Peringatan!</strong><br />
                                        Anda akan mengunci perhitungan gaji untuk periode <b>{getMonthLabel(periodFilter)}</b>. Data slip sebelumnya di bulan ini akan dihapus & diganti perhitungan terbaru. Apakah Anda yakin ingin melanjutkan?
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                    <button onClick={() => setShowGenerateModal(false)} className="btn-modern btn-outline" style={{ border: '1px solid #cbd5e1', color: '#475569' }}>Batal</button>
                                    <button onClick={confirmGenerateGaji} className="btn-modern" style={{ background: '#8b5cf6', color: 'white', border: 'none' }}>Proses Generate</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {zoomImage && (
                    <div
                        className="modal-overlay"
                        style={{
                            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                            background: 'rgba(0,0,0,0.8)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            zIndex: 9999,
                            cursor: 'zoom-out'
                        }}
                        onClick={() => setZoomImage(null)}
                    >
                        <img
                            src={zoomImage}
                            alt="Zoom"
                            style={{
                                maxWidth: '90%',
                                maxHeight: '90%',
                                borderRadius: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                objectFit: 'contain'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setZoomImage(null)}
                            style={{
                                position: 'absolute', top: '20px', right: '30px', background: 'white',
                                color: '#ef4444', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                                fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}
                <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />
            </main>
        </div>
    );
};

export default SlipGaji;