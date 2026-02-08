import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPegawai from './pages/DataPegawai'; // <--- Import Ini
import MasterGaji from './pages/MasterGaji';
import Absensi from './pages/Absensi';
import UserManagement from './pages/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/data-pegawai" element={<DataPegawai />} /> {/* <--- Tambah Ini */}
        <Route path="/master-gaji" element={<MasterGaji />} />
        <Route path="/absensi" element={<Absensi />} />
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;