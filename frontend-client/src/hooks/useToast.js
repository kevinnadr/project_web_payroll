import { useState, useCallback, useRef, useEffect } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState({ show: false, type: '', message: '' });
    const timerRef = useRef(null);

    const showToast = useCallback((type, message) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setToast({ show: true, type, message });
        timerRef.current = setTimeout(() => {
            setToast({ show: false, type: '', message: '' });
        }, 4500);
    }, []);

    const hideToast = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setToast({ show: false, type: '', message: '' });
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { toast, showToast, hideToast };
};
