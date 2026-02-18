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
                COALESCE(a.hari_efektif, 25) as hari_efektif,
                GREATEST(0, COALESCE(a.hari_efektif, 25) - (COALESCE(a.hadir,0) + COALESCE(a.sakit,0) + COALESCE(a.izin,0) + COALESCE(a.cuti,0))) as alpha,
                COALESCE(a.hari_terlambat, 0) as hari_terlambat, 
                COALESCE(a.menit_terlambat, 0) as menit_terlambat,
                COALESCE(a.jam_lembur, 0) as jam_lembur
            FROM pegawai p
            LEFT JOIN (
                SELECT 
                    id_pegawai,
                    SUM(hadir) as hadir,
                    SUM(sakit) as sakit,
                    SUM(izin) as izin,
                    SUM(cuti) as cuti,
                    SUM(hari_terlambat) as hari_terlambat,
                    SUM(menit_terlambat) as menit_terlambat,
                    SUM(jam_lembur) as jam_lembur,
                    MAX(hari_efektif) as hari_efektif
                FROM absensi
                WHERE `date` LIKE ?
                GROUP BY id_pegawai
            ) a ON p.id_pegawai = a.id_pegawai
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan . '%']);

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