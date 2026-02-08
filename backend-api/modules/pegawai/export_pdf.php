<?php
// FILE: backend-api/modules/pegawai/export_pdf.php
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use Mpdf\Mpdf;

$id    = $_GET['id'] ?? 0;
$bulan = $_GET['bulan'] ?? date('Y-m');

if (!$id) die("ID Pegawai tidak ditemukan.");

// 1. QUERY UTAMA (JOIN ke ABSENSI & ABSENSI_ALPHA)
$sql = "SELECT p.*, 
        COALESCE(a.hadir, 0) as hadir,
        COALESCE(a.sakit, 0) as sakit,
        COALESCE(a.izin, 0) as izin,
        COALESCE(a.cuti, 0) as cuti,
        COALESCE(a.terlambat, 0) as terlambat,
        COALESCE(a.`menit terlambat`, 0) as menit_terlambat,
        COALESCE(aa.jumlah_alpha, 0) as jumlah_alpha 
        FROM pegawai p 
        LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :b1
        LEFT JOIN absensi_alpha aa ON p.id = aa.pegawai_id AND aa.bulan = :b2
        WHERE p.id = :id";

$stmt = $db->prepare($sql);
$stmt->execute([':b1' => $bulan, ':b2' => $bulan, ':id' => $id]);
$pegawai = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$pegawai) die("Data Pegawai tidak ditemukan.");

// 2. AMBIL KOMPONEN GAJI
$stmtKomp = $db->prepare("SELECT * FROM pegawai_komponen WHERE pegawai_id = ?");
$stmtKomp->execute([$id]);
$komponen = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

// 3. AMBIL ATURAN DENDA
$stmtRule = $db->query("SELECT * FROM aturan_gaji LIMIT 1");
$rule = $stmtRule->fetch(PDO::FETCH_ASSOC);

// --- HITUNG GAJI ---
$gaji_pokok = $pegawai['gaji_pokok'];
$total_penerimaan = $gaji_pokok;
$total_potongan = 0;

$list_penerimaan = [];
$list_potongan = [];

// A. Komponen Tambahan (Tunjangan/Potongan Tetap)
foreach ($komponen as $k) {
    $nominal_final = 0;
    $keterangan = "";

    if ($k['tipe_hitungan'] === 'harian') {
        $nominal_final = $k['nominal'] * $pegawai['hadir'];
        $keterangan = "({$pegawai['hadir']} x " . number_format($k['nominal'],0,',','.') . ")";
    } else {
        $nominal_final = $k['nominal'];
    }

    if ($k['jenis'] === 'penerimaan') {
        $total_penerimaan += $nominal_final;
        $list_penerimaan[] = ['nama' => $k['nama_komponen'], 'ket' => $keterangan, 'nilai'=> $nominal_final];
    } else {
        $total_potongan += $nominal_final;
        $list_potongan[] = ['nama' => $k['nama_komponen'], 'ket' => $keterangan, 'nilai'=> $nominal_final];
    }
}

// B. Hitung Denda Keterlambatan
$denda_awal = $rule['denda_keterlambatan_awal'] ?? 0;
$denda_per_15 = $rule['denda_per_15_menit'] ?? 0;
$total_denda_telat = 0;

if ($pegawai['terlambat'] > 0 || $pegawai['menit_terlambat'] > 0) {
    $biaya_kali = $pegawai['terlambat'] * $denda_awal;
    $biaya_menit = floor($pegawai['menit_terlambat'] / 15) * $denda_per_15;
    $total_denda_telat = $biaya_kali + $biaya_menit;
}

if ($total_denda_telat > 0) {
    $total_potongan += $total_denda_telat;
    $list_potongan[] = [
        'nama' => "Denda Keterlambatan",
        'ket'  => "({$pegawai['terlambat']}x, {$pegawai['menit_terlambat']}m)",
        'nilai'=> $total_denda_telat
    ];
}

// C. Hitung Denda Alpha (Mangkir) - BARU DITAMBAHKAN
$tarif_alpha = $rule['denda_alpha'] ?? 100000; // Default 100rb jika null
$total_denda_alpha = 0;

if ($pegawai['jumlah_alpha'] > 0) {
    $total_denda_alpha = $pegawai['jumlah_alpha'] * $tarif_alpha;
    
    // Masukkan ke Potongan
    $total_potongan += $total_denda_alpha;
    $list_potongan[] = [
        'nama' => "Potongan Alpha/Mangkir",
        'ket'  => "({$pegawai['jumlah_alpha']} hari x " . number_format($tarif_alpha, 0, ',', '.') . ")",
        'nilai'=> $total_denda_alpha
    ];
}

