<?php
// FILE: backend-api/modules/absensi/read.php
// Updated to match latihan123 database schema
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../../config/database.php';

$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('Y-m');

try {
    // Query untuk mengambil data absensi dengan join ke pegawai
    // Group by pegawai untuk periode tertentu
    $sql = "SELECT 
                p.id_pegawai as pegawai_id, 
                p.nik, 
                p.nama_lengkap,
                (SELECT jabatan FROM kontrak_kerja WHERE id_pegawai = p.id_pegawai ORDER BY tanggal_mulai DESC LIMIT 1) as jabatan,
                COALESCE(a.hadir, 0) as hadir,
                COALESCE(a.sakit, 0) as sakit,
                COALESCE(a.izin, 0) as izin,
                COALESCE(a.cuti, 0) as cuti,
                COALESCE(a.hari_terlambat, 0) as hari_terlambat,
                COALESCE(a.menit_terlambat, 0) as menit_terlambat,
                25 as hari_efektif,
                GREATEST(0, 25 - (COALESCE(a.hadir, 0) + COALESCE(a.izin, 0) + COALESCE(a.sakit, 0) + COALESCE(a.cuti, 0))) as alpha
            FROM pegawai p
            LEFT JOIN (
                SELECT 
                    id_pegawai,
                    SUM(hadir) as hadir,
                    SUM(sakit) as sakit,
                    SUM(izin) as izin,
                    SUM(cuti) as cuti,
                    SUM(hari_terlambat) as hari_terlambat,
                    SUM(menit_terlambat) as menit_terlambat
                FROM absensi
                WHERE `date` LIKE ?
                GROUP BY id_pegawai
            ) a ON p.id_pegawai = a.id_pegawai
            ORDER BY p.nama_lengkap ASC";

            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan . '%']);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $hariEfektif = 25;

    echo json_encode([
        "status" => "success", 
        "data" => $data,
        "bulan" => $bulan,
        "hari_efektif" => $hariEfektif
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
}
?>