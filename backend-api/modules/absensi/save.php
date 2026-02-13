<?php
// FILE: backend-api/modules/absensi/save.php
// Updated to match latihan123 database schema
require_once '../../config/database.php';
require_once '../../config/cors.php';

header("Content-Type: application/json");

$input = json_decode(file_get_contents("php://input"), true);

$id_pegawai     = $input['id_pegawai'] ?? $input['pegawai_id'] ?? null;
$bulan          = $input['bulan'] ?? date('Y-m');
$hadir          = (int)($input['hadir'] ?? 0);
$sakit          = (int)($input['sakit'] ?? 0);
$izin           = (int)($input['izin'] ?? 0);
$cuti           = (int)($input['cuti'] ?? 0);
$hari_efektif   = (int)($input['hari_efektif'] ?? 20);
$hari_terlambat = (int)($input['hari_terlambat'] ?? $input['telat_x'] ?? 0);
$menit_terlambat= (int)($input['menit_terlambat'] ?? $input['telat_m'] ?? 0);

if (!$id_pegawai) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID Pegawai harus diisi"]);
    exit;
}

try {
    // Create date from bulan (using first day of month)
    $date = $bulan . '-01';
    
    $jam_lembur     = (int)($input['jam_lembur'] ?? 0);
    
    // Insert or update absensi record for this employee and date
    // For monthly data, we store one record per employee per month
    $sql = "INSERT INTO absensi 
            (id_pegawai, hari_efektif, hadir, sakit, izin, cuti, hari_terlambat, menit_terlambat, jam_lembur, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                hari_efektif = VALUES(hari_efektif),
                hadir = VALUES(hadir),
                sakit = VALUES(sakit),
                izin = VALUES(izin),
                cuti = VALUES(cuti),
                hari_terlambat = VALUES(hari_terlambat),
                menit_terlambat = VALUES(menit_terlambat),
                jam_lembur = VALUES(jam_lembur)";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$id_pegawai, $hari_efektif, $hadir, $sakit, $izin, $cuti, $hari_terlambat, $menit_terlambat, $jam_lembur, $date]);

    echo json_encode([
        "status" => "success", 
        "message" => "Data absensi berhasil disimpan"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>