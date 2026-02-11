<?php
// FILE: backend-api/modules/pegawai/send_email.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Gunakan FPDF untuk membuat attachment slip gaji
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

$data = json_decode(file_get_contents("php://input"));
$id = $data->id ?? 0;
$bulan = $data->bulan ?? date('Y-m'); // Mengambil bulan dari request frontend

try {
    // 1. AMBIL DATA DARI RIWAYAT GAJI (Snapshot)
    $sql = "SELECT p.nama_lengkap, p.email, p.nik, k.jabatan, r.* FROM riwayat_gaji r
            JOIN data_pegawai p ON r.pegawai_id = p.id
            JOIN kontrak_kerja k ON p.id = k.id_pegawai
            WHERE p.id = :id AND r.bulan = :bulan";
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $id, ':bulan' => $bulan]);
    $gaji = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$gaji) {
        echo json_encode(["status" => "error", "message" => "Slip gaji periode $bulan belum digenerate untuk pegawai ini."]);
        exit;
    }

    if (empty($gaji['email'])) {
        echo json_encode(["status" => "error", "message" => "Email pegawai tidak terdaftar."]);
        exit;
    }

    // 2. GENERATE PDF SLIP GAJI DI MEMORI (Tanpa Simpan File)
    $pdf = new FPDF();
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->Cell(0, 10, 'SLIP GAJI KARYAWAN', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 7, 'Periode: ' . $bulan, 0, 1, 'C');
    $pdf->Ln(10);

    $pdf->Cell(35, 7, 'Nama / NIK', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $gaji['nama_lengkap'] . ' / ' . $gaji['nik'], 0, 1);
    $pdf->Cell(35, 7, 'Jabatan', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $gaji['jabatan'], 0, 1);
    $pdf->Line(10, $pdf->GetY() + 2, 200, $pdf->GetY() + 2);
    $pdf->Ln(5);

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(100, 7, 'Penerimaan', 0, 0); $pdf->Cell(0, 7, 'Nominal', 0, 1, 'R');
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(100, 7, 'Gaji Pokok', 0, 0); $pdf->Cell(0, 7, 'Rp ' . number_format($gaji['gaji_pokok']), 0, 1, 'R');

    $rincian = json_decode($gaji['rincian_komponen'], true);
    foreach ($rincian as $item) {
        $prefix = ($item['jenis'] == 'penerimaan') ? '' : '- ';
        $pdf->Cell(100, 7, $item['nama'], 0, 0);
        $pdf->Cell(0, 7, $prefix . 'Rp ' . number_format($item['nilai']), 0, 1, 'R');
    }

    $pdf->Line(120, $pdf->GetY() + 2, 200, $pdf->GetY() + 2);
    $pdf->Ln(5);
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(100, 10, 'GAJI BERSIH (THP)', 0, 0);
    $pdf->Cell(0, 10, 'Rp ' . number_format($gaji['gaji_bersih']), 0, 1, 'R');

    $pdf_binary = $pdf->Output('S'); // Output sebagai string binary

    // 3. KIRIM VIA PHPMAILER
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com'; 
    $mail->SMTPAuth   = true;
    $mail->Username   = 'kevin19305.ib@gmail.com'; // Masukkan Email Gmail Anda
    $mail->Password   = 'sxkl vipy bfsx ljfe';    // Masukkan APP PASSWORD (bukan password akun)
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('payroll@perusahaan.com', 'HRD Payroll System');
    $mail->addAddress($gaji['email'], $gaji['nama_lengkap']);

    $mail->isHTML(true);
    $mail->Subject = 'Slip Gaji Digital - Periode ' . $bulan;
    $mail->Body    = "Halo <b>{$gaji['nama_lengkap']}</b>,<br><br>Terlampir adalah slip gaji Anda untuk periode <b>$bulan</b>.<br>Silakan unduh lampiran PDF di bawah ini.<br><br>Salam,<br>HRD Team";

    // LAMPIRKAN PDF DARI VARIABEL (Tanpa simpan file di server)
    $mail->addStringAttachment($pdf_binary, "Slip_Gaji_{$gaji['nik']}_{$bulan}.pdf");

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Email slip gaji berhasil dikirim ke " . $gaji['email']]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Gagal: " . $mail->ErrorInfo]);
}
?>