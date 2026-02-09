<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // 1. Ambil data pegawai dan gaji pokok
    $sql = "SELECT p.id, p.nik, p.nama_lengkap, k.jabatan, 
                   g.gaji_pokok, g.ikut_bpjs_tk, g.ikut_bpjs_ks 
            FROM data_pegawai p
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
            ORDER BY p.nik ASC";
    $stmt = $db->query($sql);
    $pegawais = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($pegawais as $p) {
        // 2. Ambil komponen dinamis per pegawai
        $stmtKomp = $db->prepare("SELECT nama_komponen as nama, jenis, tipe_hitungan as tipe, nominal 
                                  FROM pegawai_komponen 
                                  WHERE pegawai_id = ?");
        $stmtKomp->execute([$p['id']]);
        
        // Pastikan nama properti ini adalah 'list_komponen'
        $p['list_komponen'] = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
        
        $result[] = $p;
    }

    echo json_encode(["status" => "success", "data" => $result]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>