import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../App.css';

const MasterGaji = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // --- STATE DATA ---
    const [aturan, setAturan] = useState({
        jam_masuk_kantor: '08:00',
        denda_keterlambatan_awal: 0,
        denda_per_15_menit: 0,
        denda_alpha: 100000 
    });
    const [listPegawai, setListPegawai] = useState([]);

    // --- STATE MODAL ---
    const [showModalGaji, setShowModalGaji] = useState(false);
    const [showModalAturan, setShowModalAturan] = useState(false);
    
    // --- FORM GAJI PERSONAL ---
    const [formGaji, setFormGaji] = useState({
        pegawai_id: '',
        nama_lengkap: '',
        gaji_pokok: 0,
        hari_kerja_efektif: 20,
        komponen: [] 
    });

    const [newKomp, setNewKomp] = useState({ nama: '', jenis: 'penerimaan', tipe: 'fixed', nominal: 0 });

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
        try {
            // Menggunakan folder master_gaji yang benar
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/read.php');
            if (res.data.status === 'success') {
                setListPegawai(res.data.data); 
                fetchAturan();
            }
        } catch (e) { console.error("Gagal load data gaji:", e); }
    };

    const fetchAturan = async () => {
        try {
            const res = await axios.get('http://localhost/project_web_payroll/backend-api/modules/master_gaji/get_aturan.php');
            if(res.data.status === 'success') setAturan(res.data.data);
        } catch(e) { console.error("Gagal load aturan:", e); }
    };

    // --- LOGIC 1: ATURAN GLOBAL (POPUP) ---
    const handleSaveAturan = async () => {
        if(!confirm("Simpan perubahan aturan denda?")) return;
        try {
            await axios.post('http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_aturan.php', aturan);
            alert("✅ Aturan Berhasil Disimpan");
            setShowModalAturan(false);
            fetchAturan();
        } catch (e) { alert("Gagal simpan aturan"); }
    };

    // --- LOGIC 2: GAJI PERSONAL ---
    const openModalGaji = (pegawai) => {
        // PERBAIKAN: Pastikan komponen dibaca dengan benar dari backend
        // Backend mengirim key 'komponen_tambahan', bukan 'komponen'
        const komponenList = pegawai.komponen_tambahan || [];

        setFormGaji({
            pegawai_id: pegawai.id,
            nama_lengkap: pegawai.nama_lengkap,
            gaji_pokok: pegawai.gaji_pokok || 0, 
            hari_kerja_efektif: pegawai.hari_kerja_efektif || 20,
            
            // Mapping ulang agar sesuai format form
            komponen: komponenList.map(k => ({
                nama_komponen: k.nama_komponen, 
                jenis: k.jenis,
                tipe_hitungan: k.tipe_hitungan,
                nominal: k.nominal
            }))
        });
        setShowModalGaji(true);
    };

    const addKomponenToForm = () => {
        if(!newKomp.nama || newKomp.nominal <= 0) return alert("Nama dan Nominal harus diisi!");
        
        const newItem = {
            nama_komponen: newKomp.nama,
            jenis: newKomp.jenis,
            tipe_hitungan: newKomp.tipe,
            nominal: parseInt(newKomp.nominal)
        };

        setFormGaji({ ...formGaji, komponen: [...formGaji.komponen, newItem] });
        setNewKomp({ nama: '', jenis: 'penerimaan', tipe: 'fixed', nominal: 0 }); 
    };

    const removeKomponen = (index) => {
        const updated = [...formGaji.komponen];
        updated.splice(index, 1);
        setFormGaji({ ...formGaji, komponen: updated });
    };

    const handleSaveGajiPegawai = async () => {
        setLoading(true);
        try {
            // Endpoint ke folder master_gaji
            const url = 'http://localhost/project_web_payroll/backend-api/modules/master_gaji/save_gaji_pegawai.php';
            const res = await axios.post(url, formGaji);
            
            if (res.data.status === 'success') {
                alert("✅ Setting Gaji Pegawai Tersimpan!");
                setShowModalGaji(false);
                fetchData(); 
            } else {
                alert("❌ Gagal: " + res.data.message);
            }
        } catch (e) { 
            console.error(e);
            alert("Gagal simpan data. Cek koneksi backend."); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="app-layout">
            <Sidebar user={user} />
            <main className="main-content">
                
                {/* --- HEADER PAGE --- */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Master Data Gaji</h1>
                        <p className="page-subtitle">Atur Gaji Pokok & Tunjangan per Pegawai.</p>
                    </div>
                    {/* TOMBOL POPUP ATURAN DENDA */}
                    <button onClick={() => setShowModalAturan(true)} className="btn btn-warning">
                        ⚙️ Setting Rule Denda
                    </button>
                </div>

                {/* --- LIST PEGAWAI --- */}
                <div className="card">
                    <div className="card-header"><span className="card-title">👥 Daftar Gaji Pegawai</span></div>
                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Nama Pegawai</th>
                                    <th>Jabatan</th>
                                    <th>Gaji Pokok</th>
                                    <th>Hari Efektif</th>
                                    <th width="35%">Komponen Tambahan</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listPegawai.length > 0 ? listPegawai.map((p, idx) => (
                                    <tr key={p.id || idx}>
                                        <td style={{fontWeight:'bold'}}>{p.nama_lengkap}</td>
                                        <td><span className="badge-gray">{p.jabatan}</span></td>
                                        <td style={{fontWeight:'bold', color:'#1e293b'}}>
                                            Rp {parseInt(p.gaji_pokok || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td>{p.hari_kerja_efektif || 20} Hari</td>
                                        <td>
                                            {/* Perbaikan Tampilan Komponen */}
                                            {p.komponen_tambahan && p.komponen_tambahan.length > 0 ? (
                                                <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                                                    {p.komponen_tambahan.map((k, kIdx) => (
                                                        <span key={kIdx} className={`badge-komp ${k.jenis === 'penerimaan' ? 'bg-green' : 'bg-red'}`}>
                                                            {k.nama_komponen} 
                                                            {k.tipe_hitungan === 'harian' && <span className="dot-harian" title="Hitungan Harian">•</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{color:'#cbd5e1', fontSize:'0.8rem', fontStyle:'italic'}}>- Default -</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <button onClick={() => openModalGaji(p)} className="btn btn-sm bg-blue">⚙️ Atur</button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="text-center" style={{padding:'20px', color:'#94a3b8'}}>Data tidak ditemukan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* --- MODAL 1: SETTING RULE GLOBAL --- */}
            {showModalAturan && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{width:'500px'}}>
                        <div className="modal-header">
                            <span className="card-title">⚖️ Aturan Denda & Jam Kerja</span>
                            <button onClick={()=>setShowModalAturan(false)} className="close-btn">❌</button>
                        </div>
                        <div style={{padding:'20px'}}>
                            <div className="form-group" style={{marginBottom:'15px'}}>
                                <label>Jam Masuk Kantor</label>
                                <input type="time" className="form-input" value={aturan.jam_masuk_kantor} 
                                    onChange={e => setAturan({...aturan, jam_masuk_kantor: e.target.value})} />
                                <small>Lewat dari jam ini sistem mencatat terlambat.</small>
                            </div>
                            <div className="form-group" style={{marginBottom:'15px'}}>
                                <label>Denda Telat Awal (Flat)</label>
                                <div className="input-group">
                                    <span>Rp</span>
                                    <input type="number" className="form-input" value={aturan.denda_keterlambatan_awal} 
                                        onChange={e => setAturan({...aturan, denda_keterlambatan_awal: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-group" style={{marginBottom:'15px'}}>
                                <label>Denda Per 15 Menit</label>
                                <div className="input-group">
                                    <span>Rp</span>
                                    <input type="number" className="form-input" value={aturan.denda_per_15_menit} 
                                        onChange={e => setAturan({...aturan, denda_per_15_menit: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-group" style={{marginBottom:'20px'}}>
                                <label>Denda Alpha / Mangkir (Per Hari)</label>
                                <div className="input-group">
                                    <span>Rp</span>
                                    <input type="number" className="form-input" value={aturan.denda_alpha} 
                                        onChange={e => setAturan({...aturan, denda_alpha: e.target.value})} />
                                </div>
                                <small>Dikenakan jika pegawai Alpha (Tanpa Keterangan).</small>
                            </div>

                            <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                                <button onClick={()=>setShowModalAturan(false)} className="btn btn-secondary">Batal</button>
                                <button onClick={handleSaveAturan} className="btn btn-primary">Simpan Aturan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: SETTING GAJI PERSONAL --- */}
            {showModalGaji && (
                <div className="modal-overlay">
                    <div className="modal-card" style={{width:'750px'}}>
                        <div className="modal-header">
                            <span className="card-title">💰 Setting Gaji: <strong>{formGaji.nama_lengkap}</strong></span>
                            <button onClick={()=>setShowModalGaji(false)} className="close-btn">❌</button>
                        </div>
                        <div style={{padding:'20px', maxHeight:'85vh', overflowY:'auto'}}>
                            
                            <div className="alert-info">
                                <strong>Info:</strong> Perubahan Gaji Pokok di sini juga akan mengupdate data di menu Pegawai.
                            </div>

                            {/* 1. Gaji Pokok */}
                            <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #e2e8f0'}}>
                                <h4 style={{marginTop:0, color:'#334155'}}>1. Gaji Pokok & Hari Kerja</h4>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                                    <div>
                                        <label>Gaji Pokok (Rp)</label>
                                        <input type="number" className="form-input" value={formGaji.gaji_pokok} 
                                            onChange={e => setFormGaji({...formGaji, gaji_pokok: e.target.value})} />
                                    </div>
                                    <div>
                                        <label>Hari Kerja Efektif (per Bulan)</label>
                                        <input type="number" className="form-input" value={formGaji.hari_kerja_efektif} 
                                            onChange={e => setFormGaji({...formGaji, hari_kerja_efektif: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Tabel Komponen */}
                            <h4 style={{marginTop:0, color:'#334155'}}>2. Komponen Tambahan (Personal)</h4>
                            <div className="table-responsive" style={{marginBottom:'15px', border:'1px solid #e2e8f0', borderRadius:'6px'}}>
                                <table className="custom-table" style={{fontSize:'0.9rem'}}>
                                    <thead>
                                        <tr style={{background:'#f1f5f9'}}>
                                            <th>Nama Komponen</th>
                                            <th>Jenis</th>
                                            <th>Tipe Hitungan</th>
                                            <th>Nominal</th>
                                            <th>Hapus</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formGaji.komponen.map((k, idx) => (
                                            <tr key={idx}>
                                                <td>{k.nama_komponen}</td>
                                                <td><span className={k.jenis === 'penerimaan' ? 'text-green' : 'text-red'}>{k.jenis === 'penerimaan' ? '(+) Tunjangan' : '(-) Potongan'}</span></td>
                                                <td>
                                                    {k.tipe_hitungan === 'harian' ? <span className="badge-harian">📅 Per Kehadiran</span> : <span className="badge-fixed">🔒 Bulanan (Tetap)</span>}
                                                </td>
                                                <td>Rp {parseInt(k.nominal).toLocaleString('id-ID')}</td>
                                                <td><button onClick={()=>removeKomponen(idx)} className="btn-del">❌</button></td>
                                            </tr>
                                        ))}
                                        {formGaji.komponen.length === 0 && <tr><td colSpan="5" className="text-center" style={{padding:'20px', color:'#94a3b8'}}>Belum ada data. Tambahkan di bawah.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. Form Tambah */}
                            <div style={{background:'#eff6ff', padding:'15px', borderRadius:'8px', border:'1px dashed #3b82f6'}}>
                                <h5 style={{margin:'0 0 10px 0', color:'#1e40af'}}>+ Tambah Komponen Baru</h5>
                                <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1.2fr 1.5fr 0.5fr', gap:'10px', alignItems:'end'}}>
                                    <div><label style={{fontSize:'0.8rem'}}>Nama</label><input className="form-input" style={{padding:'5px'}} value={newKomp.nama} onChange={e=>setNewKomp({...newKomp, nama:e.target.value})} placeholder="ex: Uang Makan" /></div>
                                    <div><label style={{fontSize:'0.8rem'}}>Jenis</label><select className="form-input" style={{padding:'5px'}} value={newKomp.jenis} onChange={e=>setNewKomp({...newKomp, jenis:e.target.value})}><option value="penerimaan">➕ Plus</option><option value="potongan">➖ Minus</option></select></div>
                                    <div><label style={{fontSize:'0.8rem'}}>Hitungan</label><select className="form-input" style={{padding:'5px'}} value={newKomp.tipe} onChange={e=>setNewKomp({...newKomp, tipe:e.target.value})}><option value="fixed">Fixed</option><option value="harian">Harian</option></select></div>
                                    <div><label style={{fontSize:'0.8rem'}}>Nominal</label><input type="number" className="form-input" style={{padding:'5px'}} value={newKomp.nominal} onChange={e=>setNewKomp({...newKomp, nominal:e.target.value})} /></div>
                                    <button onClick={addKomponenToForm} className="btn btn-primary" style={{height:'35px', padding:'0 10px'}}>Add</button>
                                </div>
                            </div>

                            <div style={{display:'flex', justifyContent:'flex-end', marginTop:'20px', gap:'10px'}}>
                                <button onClick={()=>setShowModalGaji(false)} className="btn btn-secondary">Batal</button>
                                <button onClick={handleSaveGajiPegawai} className="btn btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* Button Header */
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .btn-warning { background: #f59e0b; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(245, 158, 11, 0.3); transition: 0.2s; }
                .btn-warning:hover { background: #d97706; transform: translateY(-2px); }

                /* Badges & Text */
                .badge-gray { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: #475569; }
                .badge-komp { padding: 4px 8px; borderRadius: 6px; fontSize: 0.75rem; margin-right: 5px; margin-bottom: 5px; color: white; display: inline-block; position: relative; }
                .bg-green { background: #10b981; } .bg-red { background: #ef4444; }
                .dot-harian { position: absolute; top: -2px; right: -2px; color: #fef9c3; font-size: 1.2rem; line-height: 0.5; text-shadow: 0 0 2px rgba(0,0,0,0.5); }
                
                .badge-harian { background: #fef9c3; color: #854d0e; padding: 2px 8px; borderRadius: 12px; fontSize: 0.75rem; fontWeight: bold; border: 1px solid #fde047; }
                .badge-fixed { background: #e0e7ff; color: #3730a3; padding: 2px 8px; borderRadius: 12px; fontSize: 0.75rem; fontWeight: bold; border: 1px solid #c7d2fe; }
                .text-green { color: #166534; fontWeight: bold; } .text-red { color: #dc2626; fontWeight: bold; }
                .btn-del { border: none; background: none; cursor: pointer; opacity: 0.7; font-size: 0.9rem; } .btn-del:hover { opacity: 1; transform: scale(1.2); color: red; }
                .alert-info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; color: #1e40af; font-size: 0.85rem; margin-bottom: 20px; border-radius: 4px; }

                /* Inputs */
                .input-group { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 10px; background: white; }
                .input-group span { color: #64748b; margin-right: 5px; font-weight: bold; }
                .input-group input { border: none; width: 100%; outline: none; padding: 8px 0; }
                
                /* Modal Shared */
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
                .modal-card { background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: popIn 0.3s; }
                .modal-header { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; align-items: center; }
                .close-btn { border: none; background: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
                .form-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 5px; font-size: 0.9rem; }
                .btn-secondary { background: #cbd5e1; color: #334155; padding: 8px 16px; border-radius: 6px; border:none; cursor: pointer; }
                
                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default MasterGaji;