<?php
// backend-api/modules/absensi/download_template.php
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="template_import_absensi.csv"');

$output = fopen('php://output', 'w');
// Header sesuai urutan yang diharapkan sistem import
fputcsv($output, ['NIK', 'Nama Lengkap', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Telat_X', 'Telat_M']);

// Contoh Baris (Opsional)
fputcsv($output, ['2024000', 'Kevin Adrian', '20', '0', '0', '0', '0', '0']);

fclose($output);
exit;