<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id)) {
    echo json_encode(["status" => "error", "message" => "ID tidak ditemukan"]);
    exit;
}

try {
    $stmt = $db->prepare("DELETE FROM absensi WHERE id = ?");
    $stmt->execute([$data->id]);
    
    echo json_encode(["status" => "success", "message" => "Data berhasil dihapus"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>