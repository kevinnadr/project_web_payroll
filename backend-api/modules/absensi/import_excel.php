<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

if (!isset($_FILES['file_excel']['tmp_name'])) {
    echo json_encode(["status" => "error", "message" => "File tidak ditemukan"]); exit;
}

$bulanInput = $_POST['bulan'] ?? date('Y-m'); 

try {
    $file = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($file);
    $rows = $spreadsheet->getActiveSheet()->toArray();
    
    // Validasi Header (Cek Kolom B=Nama, C=Masuk)
    $header = array_map(function($h) { return strtoupper(trim($h)); }, $rows[0] ?? []);
    if (!isset($header[1]) || !str_contains($header[1], 'NAMA') || !isset($header[2]) || $header[2] !== 'MASUK') {
        echo json_encode(["status" => "error", "message" => "Format Excel Salah!"]); exit;
    }

    $db->beginTransaction();
    $sukses = 0;

    foreach ($rows as $index => $row) {
        if ($index === 0) continue; 

        $nama_excel = $row[1];
        if (empty($nama_excel)) continue;

        // Ambil Data Excel
        $hadir = !empty($row[2]) ? (int)$row[2] : 0;
        $cuti  = !empty($row[3]) ? (int)$row[3] : 0;
        $sakit = !empty($row[4]) ? (int)$row[4] : 0;
        $izin  = !empty($row[5]) ? (int)$row[5] : 0;
        $telat_kali = 0; $telat_menit = 0; // Default 0

        // Cari Pegawai & Ambil Hari Kerja Efektifnya
        $stmt = $db->prepare("SELECT id, hari_kerja_efektif FROM pegawai WHERE TRIM(nama_lengkap) = TRIM(?)");
        $stmt->execute([$nama_excel]);
        $pegawai = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($pegawai) {
            $pid = $pegawai['id'];
            $hari_efektif = (int)$pegawai['hari_kerja_efektif'];

            // 1. SIMPAN ABSENSI UTAMA
            $sqlAbsen = "INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, terlambat, `menit terlambat`) 
                         VALUES (:pid, :bln, :h, :s, :i, :c, :t, :m)
                         ON DUPLICATE KEY UPDATE 
                         hadir=:h, sakit=:s, izin=:i, cuti=:c, terlambat=:t, `menit terlambat`=:m";
            $db->prepare($sqlAbsen)->execute([
                ':pid'=>$pid, ':bln'=>$bulanInput, ':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, 
                ':c'=>$cuti, ':t'=>$telat_kali, ':m'=>$telat_menit
            ]);

            // 2. HITUNG & SIMPAN ALPHA KE TABEL BARU
            // Rumus: Alpha = Hari Efektif - (Total Kehadiran & Izin Sah)
            $total_masuk = $hadir + $sakit + $izin + $cuti;
            $alpha = $hari_efektif - $total_masuk;
            if ($alpha < 0) $alpha = 0; // Jangan sampai minus

            $sqlAlpha = "INSERT INTO absensi_alpha (pegawai_id, bulan, jumlah_alpha) VALUES (:pid, :bln, :a)
                         ON DUPLICATE KEY UPDATE jumlah_alpha = :a";
            $db->prepare($sqlAlpha)->execute([':pid'=>$pid, ':bln'=>$bulanInput, ':a'=>$alpha]);

            $sukses++;
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Sukses import & hitung alpha: $sukses data"]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>