<?php
// FILE: backend-api/modules/users/update.php

require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->id)) {
    echo json_encode(["status"=>"error", "message"=>"ID User diperlukan"]); exit;
}

try {
    // PERBAIKAN: Ganti 'nama' jadi 'nama_lengkap' di SQL
    if (!empty($input->password)) {
        $hash = password_hash($input->password, PASSWORD_DEFAULT);
        $sql = "UPDATE users SET nama_lengkap=?, email=?, role=?, password=? WHERE id=?";
        $params = [$input->nama, $input->email, $input->role, $hash, $input->id];
    } else {
        $sql = "UPDATE users SET nama_lengkap=?, email=?, role=? WHERE id=?";
        $params = [$input->nama, $input->email, $input->role, $input->id];
    }

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode(["status" => "success", "message" => "Data user diperbarui!"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
}
?>