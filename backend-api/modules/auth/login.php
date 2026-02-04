<?php
// 1. Load Konfigurasi & Library
require_once '../../config/cors.php';      // Izin akses React
require_once '../../config/database.php';  // Koneksi DB
require_once '../../vendor/autoload.php';  // Library JWT

use Firebase\JWT\JWT;

// 2. Ambil Data JSON dari React
// Kita tidak bisa pakai $_POST karena React kirim body raw JSON
$input = json_decode(file_get_contents("php://input"));

// 3. Validasi Input Sederhana
if (!isset($input->email) || !isset($input->password)) {
    http_response_code(400); // Bad Request
    echo json_encode(["status" => "error", "message" => "Email dan Password wajib diisi"]);
    exit();
}

$email = $input->email;
$password = $input->password;

try {
    // 4. Cek User di Database
    $query = "SELECT * FROM users WHERE email = :email LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();
    
    $user = $stmt->fetch();

    // 5. Verifikasi Password
    // password_verify akan mencocokkan input user dengan hash di database
    if ($user && password_verify($password, $user->password)) {
        
        // 6. Buat Token JWT
        // GANTI baris secret key lama dengan ini:
        // Ganti jadi minimal 32 karakter
        $secret_key = "rahasia_negara_hawk_payroll_harus_lebih_panjang_biar_aman_2026"; // Ganti dengan string acak yang panjang & rumit nanti
        $issuer_claim = "localhost"; // Server name
        $audience_claim = "THE_AUDIENCE";
        $issuedat_claim = time(); // Waktu dibuat
        $expire_claim = $issuedat_claim + 3600; // Expire dalam 1 jam (3600 detik)
        
        $token_payload = array(
            "iss" => $issuer_claim,
            "aud" => $audience_claim,
            "iat" => $issuedat_claim,
            "exp" => $expire_claim,
            "data" => array(
                "id" => $user->id,
                "nama" => $user->nama_lengkap,
                "email" => $user->email,
                "role" => $user->role
            )
        );

        $jwt = JWT::encode($token_payload, $secret_key, 'HS256');

        // 7. Kirim Response Sukses
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Login Berhasil",
            "token" => $jwt,
            "user" => [
                "nama" => $user->nama_lengkap,
                "role" => $user->role
            ]
        ]);

    } else {
        // Password Salah atau User Tidak Ditemukan
        http_response_code(401); // Unauthorized
        echo json_encode(["status" => "error", "message" => "Email atau Password salah"]);
    }

} catch (Exception $e) {
    http_response_code(500); // Server Error
    echo json_encode(["status" => "error", "message" => "Terjadi kesalahan server: " . $e->getMessage()]);
}
?>