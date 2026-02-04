import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MasterGaji from './pages/MasterGaji'; // <-- Import Halaman Baru
import Absensi from './pages/Absensi';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Login (Halaman Utama) */}
        <Route path="/" element={<Login />} />
        
        {/* Route Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Route Fitur Lupa Password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Route Manajemen Gaji (BARU) */}
        <Route path="/master-gaji" element={<MasterGaji />} />

        <Route path="/absensi" element={<Absensi />} />
      </Routes>
    </Router>
  );
}

export default App;