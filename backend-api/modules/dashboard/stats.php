<?php
// FILE: backend-api/modules/dashboard/stats.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Hitung Total Pegawai Aktif
    $stmtPegawai = $db->query("SELECT COUNT(*) as total FROM pegawai");
    $total_pegawai = $stmtPegawai->fetch(PDO::FETCH_ASSOC)['total'];

    // 2. Hitung Statistik Absensi Bulan Ini (Hadir, Sakit, Izin, Cuti)
    $sqlAbsen = "SELECT 
                    SUM(hadir) as total_hadir,
                    SUM(sakit) as total_sakit,
                    SUM(izin) as total_izin,
                    SUM(cuti) as total_cuti,
                    SUM(terlambat) as total_telat
                 FROM absensi 
                 WHERE bulan = ?";
    $stmtAbsen = $db->prepare($sqlAbsen);
    $stmtAbsen->execute([$bulan]);
    $absensi = $stmtAbsen->fetch(PDO::FETCH_ASSOC);

    // 3. Hitung Total Alpha (Dari tabel absensi_alpha)
    $sqlAlpha = "SELECT SUM(jumlah_alpha) as total_alpha FROM absensi_alpha WHERE bulan = ?";
    $stmtAlpha = $db->prepare($sqlAlpha);
    $stmtAlpha->execute([$bulan]);
    $alpha = $stmtAlpha->fetch(PDO::FETCH_ASSOC);

    // Kirim Data JSON
    echo json_encode([
        "status" => "success",
        "data" => [
            "total_pegawai" => (int)$total_pegawai,
            "hadir" => (int)($absensi['total_hadir'] ?? 0),
            "sakit" => (int)($absensi['total_sakit'] ?? 0),
            "izin"  => (int)($absensi['total_izin'] ?? 0),
            "cuti"  => (int)($absensi['total_cuti'] ?? 0),
            "alpha" => (int)($alpha['total_alpha'] ?? 0),
            "telat" => (int)($absensi['total_telat'] ?? 0)
        ]
    ]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>