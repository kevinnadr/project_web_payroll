<?php
// backend-api/modules/pegawai/send_email.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use Dompdf\Dompdf;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// --- CONFIG EMAIL ---
define('SMTP_USER', 'email_anda@gmail.com'); 
define('SMTP_PASS', 'app_password_anda'); 
// --------------------

$input = json_decode(file_get_contents("php://input"));
if (!isset($input->id)) { http_response_code(400); exit; }
$id = $input->id;
$bulan_ini = "2026-02";

try {
    $stmt = $db->prepare("SELECT * FROM pegawai WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $pegawai = $stmt->fetch();

    $stmt_komponen = $db->query("SELECT * FROM komponen_gaji ORDER BY jenis ASC");
    $list_komponen = $stmt_komponen->fetchAll();

    // Ambil Data Absen
    $stmt_absen = $db->prepare("SELECT * FROM absensi WHERE pegawai_id = :id AND bulan = :bln");
    $stmt_absen->execute([':id' => $id, ':bln' => $bulan_ini]);
    $absen = $stmt_absen->fetch();
    $alpha = $absen ? $absen->alpha : 0;

    // Hitung
    $gaji_pokok = $pegawai->gaji_pokok;
    $total_plus = 0; 
    $total_min = 0;
    $rows = '<tr><td>Gaji Pokok</td><td align="right">Rp '.number_format($gaji_pokok,0,',','.').'</td></tr>';

    foreach ($list_komponen as $k) {
        if ($k->jenis == 'penerimaan') {
            $total_plus += $k->nominal;
            $rows .= '<tr><td>'.$k->nama_komponen.'</td><td align="right">Rp '.number_format($k->nominal,0,',','.').'</td></tr>';
        } else {
            $total_min += $k->nominal;
            $rows .= '<tr><td>'.$k->nama_komponen.'</td><td align="right">(Rp '.number_format($k->nominal,0,',','.').')</td></tr>';
        }
    }

    // Hitung Denda Alpha
    $denda = $alpha * 100000;
    if ($denda > 0) {
        $total_min += $denda;
        $rows .= '<tr style="color:red;"><td>Potongan Alpha ('.$alpha.' Hari)</td><td align="right">(Rp '.number_format($denda,0,',','.').')</td></tr>';
    }

    $thp = $gaji_pokok + $total_plus - $total_min;

    // HTML Email
    $html = '<html><body>
        <h3>SLIP GAJI - '.strtoupper($pegawai->nama_lengkap).'</h3>
        <table border="1" cellpadding="5" cellspacing="0" width="100%">
            '.$rows.'
            <tr style="background:#eee; font-weight:bold;"><td>TOTAL BERSIH</td><td align="right">Rp '.number_format($thp,0,',','.').'</td></tr>
        </table>
    </body></html>';

    // Generate PDF & Send (Logic sama)
    $dompdf = new Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $pdfString = $dompdf->output();

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;
    $mail->Password = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->setFrom(SMTP_USER, 'HAWK Payroll');
    $mail->addAddress($pegawai->email);
    $mail->addStringAttachment($pdfString, 'SlipGaji.pdf');
    $mail->isHTML(true);
    $mail->Subject = 'Slip Gaji & Absensi - Feb 2026';
    $mail->Body = 'Gaji bersih Anda: Rp '.number_format($thp,0,',','.').'. Rincian terlampir.';
    $mail->send();

    echo json_encode(["status" => "success", "message" => "Terkirim!"]);
} catch (Exception $e) {
    http_response_code(500); echo json_encode(["status"=>"error", "message"=>$e->getMessage()]);
}
?>