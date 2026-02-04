<?php
// FILE: backend-api/modules/users/read.php

require_once '../../config/cors.php';
require_once '../../config/database.php';

try {
    // PERBAIKAN: Ambil 'nama_lengkap' tapi kita kasih nama panggilan 'nama'
    // supaya React tidak bingung.
    $stmt = $db->query("SELECT id, nama_lengkap as nama, email, role FROM users ORDER BY id DESC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $users]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>