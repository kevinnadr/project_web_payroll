<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"), true);

$pegawai_id = $input['pegawai_id'];
$bulan      = $input['bulan'];
$hadir      = $input['hadir'] ?? 0;
$sakit      = $input['sakit'] ?? 0;
$izin       = $input['izin'] ?? 0;
$cuti       = $input['cuti'] ?? 0;
$alpha      = $input['alpha'] ?? 0;
$telat_x    = $input['telat_x'] ?? 0; // Ambil data telat x
$telat_m    = $input['telat_m'] ?? 0; // Ambil data telat m

try {
    // Gunakan ON DUPLICATE KEY UPDATE agar jika data periode sudah ada, dia mengupdate, jika belum ada dia insert baru.
    $sql = "INSERT INTO data_absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, alpha, telat_x, telat_m) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                hadir = VALUES(hadir),
                sakit = VALUES(sakit),
                izin = VALUES(izin),
                cuti = VALUES(cuti),
                alpha = VALUES(alpha),
                telat_x = VALUES(telat_x),
                telat_m = VALUES(telat_m)";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$pegawai_id, $bulan, $hadir, $sakit, $izin, $cuti, $alpha, $telat_x, $telat_m]);

    echo json_encode(["status" => "success", "message" => "Data terupdate"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>