import React from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const Toast = ({ show, type, message, onClose }) => {
    if (!show) return null;

    const isSuccess = type === 'success';

    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: isSuccess ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
            color: isSuccess ? '#166534' : '#991b1b',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 9999,
            animation: 'slideUp 0.3s ease-out'
        }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{isSuccess ? <CheckCircle2 size={24} color="#16a34a" /> : <XCircle size={24} color="#dc2626" />}</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{message}</span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginLeft: '10px',
                    color: 'inherit',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                }}
            >
                <X size={18} />
            </button>
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default Toast;
