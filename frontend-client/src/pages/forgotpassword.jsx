// frontend-client/src/pages/ForgotPassword.jsx
import { useState } from 'react';
import axios from 'axios';
import '../App.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRequest = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await axios.post('http://localhost/project_web_payroll/backend-api/modules/auth/request_reset.php', {
                email: email
            });
            if (response.data.status === 'success') {
                setMessage("✅ " + response.data.message);
            }
        } catch (error) {
            setMessage("❌ " + (error.response?.data?.message || "Gagal mengirim email"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="card" style={{width: '100%', maxWidth: '400px'}}>
                <div className="card-header">
                    <h3 className="card-title">Lupa Password?</h3>
                </div>
                <p style={{padding: '0 25px', color: '#666'}}>Masukkan email Anda, kami akan mengirimkan link reset.</p>
                
                <form onSubmit={handleRequest} style={{padding: '25px'}}>
                    <div style={{marginBottom: '15px'}}>
                        <input 
                            type="email" 
                            className="form-control" // Asumsi class input
                            style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd'}}
                            placeholder="Contoh: nama@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading}>
                        {loading ? 'Mengirim Link...' : 'Kirim Link Reset'}
                    </button>

                    <div style={{marginTop: '15px', textAlign: 'center'}}>
                        <a href="/" style={{textDecoration: 'none', color: '#2563eb'}}>Kembali ke Login</a>
                    </div>
                </form>

                {message && (
                    <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`} style={{margin: '0 25px 25px'}}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;