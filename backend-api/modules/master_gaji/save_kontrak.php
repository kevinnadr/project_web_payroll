<?php
/**
 * FILE: backend-api/modules/master_gaji/save_kontrak.php
 * Save employee contract + komponen penghasilan via nominal_kontrak
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["status" => "error", "message" => "Method not allowed"]); exit; }

require_once '../../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) { http_response_code(400); echo json_encode(["status" => "error", "message" => "Invalid JSON"]); exit; }

    $id_pegawai      = $data['id_pegawai'] ?? null;
    $jabatan         = $data['jabatan'] ?? '';
    $tanggal_mulai   = $data['tanggal_mulai'] ?? null;
    $tanggal_berakhir = $data['tanggal_berakhir'] ?? null;
    $jenis_kontrak   = $data['jenis_kontrak'] ?? 'TETAP';
    $gaji_pokok      = (float)($data['gaji_pokok'] ?? 0);
    $tunjangan       = (float)($data['tunjangan'] ?? 0);
    $id_kontrak      = $data['id_kontrak'] ?? null;
    $komponen_tambahan = $data['komponen_tambahan'] ?? [];

    if (!$id_pegawai) { http_response_code(400); echo json_encode(["status" => "error", "message" => "ID Pegawai harus diisi"]); exit; }
    if (!$tanggal_mulai) { http_response_code(400); echo json_encode(["status" => "error", "message" => "Tanggal Mulai harus diisi"]); exit; }
    if (!$jabatan) { http_response_code(400); echo json_encode(["status" => "error", "message" => "Jabatan harus diisi"]); exit; }

    // Normalize empty string to null for logic comparison and DB storage
    if (empty($tanggal_berakhir)) {
        $tanggal_berakhir = null;
    }

    // Check for Overlapping Contracts
    try {
        $checkSql = "SELECT id_kontrak, tanggal_mulai, tanggal_berakhir FROM kontrak_kerja WHERE id_pegawai = ?";
        $checkParams = [$id_pegawai];
        
        if ($id_kontrak) {
            $checkSql .= " AND id_kontrak != ?";
            $checkParams[] = $id_kontrak;
        }
        
        $stmtCheck = $db->prepare($checkSql);
        $stmtCheck->execute($checkParams);
        $existingContracts = $stmtCheck->fetchAll(PDO::FETCH_ASSOC);

        foreach ($existingContracts as $ex) {
            $exStart = $ex['tanggal_mulai'];
            $exEnd   = $ex['tanggal_berakhir']; // null means indefinite/present
            
            // Overlap logic: (StartA <= EndB) AND (EndA >= StartB)
            // Treating NULL as Infinity
            
            // Check 1: New Start <= Existing End
            // If Existing End is NULL (Infinity), then New Start is definitely <= Infinity (Always True)
            // Otherwise check string comparison
            $cond1 = ($exEnd === null) || ($tanggal_mulai <= $exEnd);
            
            // Check 2: New End >= Existing Start
            // If New End is NULL (Infinity), then Infinity >= Existing Start (Always True)
            // Otherwise check string comparison
            $cond2 = ($tanggal_berakhir === null) || ($tanggal_berakhir >= $exStart);
            
            if ($cond1 && $cond2) {
                // Formatting date for error message
                $exEndStr = $exEnd ? date('d M Y', strtotime($exEnd)) : 'Sekarang';
                $exStartStr = date('d M Y', strtotime($exStart));
                
                http_response_code(400);
                echo json_encode([
                    "status" => "error",
                    "message" => "Periode kontrak tumpang tindih dengan kontrak lain ($exStartStr - $exEndStr)."
                ]);
                exit;
            }
        }
    } catch (Exception $checkEx) {
        // Continue, or handle error? If check fails, safe to fail secure
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Error checking overlap: " . $checkEx->getMessage()]);
        exit;
    }

    $db->beginTransaction();

    // Save or update kontrak
    if ($id_kontrak) {
        $updateSql = "UPDATE kontrak_kerja SET jabatan = ?, tanggal_mulai = ?, tanggal_berakhir = ?, jenis_kontrak = ? WHERE id_kontrak = ? AND id_pegawai = ?";
        $db->prepare($updateSql)->execute([$jabatan, $tanggal_mulai, $tanggal_berakhir, $jenis_kontrak, $id_kontrak, $id_pegawai]);
        $finalId = $id_kontrak;
    } else {
        $noKontrak = "NK/" . $id_pegawai . "/" . date('Y') . "-" . rand(1000, 9999);
        $insertSql = "INSERT INTO kontrak_kerja (id_pegawai, jabatan, tanggal_mulai, tanggal_berakhir, jenis_kontrak, no_kontrak) VALUES (?, ?, ?, ?, ?, ?)";
        $db->prepare($insertSql)->execute([$id_pegawai, $jabatan, $tanggal_mulai, $tanggal_berakhir, $jenis_kontrak, $noKontrak]);
        $finalId = $db->lastInsertId();
    }

    // Clear existing nominal_kontrak for this contract
    $db->prepare("DELETE FROM nominal_kontrak WHERE id_kontrak = ?")->execute([$finalId]);

    // Helper: get or create komponen_penghasilan by name
    $getOrCreateKomponen = function($nama, $jenis = 'BULANAN') use ($db) {
        $stmt = $db->prepare("SELECT id_komponen FROM komponen_penghasilan WHERE LOWER(nama_komponen) = LOWER(?) LIMIT 1");
        $stmt->execute([$nama]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row['id_komponen'];
        
        $db->prepare("INSERT INTO komponen_penghasilan (nama_komponen, jenis_komponen) VALUES (?, ?)")->execute([$nama, $jenis]);
        return $db->lastInsertId();
    };

    // Save Gaji Pokok
    if ($gaji_pokok > 0) {
        $idKomp = $getOrCreateKomponen('Gaji Pokok', 'BULANAN');
        $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)")->execute([$finalId, $idKomp, $gaji_pokok]);
    }

    // Save Tunjangan Tetap
    if ($tunjangan > 0) {
        $idKomp = $getOrCreateKomponen('Tunjangan Tetap', 'BULANAN');
        $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)")->execute([$finalId, $idKomp, $tunjangan]);
    }

    // Save Komponen Tambahan (Uang Makan, etc.)
    if (is_array($komponen_tambahan)) {
        foreach ($komponen_tambahan as $komp) {
            $nama = $komp['nama'] ?? '';
            $nominal = (float)($komp['nominal'] ?? 0);
            $tipe = strtoupper($komp['tipe'] ?? 'BULANAN');
            if ($nama && $nominal > 0) {
                $idKomp = $getOrCreateKomponen($nama, $tipe);
                $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)")->execute([$finalId, $idKomp, $nominal]);
            }
        }
    }

    $db->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Kontrak berhasil disimpan",
        "data" => ["id_kontrak" => $finalId]
    ]);

} catch (PDOException $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
} catch (Exception $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
