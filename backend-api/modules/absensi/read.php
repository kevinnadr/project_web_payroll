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
                k.jabatan,
                SUM(IFNULL(a.hadir, 0)) as hadir,
                SUM(IFNULL(a.sakit, 0)) as sakit,
                SUM(IFNULL(a.izin, 0)) as izin,
                SUM(IFNULL(a.cuti, 0)) as cuti,
                SUM(IFNULL(a.hari_terlambat, 0)) as hari_terlambat,
                SUM(IFNULL(a.menit_terlambat, 0)) as menit_terlambat,
                SUM(IFNULL(a.jam_lembur, 0)) as jam_lembur,
                COALESCE(MAX(a.hari_efektif), MAX(p.hari_efektif), 25) as hari_efektif,
                GREATEST(0, (COALESCE(MAX(a.hari_efektif), MAX(p.hari_efektif), 25) - (SUM(IFNULL(a.hadir, 0)) + SUM(IFNULL(a.izin, 0)) + SUM(IFNULL(a.sakit, 0)) + SUM(IFNULL(a.cuti, 0))))) as alpha
            FROM pegawai p
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR k.tanggal_berakhir >= CURDATE())
            LEFT JOIN absensi a ON p.id_pegawai = a.id_pegawai AND DATE_FORMAT(a.date, '%Y-%m') = ?
            GROUP BY p.id_pegawai, p.nik, p.nama_lengkap, k.jabatan
            ORDER BY p.nama_lengkap ASC";

            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get hari_efektif for this period (from any existing record, or default 20)
    $sqlHE = "SELECT hari_efektif FROM absensi WHERE DATE_FORMAT(date, '%Y-%m') = ? LIMIT 1";
    $stmtHE = $db->prepare($sqlHE);
    $stmtHE->execute([$bulan]);
    $rowHE = $stmtHE->fetch(PDO::FETCH_ASSOC);
    $hariEfektif = $rowHE ? (int)$rowHE['hari_efektif'] : 20;

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