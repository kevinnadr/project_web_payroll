<?php
// backend-api/modules/pegawai/read.php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Cek Method (Hanya boleh GET)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit;
}

try {
    // Ambil semua data pegawai urutkan dari yang terbaru
    $sql = "SELECT * FROM pegawai ORDER BY created_at DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    
    $pegawai = $stmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "data" => $pegawai
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>