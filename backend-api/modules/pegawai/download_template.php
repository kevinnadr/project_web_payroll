<?php
// FILE: backend-api/modules/pegawai/download_template.php
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle('Template Import Pegawai');

// Header
$headers = ['NIK', 'Nama Lengkap', 'Email', 'PTKP', 'Jabatan', 'Status Kontrak', 'Tgl Masuk', 'Gaji Pokok'];
foreach ($headers as $col => $header) {
    $cell = chr(65 + $col) . '1';
    $sheet->setCellValue($cell, $header);
}

// Style Header
$headerRange = 'A1:H1';
$sheet->getStyle($headerRange)->applyFromArray([
    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '3B82F6']],
    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
]);

// Contoh data baris 2
$sheet->setCellValueExplicit('A2', '2024001', DataType::TYPE_STRING);
$sheet->setCellValue('B2', 'John Doe');
$sheet->setCellValue('C2', 'john@email.com');
$sheet->setCellValue('D2', 'TK/0');
$sheet->setCellValue('E2', 'Staff IT');
$sheet->setCellValue('F2', 'TETAP');
$sheet->setCellValue('G2', '2024-01-15');
$sheet->setCellValue('H2', 5000000);

// Contoh data baris 3
$sheet->setCellValueExplicit('A3', '2024002', DataType::TYPE_STRING);
$sheet->setCellValue('B3', 'Jane Smith');
$sheet->setCellValue('C3', 'jane@email.com');
$sheet->setCellValue('D3', 'K/1');
$sheet->setCellValue('E3', 'Manager');
$sheet->setCellValue('F3', 'TIDAK TETAP');
$sheet->setCellValue('G3', '2024-02-01');
$sheet->setCellValue('H3', 7000000);

// Style data contoh (warna kuning muda)
$sheet->getStyle('A2:H3')->applyFromArray([
    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFF9C4']],
    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
]);

// Catatan di baris 5
$sheet->setCellValue('A5', '📌 CATATAN:');
$sheet->getStyle('A5')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF0000'));
$sheet->setCellValue('A6', '- NIK harus unik, jika NIK sudah ada maka data akan di-UPDATE');
$sheet->setCellValue('A7', '- PTKP: TK/0, K/0, K/1, K/2, K/3');
$sheet->setCellValue('A8', '- Status Kontrak: TETAP, TIDAK TETAP, LEPAS, PART TIME');
$sheet->setCellValue('A9', '- Format tanggal: YYYY-MM-DD (contoh: 2024-01-15)');
$sheet->setCellValue('A10', '- Gaji Pokok: angka tanpa titik/koma (contoh: 5000000)');
$sheet->setCellValue('A11', '- Hapus baris contoh (kuning) sebelum import');

// Auto-size
foreach (range('A', 'H') as $col) {
    $sheet->getColumnDimension($col)->setAutoSize(true);
}

// Output
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="Template_Import_Pegawai.xlsx"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
?>