<?php
// FILE: backend-api/modules/pegawai/send_email_all.php
// Mengirim data slip gaji (Preview dari Kontrak) via Email KE SEMUA PEGAWAI

error_reporting(E_ALL);
ini_set('display_errors', 0); // Hide errors from output, catch them instead

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer; 
use PHPMailer\PHPMailer\Exception;

// Jika FPDF belum diload oleh composer (misal manual setup)
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
} else {
    require_once('../../vendor/setasign/fpdf/fpdf.php');
}

// Set time limit to avoid timeout for bulk sending
set_time_limit(300); 

try {
    // 1. AMBIL DATA SEMUA PEGAWAI & KONTRAK YANG PUNYA EMAIL
    $sql = "SELECT p.*, k.id_kontrak, k.jabatan, k.jenis_kontrak 
            FROM pegawai p
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            WHERE p.email IS NOT NULL AND p.email != ''";
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pegawaiList) {
        throw new Exception("Tidak ada pegawai dengan email yang ditemukan.");
    }

    $successCount = 0;
    $failCount = 0;
    $errors = [];

    // Setup Mailer Instance (Reuse connection if possible, or new per loop)
    // For simplicity and to avoid state issues, we re-config inside or use a helper.
    
    foreach ($pegawaiList as $pegawai) {
        try {
            // 2. AMBIL KOMPONEN GAJI (Dari Nominal Kontrak)
            // Jika pegawai tidak punya kontrak/id_kontrak null, skip atau kirim kosong?
            // Kita asumsikan hanya yang punya kontrak yang dapat slip
            if (!$pegawai['id_kontrak']) {
                 // Skip or log error locally
                 continue; 
            }

            $stmtKomp = $db->prepare("
                SELECT kp.nama_komponen, nk.nominal 
                FROM nominal_kontrak nk
                JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen
                WHERE nk.id_kontrak = ?
            ");
            $stmtKomp->execute([$pegawai['id_kontrak']]);
            $komponens = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

            // 3. GENERATE PDF IN MEMORY
            // Create new FPDF instance for each employee
            $pdf = new FPDF();
            $pdf->AddPage();
            $pdf->SetFont('Arial', 'B', 16);
            $pdf->Cell(0, 10, 'SLIP GAJI PEGAWAI (PREVIEW)', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 10);
            $pdf->Cell(0, 5, 'Periode: ' . date('F Y'), 0, 1, 'C');
            $pdf->Ln(10);

            // Biodata
            $pdf->Cell(35, 7, 'Nama', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $pegawai['nama_lengkap'], 0, 1);
            $pdf->Cell(35, 7, 'NIK', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $pegawai['nik'], 0, 1);
            $pdf->Cell(35, 7, 'Jabatan', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $pegawai['jabatan'] ?? '-', 0, 1);
            $pdf->Line(10, $pdf->GetY() + 5, 200, $pdf->GetY() + 5);
            $pdf->Ln(10);

            // Rincian
            $pdf->SetFont('Arial', 'B', 11);
            $pdf->Cell(0, 8, 'RINCIAN PENGHASILAN', 0, 1);
            $pdf->SetFont('Arial', '', 10);

            $totalGaji = 0;
            foreach ($komponens as $k) {
                $pdf->Cell(100, 7, $k['nama_komponen'], 0, 0);
                $pdf->Cell(30, 7, 'Rp ' . number_format($k['nominal'], 0, ',', '.'), 0, 1, 'R');
                $totalGaji += $k['nominal'];
            }

            $pdf->Ln(5);
            $pdf->Line(10, $pdf->GetY(), 200, $pdf->GetY());
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 11);
            $pdf->Cell(100, 8, 'TOTAL DITERIMA', 0, 0);
            $pdf->Cell(30, 8, 'Rp ' . number_format($totalGaji, 0, ',', '.'), 0, 1, 'R');

            $pdfContent = $pdf->Output('S'); 

            // 4. KIRIM EMAIL (PHPMailer)
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com'; 
            $mail->SMTPAuth   = true;
            $mail->Username   = 'kevin19305.ib@gmail.com'; 
            $mail->Password   = 'sxkl vipy bfsx ljfe';    
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('payroll_system@no-reply.com', 'Sistem Payroll');
            $mail->addAddress($pegawai['email'], $pegawai['nama_lengkap']);
            
            $mail->isHTML(true);
            $mail->Subject = 'Slip Gaji (Preview) - ' . date('F Y');
            $mail->Body    = "Halo <b>{$pegawai['nama_lengkap']}</b>,<br><br>Terlampir adalah preview slip gaji Anda berdasarkan kontrak aktif.<br>Silakan cek lampiran PDF.<br><br>Salam,<br>HRD";

            $mail->addStringAttachment($pdfContent, "Slip_Preview_{$pegawai['nik']}.pdf");

            $mail->send();
            $successCount++;

        } catch (Exception $eMail) {
            $failCount++;
            $errors[] = "Gagal kirim ke " . $pegawai['email'] . ": " . $eMail->getMessage();
        }
    }

    echo json_encode([
        "status" => "success", 
        "message" => "Proses Selesai. Sukses: $successCount, Gagal: $failCount",
        "errors" => $errors
    ]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
