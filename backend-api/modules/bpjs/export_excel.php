<?php
// FILE: backend-api/modules/bpjs/export_excel.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

try {
    $periode = $_GET['periode'] ?? date('Y-m');

    // Query Data Pegawai dan BPJS
    $sql = "SELECT p.nik, p.nama_lengkap,
                   COALESCE(d.bpjs_tk, 0) as bpjs_tk,
                   COALESCE(d.bpjs_ks, 0) as bpjs_ks,
                   COALESCE(d.dasar_upah, 0) as dasar_upah
            FROM pegawai p
            LEFT JOIN riwayat_bpjs d ON p.id_pegawai = d.id_pegawai AND DATE_FORMAT(d.date, '%Y-%m') = :periode
            ORDER BY p.nik ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([':periode' => $periode]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Data BPJS');

    // Headers
    $headers = ['No', 'NIK', 'Nama Lengkap', 'BPJS TK', 'BPJS KS', 'Dasar Upah'];
    $col = 'A';
    foreach ($headers as $header) {
        $sheet->setCellValue($col . '1', $header);
        $col++;
    }

    // Styling Headers
    $headerStyle = [
        'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['rgb' => '4338ca']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ];
    $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);

    // Data Rows
    $rowNum = 2;
    $no = 1;
    foreach ($data as $row) {
        $sheet->setCellValue('A' . $rowNum, $no++);
        $sheet->setCellValueExplicit('B' . $rowNum, $row['nik'], \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
        $sheet->setCellValue('C' . $rowNum, $row['nama_lengkap']);
        $sheet->setCellValue('D' . $rowNum, $row['bpjs_tk']);
        $sheet->setCellValue('E' . $rowNum, $row['bpjs_ks']);
        $sheet->setCellValue('F' . $rowNum, $row['dasar_upah']);
        $rowNum++;
    }

    // Auto fit columns
    foreach (range('A', 'F') as $colId) {
        $sheet->getColumnDimension($colId)->setAutoSize(true);
    }

    // Output directly to browser
    ob_end_clean();
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="Data_BPJS_'.$periode.'.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo "Gagal export excel: " . $e->getMessage();
}
?>
