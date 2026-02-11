<?php
// FILE: backend-api/modules/dashboard/stats.php
// Updated to match latihan123 database schema
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Hitung Total Pegawai Aktif
    $stmtPegawai = $db->query("SELECT COUNT(*) as total FROM pegawai");
    $total_pegawai = $stmtPegawai->fetch(PDO::FETCH_OBJ)->total ?? 0;

    // 2. Hitung Statistik Absensi Bulan Pelaporan berdasarkan DATE YEAR-MONTH
    $bulan_format = $bulan . '%'; // Format YYYY-MM%
    $sqlAbsen = "SELECT 
                    SUM(hadir) as total_hadir,
                    SUM(sakit) as total_sakit,
                    SUM(izin) as total_izin,
                    SUM(cuti) as total_cuti,
                    SUM(hari_terlambat) as total_hari_telat,
                    SUM(menit_terlambat) as total_menit_telat,
                    COUNT(*) as total_records
                 FROM absensi 
                 WHERE DATE_FORMAT(date, '%Y-%m') = ?";
    $stmtAbsen = $db->prepare($sqlAbsen);
    $stmtAbsen->execute([$bulan]);
    $absensi = $stmtAbsen->fetch(PDO::FETCH_OBJ);

    // 3. Hitung Total Alpha (hari_efektif - (hadir + izin + sakit + cuti))
    $sqlAlpha = "SELECT 
                    SUM(COALESCE(hari_efektif, 0) - (COALESCE(hadir, 0) + COALESCE(izin, 0) + COALESCE(sakit, 0) + COALESCE(cuti, 0))) as total_alpha
                 FROM absensi 
                 WHERE DATE_FORMAT(date, '%Y-%m') = ?";
    $stmtAlpha = $db->prepare($sqlAlpha);
    $stmtAlpha->execute([$bulan]);
    $alpha = $stmtAlpha->fetch(PDO::FETCH_OBJ);

    // Kirim Data JSON
    echo json_encode([
        "status" => "success",
        "data" => [
            "total_pegawai" => (int)$total_pegawai,
            "hadir" => (int)($absensi->total_hadir ?? 0),
            "sakit" => (int)($absensi->total_sakit ?? 0),
            "izin"  => (int)($absensi->total_izin ?? 0),
            "cuti"  => (int)($absensi->total_cuti ?? 0),
            "alpha" => (int)($alpha->total_alpha ?? 0),
            "telat_hari" => (int)($absensi->total_hari_telat ?? 0),
            "telat_menit" => (int)($absensi->total_menit_telat ?? 0)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>