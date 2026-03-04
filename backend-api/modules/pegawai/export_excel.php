<?php
// FILE: backend-api/modules/pegawai/export_excel.php
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

try {
    $periode = $_GET['periode'] ?? '';

    if ($periode) {
        $periodStart = $periode . '-01';
        $periodEnd = date('Y-m-t', strtotime($periodStart));

        $sql = "SELECT 
                    p.nik, p.nama_lengkap, p.email, p.no_hp, p.npwp,
                    MIN(k.tanggal_mulai) as min_start,
                    MAX(CASE WHEN k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' THEN '9999-12-31' ELSE k.tanggal_berakhir END) as max_end
                FROM pegawai p
                LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
                GROUP BY p.id_pegawai
                HAVING (min_start IS NULL) OR (min_start <= :periodEnd AND max_end >= :periodStart)
                ORDER BY p.id_pegawai ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':periodStart' => $periodStart, ':periodEnd' => $periodEnd]);
    } else {
        $sql = "SELECT p.nik, p.nama_lengkap, p.email, p.no_hp, p.npwp 
                FROM pegawai p
                ORDER BY p.id_pegawai ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute();
    }
    
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Data Pegawai');

    // Header
    $headers = ['NIK', 'Nama Lengkap', 'Email', 'No HP', 'NPWP'];
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
        $sheet->setCellValue('C' . $rowNum, $row['email'] ?? '');
        $sheet->setCellValueExplicit('D' . $rowNum, $row['no_hp'] ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('E' . $rowNum, $row['npwp'] ?? '', \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $rowNum++;
    }

    // Style Data
    $dataRange = 'A2:E' . ($rowNum - 1);
    $sheet->getStyle($dataRange)->applyFromArray([
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
    ]);

    // Auto-size kolom
    foreach (range('A', 'E') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    // Output
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $filenameDate = $periode ? $periode : date('Y-m-d');
    header('Content-Disposition: attachment; filename="Data_Pegawai_' . $filenameDate . '.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    header("Content-Type: application/json");
    echo json_encode(["status" => "error", "message" => "Export gagal: " . $e->getMessage()]);
}
?>