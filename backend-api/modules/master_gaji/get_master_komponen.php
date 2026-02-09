<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $stmt = $db->query("SELECT id, nama_komponen, jenis, tipe_hitungan, nominal FROM komponen_gaji ORDER BY jenis ASC, nama_komponen ASC");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "data" => $data]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>