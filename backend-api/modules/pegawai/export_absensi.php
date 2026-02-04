<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

if (!isset($_GET['bulan'])) {
    die("Bulan diperlukan");
}

$bulan = $_GET['bulan'];

// 1. Ambil Data Pegawai & Absensi yang sudah ada (Join)
$sql = "SELECT p.id, p.nik, p.nama_lengkap, p.jabatan,
        COALESCE(a.hadir, 20) as hadir, 
        COALESCE(a.sakit, 0) as sakit, 
        COALESCE(a.izin, 0) as izin, 
        COALESCE(a.alpha, 0) as alpha
        FROM pegawai p 
        LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
        ORDER BY p.nama_lengkap ASC";

$stmt = $db->prepare($sql);
$stmt->execute([':bulan' => $bulan]);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Buat Excel
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();

// Header
$headers = ['ID_SYSTEM (JANGAN UBAH)', 'NIK', 'NAMA PEGAWAI', 'JABATAN', 'HADIR', 'SAKIT', 'IZIN', 'ALPHA'];
$sheet->fromArray($headers, NULL, 'A1');

// Style Header
$sheet->getStyle('A1:H1')->getFont()->setBold(true);
$sheet->getColumnDimension('A')->setVisible(false); // Sembunyikan ID agar user tidak bingung
$sheet->getColumnDimension('C')->setAutoSize(true);

// Isi Data
$row = 2;
foreach ($data as $d) {
    $sheet->setCellValue('A' . $row, $d['id']);
    $sheet->setCellValue('B' . $row, $d['nik']);
    $sheet->setCellValue('C' . $row, $d['nama_lengkap']);
    $sheet->setCellValue('D' . $row, $d['jabatan']);
    $sheet->setCellValue('E' . $row, $d['hadir']);
    $sheet->setCellValue('F' . $row, $d['sakit']);
    $sheet->setCellValue('G' . $row, $d['izin']);
    $sheet->setCellValue('H' . $row, $d['alpha']);
    $row++;
}

// Download
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="Absensi_'.$bulan.'.xlsx"');
$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
?>