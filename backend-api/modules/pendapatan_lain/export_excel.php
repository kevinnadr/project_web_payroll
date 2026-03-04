<?php
// FILE: backend-api/modules/pendapatan_lain/export_excel.php
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

try {
    $periode = $_GET['periode'] ?? date('Y-m');
    $sql = "SELECT p.*, g.nik, g.nama_lengkap 
            FROM pendapatan_lain p 
            JOIN pegawai g ON p.id_pegawai = g.id_pegawai
            WHERE DATE_FORMAT(p.date, '%Y-%m') = ?
            ORDER BY g.nama_lengkap ASC, p.nama_pendapatan ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$periode]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Data Pendapatan Lain');

    // Header
    $headers = ['NIK', 'Nama Lengkap', 'Nama Pendapatan', 'Nominal', 'Kategori'];
    foreach ($headers as $col => $header) {
        $cell = chr(65 + $col) . '1';
        $sheet->setCellValue($cell, $header);
    }

    // Style Header
    $headerRange = 'A1:E1';
    $sheet->getStyle($headerRange)->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '3B82F6']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
    ]);

    // Data
    $rowNum = 2;
    foreach ($data as $row) {
        $sheet->setCellValueExplicit('A' . $rowNum, $row['nik'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $sheet->setCellValue('B' . $rowNum, $row['nama_lengkap']);
        $sheet->setCellValue('C' . $rowNum, $row['nama_pendapatan']);
        $sheet->setCellValueExplicit('D' . $rowNum, $row['nominal'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
        $sheet->setCellValue('E' . $rowNum, $row['kategori']);
        $rowNum++;
    }

    // Style Data
    if ($rowNum > 2) {
        $dataRange = 'A2:E' . ($rowNum - 1);
        $sheet->getStyle($dataRange)->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ]);
        
        $sheet->getStyle('D2:D' . ($rowNum - 1))->getNumberFormat()->setFormatCode('#,##0');
    }

    // Auto-size kolom
    foreach (range('A', 'E') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    // Output
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $filenameDate = $periode ? $periode : date('Y-m-d');
    header('Content-Disposition: attachment; filename="Data_Pendapatan_Lain_' . $filenameDate . '.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    header("Content-Type: application/json");
    echo json_encode(["status" => "error", "message" => "Export gagal: " . $e->getMessage()]);
}
?>
