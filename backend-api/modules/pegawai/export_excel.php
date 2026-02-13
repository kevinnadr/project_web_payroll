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
    // Updated query to match new schema: pegawai, kontrak_kerja, nominal_kontrak
    $sql = "SELECT p.nik, p.nama_lengkap, p.email, sp.status_ptkp, 
                   k.jabatan, k.jenis_kontrak, k.tanggal_mulai, 
                   (
                        SELECT nk.nominal 
                        FROM nominal_kontrak nk 
                        JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen 
                        WHERE nk.id_kontrak = k.id_kontrak AND kp.nama_komponen = 'Gaji Pokok' 
                        LIMIT 1
                   ) as gaji_pokok
            FROM pegawai p
            LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            ORDER BY p.id_pegawai ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Data Pegawai');

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

    // Data
    $rowNum = 2;
    foreach ($data as $row) {
        $sheet->setCellValueExplicit('A' . $rowNum, $row['nik'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $sheet->setCellValue('B' . $rowNum, $row['nama_lengkap']);
        $sheet->setCellValue('C' . $rowNum, $row['email'] ?? '');
        $sheet->setCellValue('D' . $rowNum, $row['status_ptkp'] ?? 'TK/0');
        $sheet->setCellValue('E' . $rowNum, $row['jabatan'] ?? 'Staff');
        $sheet->setCellValue('F' . $rowNum, $row['jenis_kontrak'] ?? 'TETAP');
        $sheet->setCellValue('G' . $rowNum, $row['tanggal_mulai'] ?? '');
        $sheet->setCellValue('H' . $rowNum, $row['gaji_pokok'] ? intval($row['gaji_pokok']) : 0);
        $rowNum++;
    }

    // Style Data
    $dataRange = 'A2:H' . ($rowNum - 1);
    $sheet->getStyle($dataRange)->applyFromArray([
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
    ]);

    // Auto-size kolom
    foreach (range('A', 'H') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    // Output
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="Data_Pegawai_' . date('Y-m-d') . '.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    header("Content-Type: application/json");
    echo json_encode(["status" => "error", "message" => "Export gagal: " . $e->getMessage()]);
}
?>