$take_home_pay = $total_penerimaan - $total_potongan;

// --- GENERATE PDF HTML ---
$html = '
<style>
    body { font-family: sans-serif; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .company-name { font-size: 18px; font-weight: bold; margin: 0; }
    .title { font-size: 14px; font-weight: bold; margin-top: 5px; text-transform: uppercase; }
    .info-table { width: 100%; margin-bottom: 20px; }
    .info-table td { padding: 3px; vertical-align: top; }
    .label { font-weight: bold; width: 100px; }
    
    .attendance-box {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 20px;
        font-size: 12px;
    }
    .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-top: 15px; margin-bottom: 5px; padding-bottom: 3px; font-size: 13px; text-transform: uppercase; }
    .salary-table { width: 100%; border-collapse: collapse; }
    .salary-table td { padding: 5px 0; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; font-size: 14px; background-color: #f0f0f0; border-top: 1px solid #333; border-bottom: 1px solid #333; }
    .total-td { padding: 10px 5px; }
    .red { color: #dc2626; }
</style>

<div class="header">
    <div class="company-name">PT. RED ANT COLONY</div>
    <div>Jl. Sugeng Jeroni, Wirobrajan, Yogyakarta</div>
    <div class="title">SLIP GAJI - PERIODE '.date('F Y', strtotime($bulan)).'</div>
</div>

<table class="info-table">
    <tr>
        <td class="label">NIK</td><td>: '.$pegawai['nik'].'</td>
        <td class="label">Jabatan</td><td>: '.$pegawai['jabatan'].'</td>
    </tr>
    <tr>
        <td class="label">Nama</td><td>: <strong>'.$pegawai['nama_lengkap'].'</strong></td>
        <td class="label">Status</td><td>: '.$pegawai['status_kepegawaian'].'</td>
    </tr>
</table>

<div class="attendance-box">
    <strong>Rincian Kehadiran:</strong><br>
    Hadir: <strong>'.$pegawai['hadir'].'</strong> | 
    Sakit: '.$pegawai['sakit'].' | 
    Izin: '.$pegawai['izin'].' | 
    Cuti: '.$pegawai['cuti'].' | 
    Alpha: <strong style="color:#dc2626">'.$pegawai['jumlah_alpha'].'</strong> | 
    Telat: '.$pegawai['terlambat'].'x ('.$pegawai['menit_terlambat'].'m)
</div>

<div class="section-title">PENERIMAAN</div>
<table class="salary-table">
    <tr>
        <td>Gaji Pokok</td>
        <td class="text-right">Rp '.number_format($gaji_pokok,0,',','.').'</td>
    </tr>';

foreach($list_penerimaan as $p) {
    $html .= '<tr>
        <td>'.$p['nama'].' <span style="font-size:10px; color:#666;">'.$p['ket'].'</span></td>
        <td class="text-right">Rp '.number_format($p['nilai'],0,',','.').'</td>
    </tr>';
}

$html .= '</table>

<div class="section-title">POTONGAN</div>
<table class="salary-table">';

if(empty($list_potongan)) {
    $html .= '<tr><td colspan="2" style="font-style:italic; color:#999;">- Tidak ada potongan -</td></tr>';
} else {
    foreach($list_potongan as $p) {
        $html .= '<tr>
            <td>'.$p['nama'].' <span style="font-size:10px; color:#666;">'.$p['ket'].'</span></td>
            <td class="text-right red">(Rp '.number_format($p['nilai'],0,',','.').')</td>
        </tr>';
    }
}

$html .= '</table>

<br/>
<table class="salary-table">
    <tr class="total-row">
        <td class="total-td">TAKE HOME PAY (DITERIMA)</td>
        <td class="total-td text-right">Rp '.number_format($take_home_pay,0,',','.').'</td>
    </tr>
</table>

<div style="margin-top: 30px; text-align: right;">
    <p>Yogyakarta, '.date('d F Y').'</p>
    <br/><br/><br/>
    <p>( HRD Manager )</p>
</div>
';

$mpdf = new Mpdf();
$mpdf->WriteHTML($html);
$mpdf->Output('SlipGaji_'.$pegawai['nik'].'.pdf', 'I');
?>