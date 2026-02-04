<?php
// backend-api/modules/pegawai/send_email.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php'; // Load PHPMailer

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- CONFIG GMAIL ANDA ---
$email_pengirim = "kevin19305.ib@gmail.com"; // Email Gmail Anda
$nama_pengirim  = " HRD";
$app_password   = "sxkl vipy bfsx ljfe"; // GANTI INI DENGAN APP PASSWORD TADI

$input = json_decode(file_get_contents("php://input"));
if (!isset($input->id)) { http_response_code(400); echo json_encode(["status"=>"error"]); exit; }

try {
    // 1. Ambil Data Pegawai
    $stmt = $db->prepare("SELECT * FROM pegawai WHERE id = ?");
    $stmt->execute([$input->id]);
    $pegawai = $stmt->fetch();

    if (!$pegawai) throw new Exception("Pegawai tidak ditemukan");

    // 2. Setup PHPMailer
    $mail = new PHPMailer(true);

    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = $email_pengirim;
    $mail->Password   = $app_password;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom($email_pengirim, $nama_pengirim);
    
    // PERHATIAN: Karena di local biasanya tidak ada email asli pegawai, 
    // kita kirim ke email Anda sendiri dulu untuk testing.
    // Nanti kalau sudah production, ganti jadi: $mail->addAddress($pegawai->email);
    $mail->addAddress($email_pengirim); // Kirim ke diri sendiri dulu sbg test

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Slip Gaji - ' . $pegawai->nama_lengkap;
    $mail->Body    = "
        <h2>Halo, {$pegawai->nama_lengkap}</h2>
        <p>Berikut adalah notifikasi slip gaji Anda bulan ini.</p>
        <p><b>Jabatan:</b> {$pegawai->jabatan}<br>
        <b>Gaji Pokok:</b> Rp " . number_format($pegawai->gaji_pokok, 0, ',', '.') . "</p>
        <br>
        <p>Terima kasih,<br>Tim HRD.</p>
    ";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Email terkirim ke " . $pegawai->nama_lengkap]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Mailer Error: " . $mail->ErrorInfo]);
}
?>