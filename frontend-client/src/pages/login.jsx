// frontend-client/src/pages/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode"; // --- PENTING: Import Logic Decoder ---
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import '../App.css';

const Login = () => {
    // --- STATE ---
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast, showToast, hideToast } = useToast();

    const navigate = useNavigate();

    // --- LOGIC LOGIN MANUAL ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/login.php', {
                email, password
            });

            if (response.data && response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Cek Role (Opsional, jika ingin membedakan redirect)
                if (response.data.user.role === 'admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(response.data?.message || "Terjadi kesalahan di server (Tidak ada response JSON)."); // Tampilkan pesan error dari backend
            }
        } catch (err) {
            setError(err.response?.data?.message || "Email atau password salah.");
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC LOGIN GOOGLE (TERBARU) ---
    const handleGoogleSuccess = async (credentialResponse) => {
        setError("");
        setLoading(true);
        try {
            // 1. DECODE TOKEN DARI GOOGLE
            const decoded = jwtDecode(credentialResponse.credential);
            console.log("Data Google:", decoded);

            // 2. KIRIM DATA YANG SUDAH BERSIH KE BACKEND
            const res = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/login_google.php', {
                email: decoded.email,
                name: decoded.name
            });

            if (res.data.status === 'success') {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                showToast('success', "Login Google Berhasil!");
                setTimeout(() => navigate('/dashboard'), 1000);
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal login dengan Google.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">

                {/* LOGO PERUSAHAAN */}
                {/* Silakan ganti '/logo.png' dengan nama file logo perusahaan Anda (taruh filenya di folder frontend-client/public) */}
                <div className="logo-container">
                    <img
                        src="/LOGORAC.png"
                        alt="Logo Web Payroll"
                        className="login-logo"
                        onError={(e) => {
                            e.target.onerror = null;
                            /* Gambar default estetik jika file logo.png belum ada */
                            e.target.src = "https://ui-avatars.com/api/?name=Payroll+App&background=4338ca&color=fff&size=200&font-size=0.25&rounded=true&bold=true";
                        }}
                    />
                </div>

                <h1 className="login-title">Selamat Datang</h1>
                <p className="login-subtitle">Silakan login untuk mengakses Payroll</p>

                {error && <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} /> {error}</div>}

                <form onSubmit={handleLogin}>

                    {/* Input Email */}
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="input-wrapper">
                            <span className="input-icon">
                                {/* Envelope SVG */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            </span>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Input Password */}
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">
                                {/* Lock SVG */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Memproses...' : 'MASUK SEKARANG'}
                    </button>

                </form>

                <div className="divider">
                    <span>ATAU MASUK DENGAN</span>
                </div>

                {/* Tombol Google */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => { setError("Gagal koneksi Google"); setLoading(false); }}
                        theme="outline"
                        size="large"
                        shape="rectangular"
                        width="370"
                        logo_alignment="center"
                    />
                </div>

                {/* Perbaikan: class -> className */}
                <Link to="/forgot-password" className="forgot-link">Lupa Password Anda?</Link>

                {loading && (
                    <div style={{ marginTop: '15px', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Loader2 size={16} /> Sedang menghubungkan...
                    </div>
                )}
            </div>
            <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />
        </div>
    );
};

export default Login;