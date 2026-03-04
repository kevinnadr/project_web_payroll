import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { AlertTriangle } from 'lucide-react';
import '../App.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast, showToast, hideToast } = useToast();
    const navigate = useNavigate();

    const handleForgot = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/request_reset.php', {
                email
            });

            if (response.data && response.data.status === 'success') {
                showToast('success', response.data.message || 'Link reset telah dikirim ke email Anda.');
                setTimeout(() => navigate('/'), 3000);
            } else {
                setError(response.data?.message || "Terjadi kesalahan.");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Gagal mengirim permintaan reset.");
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

                <h1 className="login-title">Lupa Password</h1>
                <p className="login-subtitle">Masukkan email Anda untuk menerima link reset password</p>

                {error && <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} /> {error}</div>}

                <form onSubmit={handleForgot}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <div className="input-wrapper">
                            <span className="input-icon">
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

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Mengirim...' : 'KIRIM LINK RESET'}
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

export default ForgotPassword;