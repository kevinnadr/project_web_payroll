<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../../config/database.php';

try {
    $bulan = '2026-02';
    
    $sql = "SELECT 
                p.id_pegawai as pegawai_id, 
                p.nik, 
                p.nama_lengkap,
                (SELECT jabatan FROM kontrak_kerja WHERE id_pegawai = p.id_pegawai ORDER BY tanggal_mulai DESC LIMIT 1) as jabatan,
                COALESCE(SUM(a.hadir), 0) as hadir,
                COALESCE(SUM(a.sakit), 0) as sakit,
                COALESCE(SUM(a.izin), 0) as izin,
                COALESCE(SUM(a.cuti), 0) as cuti,
                COALESCE(SUM(a.hari_terlambat), 0) as hari_terlambat,
                COALESCE(SUM(a.menit_terlambat), 0) as menit_terlambat,
                COALESCE(SUM(a.jam_lembur), 0) as jam_lembur,
                25 as hari_efektif,
                GREATEST(0, (25 - (COALESCE(SUM(a.hadir), 0) + COALESCE(SUM(a.izin), 0) + COALESCE(SUM(a.sakit), 0) + COALESCE(SUM(a.cuti), 0)))) as alpha
            FROM pegawai p
            LEFT JOIN absensi a ON p.id_pegawai = a.id_pegawai AND a.date LIKE ?
            GROUP BY p.id_pegawai, p.nik, p.nama_lengkap
            ORDER BY p.nama_lengkap ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan . '%']);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Query OK. Found " . count($data) . " rows.\n";
    if (count($data) > 0) {
        print_r($data[0]);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
