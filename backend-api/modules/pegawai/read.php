<?php
// FILE: backend-api/modules/pegawai/read.php
// Updated to match latihan123 database schema
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Query JOIN untuk mengambil data pegawai dengan status PTKP dan kontrak terbaru
    $sql = "SELECT 
                p.id, 
                p.nik, 
                p.nama_lengkap, 
                p.email, 
                p.npwp,
                p.status_ptkp,
                k.jabatan, 
                k.jenis_kontrak, 
                k.tanggal_masuk,
                k.tanggal_berakhir
            FROM data_pegawai p
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            ORDER BY p.id ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $pegawai = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $pegawai
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>