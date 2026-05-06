import React from 'react';
import { CheckCircle2, XCircle, X, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ show, type, message, onClose }) => {
    if (!show) return null;

    const isError = type === 'error';
    const isSuccess = type === 'success';
    const isWarning = type === 'warning';

    // RENDER SEBAGAI MODAL JIKA ERROR (Supaya User Pasti Notis)
    if (isError) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '28px',
                    width: '100%',
                    maxWidth: '400px',
                    padding: '40px 32px',
                    textAlign: 'center',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
                    animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    border: '1px solid #fecaca'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '20px',
                        borderRadius: '24px',
                        backgroundColor: '#fef2f2',
                        marginBottom: '24px',
                        color: '#ef4444'
                    }}>
                        <XCircle size={48} />
                    </div>

                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '800',
                        color: '#991b1b',
                        marginBottom: '12px',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}>
                        Terjadi Kesalahan
                    </h3>

                    <p style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        lineHeight: '1.6',
                        marginBottom: '32px'
                    }}>
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            border: 'none',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        SAYA MENGERTI
                    </button>
                </div>
                <style>
                    {`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes popIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                    `}
                </style>
            </div>
        );
    }

    // RENDER SEBAGAI TOAST JIKA SUCCESS / LAINNYA
    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: isSuccess ? '#f0fdf4' : (isWarning ? '#fffbeb' : '#eff6ff'),
            border: `1px solid ${isSuccess ? '#bbf7d0' : (isWarning ? '#fef3c7' : '#dbeafe')}`,
            color: isSuccess ? '#166534' : (isWarning ? '#92400e' : '#1e40af'),
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 9999,
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            maxWidth: '350px'
        }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
                {isSuccess && <CheckCircle2 size={24} color="#16a34a" />}
                {isWarning && <AlertTriangle size={24} color="#d97706" />}
                {!isSuccess && !isWarning && <Info size={24} color="#2563eb" />}
            </span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '2px' }}>
                    {isSuccess ? 'Berhasil!' : (isWarning ? 'Perhatian' : 'Info')}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.4 }}>{message}</div>
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'rgba(0,0,0,0.05)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    borderRadius: '8px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            >
                <X size={16} />
            </button>
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(100%) scale(0.9); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default Toast;
