<?php
// backend-api/modules/auth/login_google.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';
require_once '../../vendor/firebase/php-jwt/src/JWT.php'; // Reuse library JWT yg lama
use Firebase\JWT\JWT;

// GANTI DENGAN CLIENT ID DARI LANGKAH 1
define('GOOGLE_CLIENT_ID', '660359693361-74atum72unng9r2itfm10pg3k80gse03.apps.googleusercontent.com');

$input = json_decode(file_get_contents("php://input"));

if (!isset($input->credential)) {
    http_response_code(400); echo json_encode(["status"=>"error", "message"=>"Token Google kosong"]); exit;
}

try {
    // 1. Verifikasi Token ke Google
    $client = new Google_Client(['client_id' => GOOGLE_CLIENT_ID]);
    $payload = $client->verifyIdToken($input->credential);

    if (!$payload) {
        throw new Exception("Token Google tidak valid.");
    }

    $email_google = $payload['email'];

    // 2. Cek apakah email ini terdaftar di database kita?
    $stmt = $db->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->execute([':email' => $email_google]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new Exception("Email Google ini ($email_google) belum terdaftar di sistem HAWK Payroll.");
    }

    // 3. Login Sukses -> Buat Token Sesi (Sama seperti login.php biasa)
    // Ganti jadi minimal 32 karakter
$secret_key = "rahasia_negara_hawk_payroll_harus_lebih_panjang_biar_aman_2026"; // Samakan dengan login.php lama
    $issuedAt = time();
    $expirationTime = $issuedAt + 3600; // 1 jam
    
    $token_payload = [
        'iat' => $issuedAt,
        'exp' => $expirationTime,
        'data' => [
            'id' => $user->id,
            'nama' => $user->nama_lengkap,
            'email' => $user->email
        ]
    ];

    $jwt = JWT::encode($token_payload, $secret_key, 'HS256');

    echo json_encode([
        "status" => "success",
        "message" => "Login Google Berhasil!",
        "token" => $jwt,
        "user" => [
            "id" => $user->id,
            "nama" => $user->nama_lengkap,
            "email" => $user->email
        ]
    ]);

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>