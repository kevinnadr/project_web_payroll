<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"));
$bulan = $input->bulan ?? date('Y-m');

try {
    $db->beginTransaction();

    // 1. Ambil semua ID pegawai yang aktif
    $stmt = $db->query("SELECT id FROM data_pegawai");
    $pegawais = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Masukkan ke tabel absensi jika belum ada (Alpha Otomatis)
    $sql = "INSERT IGNORE INTO data_absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, alpha, telat_x, telat_m) 
            VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)";
    $stmtIns = $db->prepare($sql);

    foreach ($pegawais as $p) {
        $stmtIns->execute([$p['id'], $bulan]);
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data absensi $bulan berhasil disiapkan."]);
} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}