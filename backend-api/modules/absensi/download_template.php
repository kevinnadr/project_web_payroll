<?php
// backend-api/modules/absensi/download_template.php
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="template_import_absensi.csv"');

$output = fopen('php://output', 'w');
// Header sesuai urutan yang diharapkan sistem import
fputcsv($output, ['nik', 'hadir', 'sakit', 'izin', 'cuti', 'hari_terlambat', 'menit_terlambat', 'jam_lembur']);

// Contoh Baris (Opsional)
fputcsv($output, ['2024001', '20', '0', '0', '0', '0', '0', '5']);
fputcsv($output, ['2024002', '22', '0', '0', '0', '0', '0', '0']);

fclose($output);
exit;