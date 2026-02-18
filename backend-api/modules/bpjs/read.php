<?php
// FILE: backend-api/modules/bpjs/read.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Use a subquery to find the latest contract per employee (by ID, assuming auto-increment)
    $sql = "SELECT 
                p.id_pegawai,
                p.nik, 
                p.nama_lengkap, 
                k.id_kontrak,
                COALESCE(k.bpjs_tk, 0) as bpjs_tk,
                COALESCE(k.bpjs_ks, 0) as bpjs_ks,
                COALESCE(k.dasar_upah, 0) as dasar_upah
            FROM pegawai p
            LEFT JOIN (
                SELECT id_pegawai, MAX(id_kontrak) as max_id
                FROM kontrak_kerja
                GROUP BY id_pegawai
            ) latest ON p.id_pegawai = latest.id_pegawai
            LEFT JOIN kontrak_kerja k ON k.id_kontrak = latest.max_id
            ORDER BY p.nik ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database Error: " . $e->getMessage()
    ]);
}
?>
