// frontend-client/src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../App.css';

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Hook untuk ambil token dari URL
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token"); 
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setMessage("❌ Token tidak ditemukan. Link mungkin rusak.");
        }
    }, [token]);

    const handleReset = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage("❌ Password konfirmasi tidak sama!");
            return;
        }

        if (password.length < 6) {
            setMessage("❌ Password minimal 6 karakter.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/reset_password.php', {
                token: token,
                password: password
            });

            if (response.data.status === 'success') {
                setMessage("✅ " + response.data.message);
                // Redirect ke login setelah 2 detik
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (error) {
            setMessage("❌ " + (error.response?.data?.message || "Gagal mereset password."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="card" style={{width: '100%', maxWidth: '400px'}}>
                <div className="card-header">
                    <h3 className="card-title">Buat Password Baru</h3>
                </div>
                
                {!token ? (
                    <div className="alert alert-error" style={{margin: '20px'}}>Link reset tidak valid.</div>
                ) : (
                    <form onSubmit={handleReset} style={{padding: '25px'}}>
                        <div style={{marginBottom: '15px'}}>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Password Baru</label>
                            <input 
                                type="password" 
                                className="form-control"
                                style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                                placeholder="Minimal 6 karakter"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Ulangi Password</label>
                            <input 
                                type="password" 
                                className="form-control"
                                style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                                placeholder="Ketik ulang password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </button>
                    </form>
                )}

                {message && (
                    <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`} style={{margin: '0 25px 25px'}}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;