<?php
// FILE: backend-api/modules/users/create.php

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->email) || !isset($input->password) || !isset($input->nama)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

try {
    // Cek Email
    $check = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$input->email]);
    if ($check->rowCount() > 0) {
        echo json_encode(["status" => "error", "message" => "Email sudah terdaftar!"]);
        exit;
    }

    $hash = password_hash($input->password, PASSWORD_DEFAULT);
    $role = $input->role ?? 'user';

    // PERBAIKAN DI SINI: Ganti 'nama' jadi 'nama_lengkap'
    $sql = "INSERT INTO users (nama_lengkap, email, password, role) VALUES (?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    
    // Kita tetap ambil $input->nama dari frontend, tapi dimasukkan ke kolom nama_lengkap
    if ($stmt->execute([$input->nama, $input->email, $hash, $role])) {
        echo json_encode(["status" => "success", "message" => "User berhasil ditambahkan!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal simpan ke database."]);
    }

} catch (Exception $e) {
    http_response_code(500); // Kembalikan 500 jika error kodingan
    echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
}
?>