<?php
/**
 * FILE: backend-api/modules/master_gaji/save_kontrak.php
 * Purpose: Save employee contract information
 * Updated to match latihan123 database schema
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

require_once '../../config/database.php';

try {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid JSON"]);
        exit;
    }

    $id_pegawai = $data['id_pegawai'] ?? null;
    $jabatan = $data['jabatan'] ?? '';
    $tanggal_mulai = $data['tanggal_mulai'] ?? null;
    $tanggal_berakhir = $data['tanggal_berakhir'] ?? null;
    $jenis_kontrak = $data['jenis_kontrak'] ?? 'TETAP';
    $gaji_pokok = (float)($data['gaji_pokok'] ?? 0);
    $tunjangan = (float)($data['tunjangan'] ?? 0);
    $id_kontrak = $data['id_kontrak'] ?? null;

    // Validate required fields
    if (!$id_pegawai) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID Pegawai tidak boleh kosong"]);
        exit;
    }

    if (!$tanggal_mulai) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Tanggal Mulai harus diisi"]);
        exit;
    }

    if (!$jabatan) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Jabatan harus diisi"]);
        exit;
    }

    // Start transaction
    $db->beginTransaction();

    // Check if contract exists for this period (no overlapping dates)
    // Exclude current contract if updating
    // Overlapping means: new start <= existing end AND (new end IS NULL OR new end >= existing start)
    $checkSql = "SELECT COUNT(*) as count FROM kontrak_kerja 
                 WHERE id_pegawai = ? 
                 AND tanggal_mulai <= ?
                 AND (tanggal_berakhir IS NULL OR tanggal_berakhir >= ?)";
    
    if ($id_kontrak) {
        $checkSql .= " AND id_kontrak != ?";
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute([$id_pegawai, $tanggal_berakhir ?? '2099-12-31', $tanggal_mulai, $id_kontrak]);
    } else {
        $checkStmt = $db->prepare($checkSql);
        $checkStmt->execute([$id_pegawai, $tanggal_berakhir ?? '2099-12-31', $tanggal_mulai]);
    }
    
    $existing = $checkStmt->fetch(PDO::FETCH_OBJ)->count ?? 0;

    if ($existing > 0) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Tanggal kontrak saling tumpang tindih dengan kontrak yang sudah ada"]);
        exit;
    }

    // Save or update kontrak
    if ($id_kontrak) {
        // Update existing
        $updateSql = "UPDATE kontrak_kerja 
                      SET jabatan = ?, tanggal_mulai = ?, tanggal_berakhir = ?, jenis_kontrak = ?
                      WHERE id_kontrak = ? AND id_pegawai = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute([$jabatan, $tanggal_mulai, $tanggal_berakhir, $jenis_kontrak, $id_kontrak, $id_pegawai]);
        $finalId = $id_kontrak;
    } else {
        // Insert new
        $insertSql = "INSERT INTO kontrak_kerja (id_pegawai, jabatan, tanggal_mulai, tanggal_berakhir, jenis_kontrak, no_kontrak) 
                      VALUES (?, ?, ?, ?, ?, ?)";
        $insertStmt = $db->prepare($insertSql);
        $noKontrak = "NK/" . $id_pegawai . "/" . date('Y') . "-" . rand(1000, 9999);
        $insertStmt->execute([$id_pegawai, $jabatan, $tanggal_mulai, $tanggal_berakhir, $jenis_kontrak, $noKontrak]);
        $finalId = $db->lastInsertId();
    }

    // Clear existing components
    $delCompSql = "DELETE FROM nominal_kontrak WHERE id_kontrak = ?";
    $delCompStmt = $db->prepare($delCompSql);
    $delCompStmt->execute([$finalId]);

    // Save Gaji Pokok component
    if ($gaji_pokok > 0) {
        $checkKompSql = "SELECT id_komponen FROM komponen_penghasilan WHERE LOWER(nama_komponen) = 'gaji pokok'";
        $kompStmt = $db->prepare($checkKompSql);
        $kompStmt->execute();
        $kompResult = $kompStmt->fetch(PDO::FETCH_OBJ);
        
        if ($kompResult) {
            $id_komponen = $kompResult->id_komponen;
        } else {
            $insertKompSql = "INSERT INTO komponen_penghasilan (nama_komponen, jenis_komponen) VALUES ('Gaji Pokok', 'BULANAN')";
            $insertKompStmt = $db->prepare($insertKompSql);
            $insertKompStmt->execute();
            $id_komponen = $db->lastInsertId();
        }

        $saveCompSql = "INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)";
        $saveCompStmt = $db->prepare($saveCompSql);
        $saveCompStmt->execute([$finalId, $id_komponen, $gaji_pokok]);
    }

    // Save Tunjangan component
    if ($tunjangan > 0) {
        $checkKompSql = "SELECT id_komponen FROM komponen_penghasilan WHERE LOWER(nama_komponen) = 'tunjangan'";
        $kompStmt = $db->prepare($checkKompSql);
        $kompStmt->execute();
        $kompResult = $kompStmt->fetch(PDO::FETCH_OBJ);
        
        if ($kompResult) {
            $id_komponen = $kompResult->id_komponen;
        } else {
            $insertKompSql = "INSERT INTO komponen_penghasilan (nama_komponen, jenis_komponen) VALUES ('Tunjangan', 'BULANAN')";
            $insertKompStmt = $db->prepare($insertKompSql);
            $insertKompStmt->execute();
            $id_komponen = $db->lastInsertId();
        }

        $saveCompSql = "INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)";
        $saveCompStmt = $db->prepare($saveCompSql);
        $saveCompStmt->execute([$finalId, $id_komponen, $tunjangan]);
    }

    $db->commit();

    echo json_encode([
        "status" => "success",
        "message" => "Kontrak telah disimpan",
        "data" => ["id_kontrak" => $finalId]
    ]);
    exit;

} catch (PDOException $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database Error: " . $e->getMessage(),
        "code" => $e->getCode()
    ]);
    exit;
} catch (Exception $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage(),
        "code" => $e->getCode()
    ]);
    exit;
}
?>
