import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import DataPegawai from './pages/DataPegawai';
import DataBPJS from './pages/DataBPJS';
import SlipGaji from './pages/SlipGaji';
import KontrakPegawai from './pages/KontrakPegawai';
import Absensi from './pages/absensi';
import PPHTer from './pages/PPHTer';
import UserManagement from './pages/UserManagement';
import DataPendapatanLain from './pages/DataPendapatanLain';
import ForgotPassword from './pages/forgotpassword';
import ResetPassword from './pages/resetpassword';
import MasterKomponen from './pages/MasterKomponen';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  if (!user || !token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  if (user && token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/data-pegawai" element={<ProtectedRoute><DataPegawai /></ProtectedRoute>} />
        <Route path="/data-bpjs" element={<ProtectedRoute><DataBPJS /></ProtectedRoute>} />
        <Route path="/slip-gaji" element={<ProtectedRoute><SlipGaji /></ProtectedRoute>} />
        <Route path="/kontrak-pegawai" element={<ProtectedRoute><KontrakPegawai /></ProtectedRoute>} />
        <Route path="/absensi" element={<ProtectedRoute><Absensi /></ProtectedRoute>} />
        <Route path="/pph-ter" element={<ProtectedRoute><PPHTer /></ProtectedRoute>} />
        <Route path="/master-komponen" element={<ProtectedRoute><MasterKomponen /></ProtectedRoute>} />
        <Route path="/pendapatan-lain" element={<ProtectedRoute><DataPendapatanLain /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />

        {/* Catch all: Redirect to dashboard if logged in, or login if not */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;