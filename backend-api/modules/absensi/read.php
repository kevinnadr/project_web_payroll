<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../../config/database.php';

$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('Y-m');

try {
    // Query ini akan mengambil SEMUA nama dari tabel data_pegawai
    // Meskipun di tabel absensi masih kosong (0)
    $sql = "SELECT 
                p.id as pegawai_id, 
                p.nik, 
                p.nama_lengkap,
                IFNULL(a.hadir, 0) as hadir,
                IFNULL(a.sakit, 0) as sakit,
                IFNULL(a.izin, 0) as izin,
                IFNULL(a.alpha, 0) as alpha
            FROM data_pegawai p
            LEFT JOIN data_absensi a ON p.id = a.pegawai_id AND a.bulan = ?
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}