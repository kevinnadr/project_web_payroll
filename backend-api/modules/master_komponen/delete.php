<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? '';

if (empty($id)) {
    echo json_encode(["status" => "error", "message" => "ID tidak boleh kosong"]);
    exit;
}

try {
    $stmt = $db->prepare("DELETE FROM master_komponen WHERE id = :id");
    $stmt->execute([':id' => $id]);

    // Optional: Reset auto increment
    $db->exec("ALTER TABLE master_komponen AUTO_INCREMENT = 1");

    echo json_encode(["status" => "success", "message" => "Komponen berhasil dihapus"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
