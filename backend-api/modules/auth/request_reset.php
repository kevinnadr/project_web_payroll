<?php
// backend-api/modules/auth/request_reset.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// GANTI DENGAN KREDENSIAL GMAIL ANDA (Sama seperti sebelumnya)
define('SMTP_USER', 'kevin19305.ib@gmail.com'); 
define('SMTP_PASS', 'sxkl vipy bfsx ljfe'); 

// URL Frontend React Anda (Pastikan port-nya benar, biasanya 5173)
define('BASE_URL_FRONTEND', 'http://localhost:5173'); 

$input = json_decode(file_get_contents("php://input"));
if (!isset($input->email)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email wajib diisi"]);
    exit;
}

$email = $input->email;

try {
    // 1. Cek apakah email terdaftar di tabel users?
    $stmt = $db->prepare("SELECT id, nama_lengkap FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Demi keamanan, jangan beri tahu jika email tidak ditemukan (prevent user enumeration)
        // Tapi untuk latihan, kita beri tahu saja biar mudah debug.
        throw new Exception("Email tidak terdaftar dalam sistem.");
    }

    // 2. Buat Token Random
    $token = bin2hex(random_bytes(32)); // 64 karakter hex

    // 3. Simpan Token ke Database
    // Hapus dulu token lama milik email ini (biar bersih)
    $db->prepare("DELETE FROM password_resets WHERE email = :email")->execute([':email' => $email]);
    
    // Simpan baru
    $insert = $db->prepare("INSERT INTO password_resets (email, token) VALUES (:email, :token)");
    $insert->execute([':email' => $email, ':token' => $token]);

    // 4. Kirim Email Link
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = SMTP_USER;
    $mail->Password   = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom(SMTP_USER, 'Red Ant Colony Security');
    $mail->addAddress($email);

    $mail->isHTML(true);
    $mail->Subject = 'Reset Password - Red Ant Colony Payroll';
    
    // Link mengarah ke Frontend React
    $link = BASE_URL_FRONTEND . "/reset-password?token=" . $token;

    $mail->Body    = "
        <h3>Permintaan Reset Password</h3>
        <p>Halo, kami menerima permintaan untuk mereset password akun Anda.</p>
        <p>Klik link di bawah ini untuk membuat password baru:</p>
        <p><a href='$link' style='background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;'>Reset Password Sekarang</a></p>
        <p>Link ini hanya berlaku 1 jam.</p>
    ";

    $mail->send();

    echo json_encode(["status" => "success", "message" => "Link reset telah dikirim ke email Anda."]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>