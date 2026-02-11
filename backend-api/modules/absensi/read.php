<?php
// FILE: backend-api/modules/absensi/read.php
// Updated to match latihan123 database schema
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../../config/database.php';

$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('Y-m');

try {
    // Query untuk mengambil data absensi dengan join ke pegawai
    // Group by pegawai untuk periode tertentu
    $sql = "SELECT 
                p.id_pegawai as pegawai_id, 
                p.nik, 
                p.nama_lengkap,
                SUM(IFNULL(a.hadir, 0)) as hadir,
                SUM(IFNULL(a.sakit, 0)) as sakit,
                SUM(IFNULL(a.izin, 0)) as izin,
                SUM(IFNULL(a.cuti, 0)) as cuti,
                SUM(IFNULL(a.hari_terlambat, 0)) as hari_terlambat,
                SUM(IFNULL(a.menit_terlambat, 0)) as menit_terlambat,
                SUM(IFNULL(a.hari_efektif, 0) - (IFNULL(a.hadir, 0) + IFNULL(a.izin, 0) + IFNULL(a.sakit, 0) + IFNULL(a.cuti, 0))) as alpha
            FROM pegawai p
            LEFT JOIN absensi a ON p.id_pegawai = a.id_pegawai AND DATE_FORMAT(a.date, '%Y-%m') = ?
            GROUP BY p.id_pegawai, p.nik, p.nama_lengkap
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success", 
        "data" => $data,
        "bulan" => $bulan
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
}
?>