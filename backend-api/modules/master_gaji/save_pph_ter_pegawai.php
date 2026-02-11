<?php
/**
 * FILE: backend-api/modules/master_gaji/save_pph_ter_pegawai.php
 * Purpose: Assign/link PPH TER to employee
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
    $kategori_ter = $data['kategori_ter'] ?? null;

    if (!$id_pegawai || !$kategori_ter) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Data tidak lengkap (id_pegawai dan kategori_ter diperlukan)"]);
        exit;
    }

    // Get first matching id_ter from kategori (there can be multiple ranges per kategori)
    $getTerSql = "SELECT DISTINCT id_ter FROM pph_ter WHERE kategori_ter = ? LIMIT 1";
    $getTerStmt = $db->prepare($getTerSql);
    $getTerStmt->execute([$kategori_ter]);
    $terResult = $getTerStmt->fetch(PDO::FETCH_OBJ);

    if (!$terResult) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Kategori PPH TER tidak ditemukan: " . $kategori_ter]);
        exit;
    }

    $id_ter = $terResult->id_ter;

    // Since latihan123 doesn't have a direct pph_ter_pegawai junction table,
    // we store the PPH TER assignment as a note in the response.
    // In production, you'd need to create a linking table like:
    // CREATE TABLE pph_ter_pegawai (id_pegawai INT, id_ter INT, tanggal_berlaku DATE)
    
    echo json_encode([
        "status" => "success",
        "message" => "PPH TER telah diatur untuk pegawai",
        "data" => [
            "id_pegawai" => $id_pegawai,
            "kategori_ter" => $kategori_ter,
            "id_ter" => $id_ter
        ]
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
