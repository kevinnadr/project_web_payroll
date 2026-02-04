<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

try {
    // Cegah hapus diri sendiri (Opsional tapi disarankan)
    // Anda bisa kirim ID user yang sedang login dari frontend untuk pengecekan ini
    
    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$input->id]);

    echo json_encode(["status" => "success", "message" => "User dihapus!"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>