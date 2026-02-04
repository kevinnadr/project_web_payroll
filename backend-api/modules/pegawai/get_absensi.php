<?php
// FILE: backend-api/modules/pegawai/get_absensi.php

require_once '../../config/cors.php';
require_once '../../config/database.php';

// Ambil parameter bulan dari URL (Default: Bulan ini)
$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // Query Logic:
    // Ambil semua pegawai, lalu sambungkan (LEFT JOIN) dengan tabel absensi.
    // PENTING: COALESCE(..., 0) artinya jika data belum ada, tampilkan 0.
    
    $sql = "SELECT 
                p.id, 
                p.nama_lengkap, 
                p.jabatan,
                COALESCE(a.hadir, 0) as hadir, 
                COALESCE(a.sakit, 0) as sakit, 
                COALESCE(a.izin, 0) as izin, 
                COALESCE(a.alpha, 0) as alpha
            FROM pegawai p 
            LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
            ORDER BY p.nama_lengkap ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute([':bulan' => $bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>