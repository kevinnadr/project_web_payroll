<?php
// FILE: backend-api/modules/pegawai/send_email.php

// 1. Load Config & Library
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Dompdf\Dompdf;

// --- KONFIGURASI PENGIRIM (HRD) ---
$email_pengirim = "kevin19305.ib@gmail.com";  // GANTI EMAIL GMAIL ANDA
$nama_pengirim  = "HRD Red Ant Colony";
$app_password   = "sxkl vipy bfsx ljfe";      // PASTE 16 DIGIT APP PASSWORD DISINI

// 2. Tangkap Input JSON
$input = json_decode(file_get_contents("php://input"));
if (!isset($input->id)) { 
    http_response_code(400); 
    echo json_encode(["status"=>"error", "message"=>"ID Pegawai tidak dikirim"]); 
    exit; 
}

try {
    // --- 3. QUERY DATA PEGAWAI & ABSENSI ---
    // Kita Join ke tabel absensi bulan ini agar tahu berapa hari Alpha-nya
    $bulan_ini = date('Y-m'); // Format: 2026-02
    
    $sql = "SELECT p.*, 
            COALESCE(a.hadir, 0) as hadir, 
            COALESCE(a.sakit, 0) as sakit,
            COALESCE(a.izin, 0) as izin,
            COALESCE(a.alpha, 0) as alpha 
            FROM pegawai p 
            LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
            WHERE p.id = :id";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $input->id, ':bulan' => $bulan_ini]);
    $pegawai = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$pegawai) throw new Exception("Data pegawai tidak ditemukan untuk periode $bulan_ini.");


    // --- 4. LOGIKA PERHITUNGAN GAJI (BUSINESS LOGIC) ---
    
    // A. PENDAPATAN
    $gaji_pokok = $pegawai->gaji_pokok;
    
    // Tunjangan Jabatan (Contoh Logika Sederhana)
    // Jika jabatan Direktur/Manager dpt 2jt, Staff dpt 500rb
    if (stripos($pegawai->jabatan, 'Direktur') !== false || stripos($pegawai->jabatan, 'Manager') !== false) {
        $tunjangan_jabatan = 2000000;
    } else {
        $tunjangan_jabatan = 500000;
    }
    
    $uang_transport = 250000; // Flat semua karyawan
    $total_penambahan = $tunjangan_jabatan + $uang_transport;


    // B. POTONGAN
    $bpjs = 100000; // Flat BPJS

    // Hitung Potongan Alpha (Hanya jika Alpha > 0)
    $jumlah_alpha    = $pegawai->alpha; 
    $tarif_potongan  = 100000; // Denda per hari mangkir
    $total_pot_alpha = $jumlah_alpha * $tarif_potongan; 

    // Denda Lain (Default 0)
    $denda = 0; 

    $total_potongan = $bpjs + $denda + $total_pot_alpha;


    // C. TOTAL BERSIH
    $take_home_pay = ($gaji_pokok + $total_penambahan) - $total_potongan;
    $periode_teks  = date('F Y'); // Contoh: February 2026


    // --- 5. SIAPKAN HTML BARIS DINAMIS (Hanya muncul jika nilai > 0) ---
    
    // Baris Alpha
    $row_alpha = "";
    if ($total_pot_alpha > 0) {
        $row_alpha = "
        <tr>
            <td class='red'>Potongan Alpha ({$jumlah_alpha} Hari)</td>
            <td class='right red'>(Rp " . number_format($total_pot_alpha, 0, ',', '.') . ")</td>
        </tr>";
    }

    // Baris Denda
    $row_denda = "";
    if ($denda > 0) {
        $row_denda = "
        <tr>
            <td class='red'>Denda Lainnya</td>
            <td class='right red'>(Rp " . number_format($denda, 0, ',', '.') . ")</td>
        </tr>";
    }


    // --- 6. TEMPLATE HTML (DESAIN SURAT RESMI) ---
    $html = "
    <html>
    <head>
        <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { margin: 0; font-weight: bold; font-size: 18px; text-transform: uppercase; color: #000; }
            .header p { margin: 5px 0 0 0; font-size: 12px; }
            hr { border: 0; border-top: 2px solid #000; margin: 10px 0 25px 0; }
            
            .info-table { width: 100%; margin-bottom: 20px; }
            .info-table td { padding: 4px 0; vertical-align: top; }
            
            .rincian-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .rincian-table td { padding: 6px 0; }
            
            .line-top { border-top: 1px solid #000; }
            .line-bottom { border-bottom: 1px solid #000; }
            
            .section-title { font-weight: bold; text-decoration: underline; margin-top: 15px; display:block; font-size: 13px; }
            .bg-gray { background-color: #e5e7eb; font-weight: bold; padding: 10px 5px !important; font-size: 14px; }
            
            .right { text-align: right; }
            .red { color: #dc2626; } 
        </style>
    </head>
    <body>
        <div class='header'>
            <h2>Red Ant Colony</h2>
            <p>Gedung Merah, perum De'Asmaradana Residence, Jl. Sugeng Jeroni, Patangpuluhan, Wirobrajan, Kota Yogyakarta, Daerah Istimewa Yogyakarta 55251 - Indonesia</p>
            <p style='font-weight:bold; margin-top:10px;'>SLIP GAJI - PERIODE $periode_teks</p>
        </div>
        <hr>

        <table class='info-table'>
            <tr><td width='130'>NIK</td><td>: {$pegawai->nik}</td></tr>
            <tr><td>Nama Pegawai</td><td>: <strong>{$pegawai->nama_lengkap}</strong></td></tr>
            <tr><td>Jabatan</td><td>: {$pegawai->jabatan}</td></tr>
            <tr><td>Kehadiran</td><td>: Hadir: {$pegawai->hadir} | Sakit/Izin: " . ($pegawai->sakit + $pegawai->izin) . " | <strong>Alpha: {$pegawai->alpha}</strong></td></tr>
        </table>

        <div class='line-top'></div>
        
        <table class='rincian-table'>
            <tr>
                <td style='font-weight:bold;'>GAJI POKOK</td>
                <td class='right' style='font-weight:bold;'>Rp " . number_format($gaji_pokok, 0, ',', '.') . "</td>
            </tr>
        </table>

        <span class='section-title'>PENAMBAHAN</span>
        <table class='rincian-table'>
            <tr><td>Tunjangan Jabatan</td><td class='right'>Rp " . number_format($tunjangan_jabatan, 0, ',', '.') . "</td></tr>
            <tr><td>Uang Transport/Makan</td><td class='right'>Rp " . number_format($uang_transport, 0, ',', '.') . "</td></tr>
        </table>

        <span class='section-title'>POTONGAN</span>
        <table class='rincian-table'>
            <tr><td>Iuran BPJS Kesehatan/TK</td><td class='right red'>(Rp " . number_format($bpjs, 0, ',', '.') . ")</td></tr>
            $row_alpha
            $row_denda
        </table>
        
        <br>
        <div class='line-top'></div>
        <table class='rincian-table'>
            <tr class='bg-gray'>
                <td>TAKE HOME PAY (DITERIMA)</td>
                <td class='right'>Rp " . number_format($take_home_pay, 0, ',', '.') . "</td>
            </tr>
        </table>
        <div class='line-bottom'></div>

        <div style='margin-top: 40px; width: 100%;'>
            <div style='float: right; width: 200px; text-align: center;'>
                <p>Yogyakarta, " . date('d F Y') . "</p>
                <br><br><br>
                <p style='font-weight:bold; text-decoration:underline;'>Manager Keuangan</p>
            </div>
            <div style='clear: both;'></div>
        </div>

        <p style='margin-top:20px; font-size:10px; color:#666; font-style:italic;'>
            * Dokumen ini digenerate otomatis oleh sistem Web Payroll dan sah tanpa tanda tangan basah.
        </p>
    </body>
    </html>";


    // --- 7. GENERATE PDF (DOMPDF) ---
    $dompdf = new Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $pdfContent = $dompdf->output();


    // --- 8. KIRIM EMAIL (PHPMAILER) ---
    $mail = new PHPMailer(true);

    // Setting SMTP
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = $email_pengirim;
    $mail->Password   = $app_password; // App Password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;
    
    // Bypass SSL (Wajib untuk XAMPP/Localhost)
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    // Pengirim & Penerima
    $mail->setFrom($email_pengirim, $nama_pengirim);
    
    // LOGIKA EMAIL TUJUAN:
    // Jika email pegawai ada di DB, kirim ke dia. Jika kosong, kirim ke Admin (Anda).
    if (!empty($pegawai->email)) {
        $mail->addAddress($pegawai->email);
    } else {
        $mail->addAddress($email_pengirim);
    }

    // Attach PDF
    $mail->addStringAttachment($pdfContent, "Slip_Gaji_{$bulan_ini}_{$pegawai->nama_lengkap}.pdf");

    // Body Email
    $mail->isHTML(true);
    $mail->Subject = "Slip Gaji Resmi: {$pegawai->nama_lengkap} ($periode_teks)";
    $mail->Body    = "
        <p>Yth. Sdr/i <strong>{$pegawai->nama_lengkap}</strong>,</p>
        <p>Terima kasih atas dedikasi dan kinerja Anda bulan ini.</p>
        <p>Terlampir adalah <strong>Slip Gaji (PDF)</strong> untuk periode $periode_teks.</p>
        <p>Silakan didownload dan disimpan.</p>
        <br>
        <p>Hormat Kami,<br><strong>HRD Dept. - Red Ant Colony</strong></p>
    ";

    $mail->send();
    echo json_encode(["status" => "success", "message" => "Email & PDF sukses dikirim ke " . (!empty($pegawai->email) ? $pegawai->email : $email_pengirim)]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal Kirim: " . $e->getMessage()]);
}
?>