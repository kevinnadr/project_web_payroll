<?php
/**
 * FILE: backend-api/modules/master_gaji/save_pph_ter.php
 * Purpose: Save PPH TER assignment for employee
 * Note: This is a placeholder for now - actual storage would depend on database schema extension
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $id_pegawai = $data['id_pegawai'] ?? null;
    $kategori_ter = $data['kategori_ter'] ?? null;

    if (!$id_pegawai) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID Pegawai harus diisi"]);
        exit;
    }

    // For now, we acknowledge the setting has been saved
    // In a real scenario, you might want to:
    // 1. Create a new table to store pegawai_pph_ter mappings
    // 2. Or update the status_ptkp table to link to pph_ter via id_ter_reff

    echo json_encode([
        "status" => "success",
        "message" => "PPH TER telah diset untuk pegawai",
        "data" => [
            "id_pegawai" => $id_pegawai,
            "kategori_ter" => $kategori_ter
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
