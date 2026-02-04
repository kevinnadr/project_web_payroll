import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MasterGaji from './pages/MasterGaji';
import Absensi from './pages/Absensi';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserManagement from './pages/UserManagement'; // Pastikan file ini sudah dibuat

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master-gaji" element={<MasterGaji />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Rute Baru untuk Manajemen User */}
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </Router>
  )
}

export default App;