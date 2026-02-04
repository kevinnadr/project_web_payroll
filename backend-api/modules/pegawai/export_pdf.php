<?php
// backend-api/modules/pegawai/export_pdf.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

if (!isset($_GET['id'])) { die("Error: ID Pegawai tidak ditemukan."); }
$id = $_GET['id'];
$bulan_ini = "2026-02"; // Kita kunci ke periode ini dulu untuk demo

try {
    // 1. DATA PEGAWAI
    $stmt = $db->prepare("SELECT * FROM pegawai WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $pegawai = $stmt->fetch();
    if (!$pegawai) die("Error: Pegawai tidak ditemukan.");

    // 2. DATA KOMPONEN (Master Gaji)
    $stmt_komponen = $db->query("SELECT * FROM komponen_gaji ORDER BY jenis ASC");
    $list_komponen = $stmt_komponen->fetchAll();

    // 3. DATA ABSENSI (BARU!)
    $stmt_absen = $db->prepare("SELECT * FROM absensi WHERE pegawai_id = :id AND bulan = :bln");
    $stmt_absen->execute([':id' => $id, ':bln' => $bulan_ini]);
    $absen = $stmt_absen->fetch();

    // Default jika belum absen
    $alpha = $absen ? $absen->alpha : 0;
    $hadir = $absen ? $absen->hadir : 0;

    // 4. PERHITUNGAN GAJI
    $gaji_pokok = $pegawai->gaji_pokok;
    $total_penerimaan = 0;
    $total_potongan = 0;

    // Susun HTML Komponen Master
    $html_penerimaan = "";
    $html_potongan = "";

    foreach ($list_komponen as $k) {
        $nominal = $k->nominal;
        if ($k->jenis == 'penerimaan') {
            $total_penerimaan += $nominal;
            $html_penerimaan .= '<tr><td>'.$k->nama_komponen.'</td><td class="amount">Rp '.number_format($nominal,0,',','.').'</td></tr>';
        } else {
            $total_potongan += $nominal;
            $html_potongan .= '<tr><td>'.$k->nama_komponen.'</td><td class="amount">(Rp '.number_format($nominal,0,',','.').')</td></tr>';
        }
    }

    // --- LOGIKA POTONGAN ALPHA (Rp 100.000 per hari) ---
    $denda_per_hari = 100000;
    $total_denda = $alpha * $denda_per_hari;

    if ($alpha > 0) {
        $total_potongan += $total_denda;
        $html_potongan .= '
            <tr style="color:red;">
                <td>Potongan Mangkir ('.$alpha.' Hari)</td>
                <td class="amount">(Rp '.number_format($total_denda, 0, ',', '.').')</td>
            </tr>';
    }

    $take_home_pay = $gaji_pokok + $total_penerimaan - $total_potongan;

    // 5. RENDER HTML
    $html = '
    <html>
    <head>
        <style>
            body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .table-data { width: 100%; border-collapse: collapse; }
            .table-data td { padding: 5px; }
            .amount { text-align: right; }
            .total-row { font-weight: bold; background-color: #eee; }
            .sub-header { font-weight: bold; text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="header">
            <div style="font-size: 18px; font-weight: bold;">PT. HAWK TEKNOLOGI INDONESIA</div>
            <div>SLIP GAJI - Periode Februari 2026</div>
        </div>

        <table class="table-data" style="margin-bottom: 15px;">
            <tr><td width="150">NIK / Nama</td><td>: ' . $pegawai->nik . ' / <b>' . strtoupper($pegawai->nama_lengkap) . '</b></td></tr>
            <tr><td>Jabatan</td><td>: ' . $pegawai->jabatan . '</td></tr>
            <tr><td>Kehadiran</td><td>: Hadir: '.$hadir.' Hari | <b>Alpha: '.$alpha.' Hari</b></td></tr>
        </table>

        <hr>

        <table class="table-data">
            <tr><td><b>Gaji Pokok</b></td><td class="amount"><b>Rp ' . number_format($gaji_pokok, 0, ',', '.') . '</b></td></tr>

            <tr><td colspan="2" class="sub-header"><br>Penambahan</td></tr>
            ' . ($html_penerimaan ?: '<tr><td colspan="2">-</td></tr>') . '

            <tr><td colspan="2" class="sub-header"><br>Potongan</td></tr>
            ' . ($html_potongan ?: '<tr><td colspan="2">-</td></tr>') . '

            <tr><td colspan="2"><hr></td></tr>

            <tr class="total-row">
                <td style="padding-top:10px;">TAKE HOME PAY</td>
                <td class="amount" style="padding-top:10px;">Rp ' . number_format($take_home_pay, 0, ',', '.') . '</td>
            </tr>
        </table>
        
        <div style="margin-top: 30px; font-size: 10px; color: #666;">
            * Potongan mangkir dihitung Rp 100.000 / hari
        </div>
    </body>
    </html>';

    $options = new Options();
    $options->set('isRemoteEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    $dompdf->stream("SlipGaji.pdf", ["Attachment" => 0]);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>