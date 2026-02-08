<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->id)) {
    http_response_code(400);
    exit;
}

try {
    $stmt = $db->prepare("DELETE FROM komponen_gaji WHERE id = :id");
    $stmt->execute([':id' => $input->id]);
    echo json_encode(["status" => "success", "message" => "Dihapus!"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>