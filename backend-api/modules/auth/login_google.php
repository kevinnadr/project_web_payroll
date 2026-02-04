<?php
// FILE: backend-api/modules/auth/login_google.php

require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->email)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email wajib ada"]);
    exit;
}

try {
    $email = $input->email;
    $nama = $input->name ?? 'User Google';
    
    // 1. Cek apakah email sudah ada di database?
    // PENTING: Kita SELECT 'role' dan 'nama_lengkap' biar data terbaru terambil
    $stmt = $db->prepare("SELECT id, nama_lengkap, email, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // --- A. JIKA USER SUDAH ADA ---
        // Kita pakai data yang ada di database (termasuk Role Admin yang baru Anda set)
        $userData = [
            'id' => $user['id'],
            'nama' => $user['nama_lengkap'],
            'email' => $user['email'],
            'role' => $user['role'] // <--- Pastikan ini terambil dari DB
        ];

    } else {
        // --- B. JIKA USER BARU (Belum pernah login) ---
        // Buat user baru dengan role default 'user'
        $sql = "INSERT INTO users (nama_lengkap, email, role, password) VALUES (?, ?, 'user', '')";
        $insert = $db->prepare($sql);
        $insert->execute([$nama, $email]);
        
        $newId = $db->lastInsertId();
        
        $userData = [
            'id' => $newId,
            'nama' => $nama,
            'email' => $email,
            'role' => 'user' // Default user baru
        ];
    }

    // --- KIRIM RESPON KE FRONTEND ---
    echo json_encode([
        "status" => "success",
        "token" => "dummy-token-jwt", // Bisa diganti JWT beneran nanti
        "user" => $userData // React akan membaca role dari sini
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>