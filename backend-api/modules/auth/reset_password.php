<?php
// FILE: backend-api/modules/auth/reset_password.php

require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

// 1. Validasi Input
if (!isset($input->token) || !isset($input->password)) {
    http_response_code(400); 
    echo json_encode(["status"=>"error", "message"=>"Data tidak lengkap"]); 
    exit;
}

try {
    // -----------------------------------------------------------
    // LANGKAH 1: Cek Token di Tabel 'password_resets'
    // -----------------------------------------------------------
    // (Kita sesuaikan dengan screenshot Anda: kolomnya 'token' dan 'email')
    $stmt = $db->prepare("SELECT email, created_at FROM password_resets WHERE token = ? LIMIT 1");
    $stmt->execute([$input->token]);
    $resetData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$resetData) {
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "Token salah atau sudah digunakan."]);
        exit;
    }

    // Cek Kadaluarsa (Misal: Token hanya berlaku 1 jam dari created_at)
    $waktu_dibuat = strtotime($resetData['created_at']);
    $selisih_waktu = time() - $waktu_dibuat; // dalam detik

    if ($selisih_waktu > 3600) { // 3600 detik = 1 Jam
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "Link reset password sudah kadaluarsa (lebih dari 1 jam)."]);
        exit;
    }

    $email_user = $resetData['email'];

    // -----------------------------------------------------------
    // LANGKAH 2: Ambil Password Lama di Tabel 'users'
    // -----------------------------------------------------------
    $stmtUser = $db->prepare("SELECT password FROM users WHERE email = ?");
    $stmtUser->execute([$email_user]);
    $userLogin = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$userLogin) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Email tidak ditemukan di tabel Users."]);
        exit;
    }

    // -----------------------------------------------------------
    // LANGKAH 3: Cek Password Baru vs Lama
    // -----------------------------------------------------------
    if (password_verify($input->password, $userLogin['password'])) {
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "Password baru tidak boleh sama dengan password lama!"]);
        exit;
    }

    // -----------------------------------------------------------
    // LANGKAH 4: Update Password di Tabel 'users'
    // -----------------------------------------------------------
    $new_hash = password_hash($input->password, PASSWORD_DEFAULT);
    
    $updateUser = $db->prepare("UPDATE users SET password = ? WHERE email = ?");
    $updateUser->execute([$new_hash, $email_user]);

    // -----------------------------------------------------------
    // LANGKAH 5: Hapus Token di Tabel 'password_resets'
    // -----------------------------------------------------------
    // Hapus semua request reset milik email ini biar bersih
    $deleteToken = $db->prepare("DELETE FROM password_resets WHERE email = ?");
    $deleteToken->execute([$email_user]);

    echo json_encode(["status" => "success", "message" => "Password Berhasil Diubah! Silakan Login."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>