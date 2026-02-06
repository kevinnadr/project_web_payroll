<?php
// FILE: backend-api/modules/pegawai/export_pdf.php

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use Dompdf\Dompdf;

// 1. Cek ID Pegawai
if (!isset($_GET['id'])) {
    die("Error: ID Pegawai tidak ditemukan.");
}

$id_pegawai = $_GET['id'];
$bulan      = $_GET['bulan'] ?? date('Y-m'); // Default bulan ini

try {
    // 2. Ambil Data Pegawai & Absensi
    // Kita LEFT JOIN agar tahu jumlah Alpha
    $sql = "SELECT p.*, 
            COALESCE(a.hadir, 0) as hadir, 
            COALESCE(a.sakit, 0) as sakit,
            COALESCE(a.izin, 0) as izin,
            COALESCE(a.alpha, 0) as alpha 
            FROM pegawai p 
            LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
            WHERE p.id = :id";

    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $id_pegawai, ':bulan' => $bulan]);
    $pegawai = $stmt->fetch(PDO::FETCH_OBJ);

    if (!$pegawai) {
        die("Data pegawai tidak ditemukan.");
    }

    // --- 3. LOGIKA HITUNGAN (SAMA PERSIS DENGAN EMAIL) ---
    
    // A. PENDAPATAN
    $gaji_pokok = $pegawai->gaji_pokok;
    
    // Tunjangan Jabatan (Contoh Logika)
    if (stripos($pegawai->jabatan, 'Direktur') !== false || stripos($pegawai->jabatan, 'Manager') !== false) {
        $tunjangan_jabatan = 2000000;
    } else {
        $tunjangan_jabatan = 500000;
    }
    
    $uang_transport = 250000; 
    $total_penambahan = $tunjangan_jabatan + $uang_transport;

    // B. POTONGAN
    $bpjs = 100000; 

    // Hitung Potongan Alpha (Hanya jika Alpha > 0)
    $jumlah_alpha    = $pegawai->alpha; 
    $tarif_potongan  = 100000; // Denda per hari
    $total_pot_alpha = $jumlah_alpha * $tarif_potongan; 

    // Denda Lain (Default 0)
    $denda = 0; 

    $total_potongan = $bpjs + $denda + $total_pot_alpha;

    // C. TOTAL BERSIH
    $take_home_pay = ($gaji_pokok + $total_penambahan) - $total_potongan;
    
    // Format Tanggal
    $dateObj   = DateTime::createFromFormat('!Y-m', $bulan);
    $nama_bulan = $dateObj->format('F Y'); 

    // --- 4. SIAPKAN BARIS HTML DINAMIS ---
    
    // Baris Alpha (Cuma muncul kalau ada denda)
    $row_alpha = "";
    if ($total_pot_alpha > 0) {
        $row_alpha = "
        <tr>
            <td class='red'>Potongan Alpha ({$jumlah_alpha} Hari)</td>
            <td class='right red'>(Rp " . number_format($total_pot_alpha, 0, ',', '.') . ")</td>
        </tr>";
    }

    // Baris Denda (Cuma muncul kalau ada denda)
    $row_denda = "";
    if ($denda > 0) {
        $row_denda = "
        <tr>
            <td class='red'>Denda Lainnya</td>
            <td class='right red'>(Rp " . number_format($denda, 0, ',', '.') . ")</td>
        </tr>";
    }

    // --- 5. TEMPLATE HTML ---
    $html = "
    <html>
    <head>
        <title>Slip Gaji - {$pegawai->nama_lengkap}</title>
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
            <p style='font-weight:bold; margin-top:10px;'>SLIP GAJI - PERIODE $nama_bulan</p>
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

    // 6. GENERATE & DOWNLOAD PDF
    $dompdf = new Dompdf();
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    // Stream = Langsung download di browser
    $dompdf->stream("Slip_Gaji_{$pegawai->nama_lengkap}.pdf", array("Attachment" => false));

} catch (Exception $e) {
    die("Terjadi Kesalahan: " . $e->getMessage());
}
?>