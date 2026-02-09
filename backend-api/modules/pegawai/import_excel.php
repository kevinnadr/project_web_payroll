<?php
// FILE: backend-api/modules/pegawai/import_excel.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

if (!isset($_FILES['file_excel']['name'])) {
    echo json_encode(["status" => "error", "message" => "File wajib diupload"]);
    exit;
}

try {
    $file_tmp = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($file_tmp);
    $rows = $spreadsheet->getActiveSheet()->toArray();
    unset($rows[0]); // Hapus header

    $berhasil = 0; $gagal = 0;
    $db->beginTransaction();

    foreach ($rows as $row) {
        $nik = isset($row[0]) ? trim((string)$row[0]) : '';
        $nama = isset($row[1]) ? trim((string)$row[1]) : '';
        
        if (empty($nik) || empty($nama)) continue;

        // 1. DATA PEGAWAI (Upsert)
        $stmt1 = $db->prepare("INSERT INTO data_pegawai (nik, nama_lengkap, email, status_ptkp) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE nama_lengkap=?, email=?, status_ptkp=?");
        $stmt1->execute([
            $nik, $nama, $row[2]??'', $row[3]??'TK/0', // Values
            $nama, $row[2]??'', $row[3]??'TK/0' // Update Values
        ]);

        // Ambil ID Pegawai
        $stmtId = $db->prepare("SELECT id FROM data_pegawai WHERE nik = ?");
        $stmtId->execute([$nik]);
        $pid = $stmtId->fetchColumn();

        // 2. KONTRAK PEGAWAI
        $stmt2 = $db->prepare("INSERT INTO kontrak_pegawai (pegawai_id, jabatan, jenis_kontrak, tanggal_masuk) 
            VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE jabatan=?, jenis_kontrak=?, tanggal_masuk=?");
        $stmt2->execute([
            $pid, $row[4]??'Staff', $row[5]??'PKWTT', $row[6]??date('Y-m-d'),
            $row[4]??'Staff', $row[5]??'PKWTT', $row[6]??date('Y-m-d')
        ]);

        // 3. KOMPONEN GAJI
        $stmt3 = $db->prepare("INSERT INTO komponen_gaji (pegawai_id, gaji_pokok) 
            VALUES (?, ?) ON DUPLICATE KEY UPDATE gaji_pokok=?");
        $stmt3->execute([
            $pid, intval($row[7]??0), intval($row[7]??0)
        ]);

        $berhasil++;
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Import Selesai! Sukses: $berhasil"]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>