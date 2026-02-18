import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPegawai from './pages/DataPegawai';
import DataBPJS from './pages/DataBPJS';
import SlipGaji from './pages/SlipGaji';
import KontrakPegawai from './pages/KontrakPegawai';
import Absensi from './pages/Absensi';
import PPHTer from './pages/PPHTer';
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/data-pegawai" element={<DataPegawai />} />
        <Route path="/data-bpjs" element={<DataBPJS />} />
        <Route path="/slip-gaji" element={<SlipGaji />} />
        <Route path="/kontrak-pegawai" element={<KontrakPegawai />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/pph-ter" element={<PPHTer />} />
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;