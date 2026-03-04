<?php
// FILE: backend-api/modules/pendapatan_lain/download_template.php
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

try {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Template Pendapatan Lain');

    // Header array
    $headers = [
        'A' => 'NIK',
        'B' => 'Nama Lengkap',
        'C' => 'Nama Pendapatan',
        'D' => 'Nominal',
        'E' => 'Kategori'
    ];

    foreach ($headers as $col => $title) {
        $sheet->setCellValue($col . '1', $title);
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    // Header Styling
    $sheet->getStyle('A1:E1')->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '10B981']], // Green like the success themes
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);

    // Example Data
    $examples = [
        ['2024001', 'Budi Santoso', 'Uang Makan', '50000', 'Kehadiran'],
        ['2024001', 'Budi Santoso', 'Tunjangan Transport', '25000', 'Non Alpha'],
        ['2024002', 'Ani Wahyuni', 'Bonus Kinerja', '1500000', 'Tetap']
    ];

    $rowNum = 2;
    foreach ($examples as $rx) {
        $sheet->setCellValueExplicit('A'.$rowNum, $rx[0], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $sheet->setCellValue('B'.$rowNum, $rx[1]);
        $sheet->setCellValue('C'.$rowNum, $rx[2]);
        $sheet->setCellValue('D'.$rowNum, $rx[3]);
        $sheet->setCellValue('E'.$rowNum, $rx[4]);
        
        $sheet->getStyle("A$rowNum:E$rowNum")->applyFromArray([
            'font' => ['italic' => true, 'color' => ['rgb' => '64748B']]
        ]);
        $rowNum++;
    }

    $sheet->setCellValue('G2', 'KETERANGAN & ATURAN PENGISIAN:');
    $sheet->getStyle('G2')->getFont()->setBold(true);
    $sheet->setCellValue('G3', '1. Kolom [NIK], [Nama Pendapatan], [Nominal], dan [Kategori] WAJIB diisi.');
    $sheet->setCellValue('G4', '2. Kolom [Nama Lengkap] hanya sebagai informasi tambahan, sistem membaca berdasarkan NIK.');
    $sheet->setCellValue('G5', '3. Nilai [Kategori] hanya boleh salah satu dari: Tetap, Non Alpha, atau Kehadiran.');
    $sheet->setCellValue('G6', '4. Sistem menggunakan "Upsert" (Update or Insert):');
    $sheet->setCellValue('G7', '   Jika belum ada, akan ditambahkan. Jika sudah ada, Nominal & Kategori akan diperbarui.');
    $sheet->setCellValue('G8', '5. Data lama yang TIDAK ada di Excel ini akan DIBIARKAN / AMAN.');
    
    // Output file
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="Template_Pendapatan_Lain.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    header("Content-Type: application/json");
    echo json_encode(["status" => "error", "message" => "Gagal download: " . $e->getMessage()]);
}
?>
