<?php
// FILE: backend-api/modules/absensi/read.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // JOIN ke tabel info_finansial (f) untuk ambil hari_kerja_efektif
    // JOIN ke tabel absensi_alpha (aa) untuk ambil alpha
    $sql = "SELECT 
                a.id, 
                p.id as pegawai_id, 
                p.nik, 
                p.nama_lengkap, 
                p.jabatan,
                
                -- Ambil Hari Kerja Efektif dari tabel Info Finansial
                COALESCE(f.hari_kerja_efektif, 20) as hari_kerja_efektif, 

                COALESCE(a.hadir, 0) as hadir, 
                COALESCE(a.sakit, 0) as sakit, 
                COALESCE(a.izin, 0) as izin, 
                COALESCE(a.cuti, 0) as cuti, 
                COALESCE(a.terlambat, 0) as terlambat, 
                COALESCE(a.`menit terlambat`, 0) as menit_terlambat,
                COALESCE(aa.jumlah_alpha, 0) as jumlah_alpha 
            FROM pegawai p
            LEFT JOIN info_finansial f ON p.id = f.pegawai_id
            LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
            LEFT JOIN absensi_alpha aa ON p.id = aa.pegawai_id AND aa.bulan = :bulan
            ORDER BY p.nik ASC"; 

    $stmt = $db->prepare($sql);
    $stmt->execute([':bulan' => $bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>