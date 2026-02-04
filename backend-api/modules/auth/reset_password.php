<?php
// backend-api/modules/auth/reset_password.php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->token) || !isset($input->password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
    exit;
}

$token = $input->token;
$password_baru = $input->password;

try {
    // 1. Cek Validitas Token
    $stmt = $db->prepare("SELECT email FROM password_resets WHERE token = :token LIMIT 1");
    $stmt->execute([':token' => $token]);
    $reset_request = $stmt->fetch();

    if (!$reset_request) {
        http_response_code(400); // Bad Request
        echo json_encode(["status" => "error", "message" => "Token tidak valid atau sudah kadaluarsa."]);
        exit;
    }

    $email = $reset_request->email;

    // 2. Hash Password Baru
    $password_hash = password_hash($password_baru, PASSWORD_BCRYPT);

    // 3. Update Password di Tabel Users
    $update = $db->prepare("UPDATE users SET password = :pass WHERE email = :email");
    $update->execute([':pass' => $password_hash, ':email' => $email]);

    // 4. Hapus Token (Sekali Pakai)
    $delete = $db->prepare("DELETE FROM password_resets WHERE email = :email");
    $delete->execute([':email' => $email]);

    echo json_encode(["status" => "success", "message" => "Password berhasil diubah! Silakan login."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>