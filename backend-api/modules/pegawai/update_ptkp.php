<?php
/**
 * FILE: backend-api/modules/pegawai/update_ptkp.php
 * Purpose: Update employee PTKP status
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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
    $status_ptkp = trim($data['status_ptkp'] ?? '');

    if (!$id_pegawai || !$status_ptkp) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Data tidak lengkap: id_pegawai dan status_ptkp harus diisi"]);
        exit;
    }

    // Valid PTKP values
    $validPtkp = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];
    if (!in_array($status_ptkp, $validPtkp)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Status PTKP tidak valid: $status_ptkp. Pilihan: " . implode(', ', $validPtkp)]);
        exit;
    }

    // Get or create ID from status_ptkp
    $getIdSql = "SELECT id_ptkp FROM status_ptkp WHERE status_ptkp = ?";
    $getIdStmt = $db->prepare($getIdSql);
    $getIdStmt->execute([$status_ptkp]);
    $result = $getIdStmt->fetch(PDO::FETCH_OBJ);

    if (!$result) {
        // Auto-insert jika belum ada di tabel status_ptkp
        // Mapping PTKP ke TER kategori
        $terMapping = [
            'TK/0' => 'A', 'TK/1' => 'A', 'K/0' => 'A',
            'TK/2' => 'B', 'TK/3' => 'B', 'K/1' => 'B', 'K/2' => 'B',
            'K/3' => 'C'
        ];
        $kategoriTer = $terMapping[$status_ptkp] ?? 'A';

        // Cari id_ter_reff (opsional, dari tabel pph_ter)
        $terStmt = $db->prepare("SELECT id_ter FROM pph_ter WHERE kategori_ter = ? LIMIT 1");
        $terStmt->execute([$kategoriTer]);
        $terResult = $terStmt->fetch(PDO::FETCH_OBJ);
        $id_ter_reff = $terResult ? $terResult->id_ter : null;

        $insertSql = "INSERT INTO status_ptkp (status_ptkp, id_ter_reff) VALUES (?, ?)";
        $insertStmt = $db->prepare($insertSql);
        $insertStmt->execute([$status_ptkp, $id_ter_reff]);
        $id_ptkp = $db->lastInsertId();
    } else {
        $id_ptkp = $result->id_ptkp;
    }

    // Get id_kontrak if exists
    $id_kontrak = $data['id_kontrak'] ?? null;

    if ($id_kontrak) {
        // Update Contracts
        $updateSql = "UPDATE kontrak_kerja SET id_ptkp = ? WHERE id_kontrak = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute([$id_ptkp, $id_kontrak]);
    } else {
        // Update Pegawai
        $updateSql = "UPDATE pegawai SET id_ptkp = ? WHERE id_pegawai = ?";
        $updateStmt = $db->prepare($updateSql);
        $updateStmt->execute([$id_ptkp, $id_pegawai]);
    }

    /*
    if ($updateStmt->rowCount() === 0) {
        // Cek apakah pegawai exists
        // Simplified check not strictly necessary if update succeeds quietly or 0 rows changed (same value)
    }
    */

    echo json_encode([
        "status" => "success",
        "message" => "Status PTKP berhasil diupdate menjadi $status_ptkp"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
?>
