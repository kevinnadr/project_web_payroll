<?php
// FILE: backend-api/modules/pegawai/read.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Query JOIN 3 Tabel untuk mengambil data lengkap
    $sql = "SELECT 
                p.id, 
                p.nik, 
                p.nama_lengkap, 
                p.email, 
                p.status_ptkp,
                k.jabatan, 
                k.jenis_kontrak, 
                k.tanggal_masuk,
                g.gaji_pokok
            FROM data_pegawai p
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
            ORDER BY p.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $pegawai = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($pegawai);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Error: " . $e->getMessage()]);
}
?>