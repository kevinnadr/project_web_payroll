<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

try {
    $stmt = $db->query("SELECT * FROM komponen_gaji ORDER BY jenis ASC, nama_komponen ASC");
    $data = $stmt->fetchAll();

    echo json_encode(["status" => "success", "data" => $data]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>