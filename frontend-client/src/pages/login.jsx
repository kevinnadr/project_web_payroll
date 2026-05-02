// frontend-client/src/pages/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
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
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Menyiapkan Sesi...");
    const { toast, showToast, hideToast } = useToast();

    const navigate = useNavigate();

    const messages = [
        "Verifikasi Akun...",
        "Mengambil Data Sesi...",
        "Menyiapkan Dashboard...",
        "Hampir Selesai...",
        "Selamat Datang!"
    ];

    const startTransition = () => {
        setIsRedirecting(true);
        let currentIdx = 0;
        const interval = setInterval(() => {
            if (currentIdx < messages.length - 1) {
                currentIdx++;
                setLoadingMessage(messages[currentIdx]);
            }
        }, 500);

        setTimeout(() => {
            clearInterval(interval);
            navigate('/dashboard');
        }, 2800); // Jeda sekitar 2.8 detik
    };

    // --- LOGIC LOGIN MANUAL ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post(import.meta.env.VITE_API_URL + '/modules/auth/login.php', {
                email, password
            });

            if (response.data && response.data.status === 'success') {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                startTransition();
            } else {
                setError(response.data?.message || "Email atau password salah.");
                setLoading(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Terjadi kesalahan koneksi.");
            setLoading(false);
        }
    };

    // --- LOGIC LOGIN GOOGLE (TERBARU) ---
    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setError("");
            setLoading(true);
            try {
                // 1. Ambil data user dari Google menggunakan Access Token
                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );

                console.log("Data Google:", userInfo.data);

                // 2. KIRIM DATA YANG SUDAH BERSIH KE BACKEND
                const res = await axios.post(import.meta.env.VITE_API_URL + '/modules/auth/login_google.php', {
                    email: userInfo.data.email,
                    name: userInfo.data.name
                });

                if (res.data.status === 'success') {
                    localStorage.setItem('token', res.data.token);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    startTransition();
                } else {
                    setError(res.data.message);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setError(err.response?.data?.message || "Gagal login dengan Google.");
                setLoading(false);
            }
        },
        onError: () => {
            setError("Gagal koneksi Google");
            setLoading(false);
        }
    });

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
                
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                    <button 
                        type="button" 
                        onClick={() => loginWithGoogle()}
                        disabled={loading}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            opacity: loading ? 0.7 : 1
                        }}
                        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Login dengan Google
                    </button>
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

            {/* FULL SCREEN LOADING TRANSITION */}
            {isRedirecting && (
                <div className="login-loading-overlay">
                    <div className="loading-content-simple">
                        <Loader2 className="spinner-icon" size={48} />
                        <p>Mohon Tunggu...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;