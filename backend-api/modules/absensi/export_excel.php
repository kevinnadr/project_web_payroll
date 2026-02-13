<?php
// backend-api/modules/absensi/export_excel.php
require_once '../../config/database.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="Laporan_Absensi_'.$bulan.'.csv"');

$output = fopen('php://output', 'w');
fputcsv($output, ['NIK', 'Nama Pegawai', 'Hadir', 'Sakit', 'Izin', 'Cuti', 'Hari Efektif', 'Alpha', 'Telat (Hari)', 'Telat (Menit)', 'Lembur (Jam)']);

try {
    // Calculate Alpha dynamically: Hari Efektif - (Hadir + Sakit + Izin + Cuti)
    // Use COALESCE to default to 0 if record doesn't exist
    $sql = "SELECT 
                p.nik, 
                p.nama_lengkap, 
                COALESCE(a.hadir, 0) as hadir, 
                COALESCE(a.sakit, 0) as sakit, 
                COALESCE(a.izin, 0) as izin, 
                COALESCE(a.cuti, 0) as cuti,
                COALESCE(a.hari_efektif, p.hari_efektif, 25) as hari_efektif,
                GREATEST(0, COALESCE(a.hari_efektif, p.hari_efektif, 25) - (COALESCE(a.hadir,0) + COALESCE(a.sakit,0) + COALESCE(a.izin,0) + COALESCE(a.cuti,0))) as alpha,
                COALESCE(a.hari_terlambat, 0) as hari_terlambat, 
                COALESCE(a.menit_terlambat, 0) as menit_terlambat,
                COALESCE(a.jam_lembur, 0) as jam_lembur
            FROM pegawai p
            LEFT JOIN absensi a ON p.id_pegawai = a.id_pegawai AND DATE_FORMAT(a.date, '%Y-%m') = ?
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($output, $row);
    }
} catch (Exception $e) {
    // If error, writing to CSV output might be messy, but better than silent fail
    fputcsv($output, ['Error', $e->getMessage()]);
}

fclose($output);
exit;
?>