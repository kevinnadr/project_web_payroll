<?php
// FILE: backend-api/modules/bpjs/download_template.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle('Template Import BPJS');

// Headers
$headers = ['NIK', 'Nama Lengkap', 'BPJS TK', 'BPJS KS', 'Dasar Upah'];
$col = 'A';
foreach ($headers as $header) {
    if ($header == 'NIK' || $header == 'Nama Lengkap') {
        $sheet->getStyle($col . '1')->getFont()->getColor()->setARGB('FFFF0000'); // Merah untuk Wajib
    }
    $sheet->setCellValue($col . '1', $header);
    $col++;
}

// Styling Header
$sheet->getStyle('A1:E1')->getFont()->setBold(true);
$sheet->getStyle('A1:E1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFE0E0E0');

// Contoh Data (Optional)
$rows = [
    ['2024001', 'Alex Santoso', '150000', '100000', '5000000'],
    ['2024002', 'Budi Pratama', '120000', '80000', '4500000']
];

$rowNum = 2;
foreach ($rows as $row) {
    $sheet->setCellValueExplicit('A' . $rowNum, $row[0], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
    $sheet->setCellValue('B' . $rowNum, $row[1]);
    $sheet->setCellValue('C' . $rowNum, $row[2]);
    $sheet->setCellValue('D' . $rowNum, $row[3]);
    $sheet->setCellValue('E' . $rowNum, $row[4]);
    $rowNum++;
}

foreach (range('A', 'E') as $colId) {
    $sheet->getColumnDimension($colId)->setAutoSize(true);
}

ob_end_clean();
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment;filename="Template_Import_BPJS.xlsx"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
?>
