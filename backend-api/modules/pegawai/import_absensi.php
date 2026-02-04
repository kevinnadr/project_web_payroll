<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

// Terima Bulan & File
$bulan = $_POST['bulan'] ?? date('Y-m');

if (!isset($_FILES['file_excel']['tmp_name'])) {
    http_response_code(400); echo json_encode(["status"=>"error", "message"=>"File tidak ditemukan"]); exit;
}

try {
    $spreadsheet = IOFactory::load($_FILES['file_excel']['tmp_name']);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray();

    // Skip Header (Row 1), Mulai Row 2
    for ($i = 1; $i < count($rows); $i++) {
        $r = $rows[$i];
        
        $pegawai_id = $r[0]; // Kolom A (ID System)
        // Kolom B, C, D cuma info visual
        $hadir = (int)$r[4];
        $sakit = (int)$r[5];
        $izin  = (int)$r[6];
        $alpha = (int)$r[7];

        if (!$pegawai_id) continue;

        // Cek existing
        $cek = $db->prepare("SELECT id FROM absensi WHERE pegawai_id = :pid AND bulan = :bln");
        $cek->execute([':pid' => $pegawai_id, ':bln' => $bulan]);
        $exist = $cek->fetch();

        if ($exist) {
            // Update
            $upd = $db->prepare("UPDATE absensi SET hadir=:h, sakit=:s, izin=:i, alpha=:a WHERE id=:id");
            $upd->execute([':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, ':a'=>$alpha, ':id'=>$exist->id]);
        } else {
            // Insert
            $ins = $db->prepare("INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, alpha) VALUES (:pid, :bln, :h, :s, :i, :a)");
            $ins->execute([':pid'=>$pegawai_id, ':bln'=>$bulan, ':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, ':a'=>$alpha]);
        }
    }

    echo json_encode(["status" => "success", "message" => "Data absensi berhasil diimport!"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>