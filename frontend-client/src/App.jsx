import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPegawai from './pages/DataPegawai';
import DataBPJS from './pages/DataBPJS';
import SlipGaji from './pages/SlipGaji';
import KontrakPegawai from './pages/KontrakPegawai';
import Absensi from './pages/Absensi';
import PPHTer from './pages/PPHTer';
import UserManagement from './pages/UserManagement';
import DataPendapatanLain from './pages/DataPendapatanLain';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MasterKomponen from './pages/MasterKomponen';

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;