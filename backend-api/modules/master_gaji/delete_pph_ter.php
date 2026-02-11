<?php
/**
 * FILE: backend-api/modules/master_gaji/delete_pph_ter.php
 * Purpose: Delete PPH TER record
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
    $id = $data['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID tidak ditemukan"]);
        exit;
    }

    $sql = "DELETE FROM pph_ter WHERE id_ter = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$id]);

    echo json_encode([
        "status" => "success",
        "message" => "PPH TER berhasil dihapus"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
