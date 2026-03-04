import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { AlertTriangle } from 'lucide-react';
import '../App.css';

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast, showToast, hideToast } = useToast();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError("Token reset password tidak valid atau tidak ditemukan.");
        }
    }, [token]);

    const handleReset = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Konfirmasi password baru tidak cocok.");
            return;
        }

        if (!token) {
            setError("Token tidak valid.");
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/reset_password.php', {
                token,
                password
            });

            if (response.data && response.data.status === 'success') {
                showToast('success', response.data.message || 'Password berhasil diubah.');
                setTimeout(() => navigate('/'), 3000);
            } else {
                setError(response.data?.message || "Terjadi kesalahan.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Gagal mereset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="logo-container">
                    <img
                        src="/LOGORAC.png"
                        alt="Logo Web Payroll"
                        className="login-logo"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://ui-avatars.com/api/?name=Payroll+App&background=4338ca&color=fff&size=200&font-size=0.25&rounded=true&bold=true";
                        }}
                    />
                </div>

                <h1 className="login-title">Reset Password</h1>
                <p className="login-subtitle">Masukkan password baru Anda di bawah ini</p>

                {error && <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} /> {error}</div>}

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label className="form-label">Password Baru</label>
                        <div className="input-wrapper">
                            <span className="input-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading || !token}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Konfirmasi Password Baru</label>
                        <div className="input-wrapper">
                            <span className="input-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                            <input
                                type="password"
                                className="form-control"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading || !token}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading || !token}>
                        {loading ? 'Memproses...' : 'SIMPAN PASSWORD BARU'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <Link to="/" className="forgot-link">Kembali ke Login</Link>
                    </div>
                </form>
            </div>
            <Toast show={toast.show} type={toast.type} message={toast.message} onClose={hideToast} />
        </div>
    );
};

export default ResetPassword;