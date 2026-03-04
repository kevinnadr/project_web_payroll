<?php
// backend-api/modules/pendapatan_lain/delete.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id)) {
    echo json_encode(["status" => "error", "message" => "ID tidak valid."]);
    exit;
}

try {
    $sql = "DELETE FROM pendapatan_lain WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$data->id]);

    echo json_encode(["status" => "success", "message" => "Data berhasil dihapus."]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
