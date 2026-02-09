<?php
// FILE: backend-api/modules/master_gaji/read.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Query mengambil data dari 3 tabel utama: data_pegawai, kontrak, dan komponen_gaji
    $sql = "SELECT 
                p.id, p.nik, p.nama_lengkap, 
                k.jabatan, k.jenis_kontrak,
                g.gaji_pokok, g.tunjangan_jabatan, g.tunjangan_transport, g.tunjangan_makan
            FROM data_pegawai p
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
            ORDER BY p.nik ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>