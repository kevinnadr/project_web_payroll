<?php
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

$bulan = $_GET['bulan'] ?? date('Y-m');

// 1. AMBIL ATURAN DENDA
$stmtRule = $db->query("SELECT * FROM aturan_gaji LIMIT 1");
$rule = $stmtRule->fetch(PDO::FETCH_ASSOC);
$denda_awal = $rule['denda_keterlambatan_awal'] ?? 0;
$denda_per_15 = $rule['denda_per_15_menit'] ?? 0;

// 2. QUERY UTAMA (Semua Pegawai + Absensi)
$sql = "SELECT p.*, 
        COALESCE(a.hadir, 0) as hadir,
        COALESCE(a.terlambat, 0) as terlambat,
        COALESCE(a.`menit terlambat`, 0) as menit_terlambat
        FROM pegawai p 
        LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = ?
        ORDER BY p.nama_lengkap ASC";
$stmt = $db->prepare($sql);
$stmt->execute([$bulan]);
$pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 3. SETUP EXCEL
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle('Laporan Gaji ' . $bulan);

// HEADER
$headers = ['No', 'NIK', 'Nama Pegawai', 'Jabatan', 'Hadir', 'Gaji Pokok', 'Total Tunjangan', 'Denda Telat', 'Potongan Lain', 'Total Terima (THP)'];
$col = 'A';
foreach ($headers as $h) {
    $sheet->setCellValue($col . '1', $h);
    $sheet->getStyle($col . '1')->getFont()->setBold(true);
    $sheet->getStyle($col . '1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFCCCCCC');
    $col++;
}

// ISI DATA
$rowNum = 2;
$no = 1;

foreach ($pegawaiList as $p) {
    // A. Ambil Komponen Pegawai Ini
    $stmtKomp = $db->prepare("SELECT * FROM pegawai_komponen WHERE pegawai_id = ?");
    $stmtKomp->execute([$p['id']]);
    $komponen = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

    // B. Hitung Tunjangan & Potongan Lain
    $total_tunjangan = 0;
    $total_potongan_lain = 0;

    foreach ($komponen as $k) {
        $nominal = 0;
        // Cek Logika Harian vs Fixed
        if ($k['tipe_hitungan'] === 'harian') {
            $nominal = $k['nominal'] * $p['hadir'];
        } else {
            $nominal = $k['nominal'];
        }

        if ($k['jenis'] === 'penerimaan') {
            $total_tunjangan += $nominal;
        } else {
            $total_potongan_lain += $nominal;
        }
    }

    // C. Hitung Denda Telat
    $denda_telat = 0;
    if ($p['terlambat'] > 0 || $p['menit_terlambat'] > 0) {
        $biaya_kali = $p['terlambat'] * $denda_awal;
        $biaya_menit = floor($p['menit_terlambat'] / 15) * $denda_per_15;
        $denda_telat = $biaya_kali + $biaya_menit;
    }

    // D. Hitung THP
    $thp = ($p['gaji_pokok'] + $total_tunjangan) - ($denda_telat + $total_potongan_lain);

    // Tulis ke Excel
    $sheet->setCellValue('A' . $rowNum, $no++);
    $sheet->setCellValue('B' . $rowNum, $p['nik']);
    $sheet->setCellValue('C' . $rowNum, $p['nama_lengkap']);
    $sheet->setCellValue('D' . $rowNum, $p['jabatan']);
    $sheet->setCellValue('E' . $rowNum, $p['hadir']);
    
    // Format Angka
    $sheet->setCellValue('F' . $rowNum, $p['gaji_pokok']);
    $sheet->setCellValue('G' . $rowNum, $total_tunjangan);
    $sheet->setCellValue('H' . $rowNum, $denda_telat);
    $sheet->setCellValue('I' . $rowNum, $total_potongan_lain);
    $sheet->setCellValue('J' . $rowNum, $thp);

    // Styling Currency untuk kolom duit
    $sheet->getStyle('F'.$rowNum.':J'.$rowNum)->getNumberFormat()->setFormatCode('#,##0');
    
    $rowNum++;
}

// Auto Size Column
foreach (range('A', 'J') as $col) {
    $sheet->getColumnDimension($col)->setAutoSize(true);
}

// Output File
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="Laporan_Gaji_'.$bulan.'.xlsx"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
?>