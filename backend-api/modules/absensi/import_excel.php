<?php
// FILE: backend-api/modules/absensi/import_excel.php
// Updated to match latihan123 database schema
require_once '../../config/database.php';
require_once '../../config/cors.php';

header("Content-Type: application/json");

$input = json_decode(file_get_contents("php://input"), true);
$bulan = $input['bulan'] ?? date('Y-m');
$data = $input['data'] ?? [];

if (!$bulan || empty($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

$errors = [];

try {
    $db->beginTransaction();
    $date = $bulan . '-01'; // Use first day of month for all records
    
    // For each row, find pegawai_id from nik and insert/update absensi
    foreach ($data as $idx => $rowOrig) {
        $rowNum = $idx + 1;
        
        // normalize keys to lowercase
        $row = [];
        foreach ($rowOrig as $k => $v) { 
            $row[strtolower(trim($k))] = $v; 
        }

        // Get id_pegawai from nik
        $nikSql = "SELECT id_pegawai FROM pegawai WHERE nik = ?";
        $nikStmt = $db->prepare($nikSql);
        $nikStmt->execute([$row['nik'] ?? '']);
        $pegawaiResult = $nikStmt->fetch(PDO::FETCH_OBJ);

        if (!$pegawaiResult) {
            $errors[] = "Baris {$rowNum}: NIK '{$row['nik']}' tidak ditemukan";
            continue;
        }

        $id_pegawai = $pegawaiResult->id_pegawai;
        $hadir = (int)($row['hadir'] ?? 0);
        $sakit = (int)($row['sakit'] ?? 0);
        $izin = (int)($row['izin'] ?? 0);
        $cuti = (int)($row['cuti'] ?? 0);
        $hari_terlambat = (int)($row['hariterlambat'] ?? $row['hari_terlambat'] ?? $row['telat_frekuensi'] ?? $row['telat_x'] ?? 0);
        $menit_terlambat = (int)($row['menitterlambat'] ?? $row['menit_terlambat'] ?? $row['telat_menit'] ?? $row['telat_m'] ?? 0);
        $hari_efektif = (int)($row['hari_efektif'] ?? $input['hari_efektif'] ?? 20); // Default 20 working days

        // Insert or update absensi
        $sql = "INSERT INTO absensi 
                (id_pegawai, hari_efektif, hadir, sakit, izin, cuti, hari_terlambat, menit_terlambat, date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    hari_efektif = VALUES(hari_efektif),
                    hadir = VALUES(hadir),
                    sakit = VALUES(sakit),
                    izin = VALUES(izin),
                    cuti = VALUES(cuti),
                    hari_terlambat = VALUES(hari_terlambat),
                    menit_terlambat = VALUES(menit_terlambat)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$id_pegawai, $hari_efektif, $hadir, $sakit, $izin, $cuti, $hari_terlambat, $menit_terlambat, $date]);
    }

    $db->commit();
    
    if (!empty($errors)) {
        echo json_encode([
            "status" => "warning", 
            "message" => "Berhasil mengimpor " . (count($data) - count($errors)) . " dari " . count($data) . " data",
            "errors" => $errors
        ]);
    } else {
        echo json_encode([
            "status" => "success", 
            "message" => "Berhasil mengimpor " . count($data) . " data absensi"
        ]);
    }
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}