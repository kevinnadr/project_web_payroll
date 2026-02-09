<?php
// backend-api/modules/absensi/export_excel.php
require_once '../../config/database.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="Laporan_Absensi_'.$bulan.'.csv"');

$output = fopen('php://output', 'w');
fputcsv($output, ['NIK', 'Nama Pegawai', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Telat (x)', 'Telat (m)']);

$sql = "SELECT p.nik, p.nama_lengkap, a.hadir, a.sakit, a.izin, a.alpha, a.telat_x, a.telat_m 
        FROM data_pegawai p
        JOIN data_absensi a ON p.id = a.pegawai_id 
        WHERE a.bulan = ?";
$stmt = $db->prepare($sql);
$stmt->execute([$bulan]);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    fputcsv($output, $row);
}

fclose($output);
exit;