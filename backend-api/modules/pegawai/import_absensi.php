<?php
// FILE: backend-api/modules/pegawai/import_absensi.php

require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

// 1. Cek Method & File
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(["status"=>"error", "message"=>"Method Not Allowed"]); exit;
}

if (!isset($_FILES['file_excel']['name'])) {
    http_response_code(400); echo json_encode(["status"=>"error", "message"=>"File Excel tidak ditemukan"]); exit;
}

$bulan = $_POST['bulan'] ?? date('Y-m'); // Default bulan ini jika tidak dikirim

try {
    // 2. Load File Excel
    $fileTmpPath = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($fileTmpPath);
    $sheet       = $spreadsheet->getActiveSheet();
    $rows        = $sheet->toArray();

    // 3. Loop Data (Mulai baris ke-2, karena baris 1 adalah Header)
    $sukses = 0;
    $gagal  = 0;

    foreach ($rows as $index => $row) {
        if ($index == 0) continue; // Skip Header

        // Struktur Excel:
        // Col 0: Nama Pegawai | Col 1: Hadir | Col 2: Sakit | Col 3: Izin | Col 4: Alpha
        $nama_pegawai = $row[0];
        $hadir        = (int) ($row[1] ?? 0);
        $sakit        = (int) ($row[2] ?? 0);
        $izin         = (int) ($row[3] ?? 0);
        $alpha        = (int) ($row[4] ?? 0);

        if (empty($nama_pegawai)) continue;

        // 4. Cari ID Pegawai berdasarkan Nama (Case Insensitive)
        // Kita pakai TRIM agar spasi tidak mengganggu
        $stmt = $db->prepare("SELECT id FROM pegawai WHERE TRIM(nama_lengkap) LIKE TRIM(?) LIMIT 1");
        $stmt->execute([$nama_pegawai]);
        $pegawai = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($pegawai) {
            // 5. Simpan / Update Absensi
            // Gunakan ON DUPLICATE KEY UPDATE agar kalau data bulan ini sudah ada, dia mengupdate
            $sql = "INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, alpha) 
                    VALUES (:pid, :bulan, :h, :s, :i, :a)
                    ON DUPLICATE KEY UPDATE 
                    hadir=:h, sakit=:s, izin=:i, alpha=:a";
            
            $stmtInsert = $db->prepare($sql);
            $stmtInsert->execute([
                ':pid'   => $pegawai['id'],
                ':bulan' => $bulan,
                ':h'     => $hadir,
                ':s'     => $sakit,
                ':i'     => $izin,
                ':a'     => $alpha
            ]);
            $sukses++;
        } else {
            // Nama di Excel tidak ada di Database
            $gagal++; 
        }
    }

    echo json_encode([
        "status" => "success", 
        "message" => "Import Selesai. Sukses: $sukses, Gagal/Tidak Dikenal: $gagal"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error Server: " . $e->getMessage()]);
}
?>