<?php
// FILE: backend-api/modules/master_gaji/read.php
ob_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../../config/database.php';
require_once '../../config/cors.php';

ob_clean(); // Bersihkan sampah output

try {
    // 1. AMBIL DATA UTAMA (PEGAWAI)
    // Query ini sangat dasar, harusnya 100% jalan jika tabel pegawai ada
    $sql = "SELECT 
                p.id, 
                p.nik, 
                p.nama_lengkap, 
                p.jabatan, 
                COALESCE(f.gaji_pokok, 0) as gaji_pokok,
                COALESCE(f.hari_kerja_efektif, 20) as hari_kerja_efektif
            FROM pegawai p
            LEFT JOIN info_finansial f ON p.id = f.pegawai_id
            ORDER BY p.nama_lengkap ASC";

    $stmt = $db->query($sql);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. AMBIL KOMPONEN (DENGAN PENGAMAN)
    foreach ($result as &$row) {
        try {
            // Kita coba ambil komponennya
            $stmtKomp = $db->prepare("
                SELECT k.nama_komponen, k.jenis, k.tipe_hitungan, pk.nominal 
                FROM pegawai_komponen pk
                JOIN komponen_gaji k ON pk.komponen_id = k.id
                WHERE pk.pegawai_id = ?
            ");
            $stmtKomp->execute([$row['id']]);
            $row['komponen_tambahan'] = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $ex) {
            // JIKA ERROR (misal kolom hilang), JANGAN BIKIN KOSONG SATU HALAMAN
            // Cukup kosongkan komponennya saja, tapi data pegawai tetap tampil
            $row['komponen_tambahan'] = []; 
        }
    }

    echo json_encode(["status" => "success", "data" => $result]);

} catch (PDOException $e) {
    // Jika masih error parah, kirim pesan error json
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
ob_end_flush();
?>