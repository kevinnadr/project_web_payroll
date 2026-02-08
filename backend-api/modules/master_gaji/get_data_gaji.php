<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // 1. Ambil Aturan Statis
    $rule = $db->query("SELECT * FROM aturan_gaji LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    // 2. Ambil Pegawai
    $pegawai = $db->query("SELECT id, nik, nama_lengkap, jabatan, gaji_pokok, hari_kerja_efektif FROM pegawai ORDER BY nama_lengkap ASC")->fetchAll(PDO::FETCH_ASSOC);

    // 3. Ambil Komponen per Pegawai (PERBAIKAN DISINI)
    // Kita gunakan loop by Key agar array-nya benar-benar terupdate
    foreach($pegawai as $key => $val) {
        $stmt = $db->prepare("SELECT * FROM pegawai_komponen WHERE pegawai_id = ?");
        $stmt->execute([$val['id']]);
        $comps = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Pastikan selalu mengirim array kosong [] jika null, jangan null
        $pegawai[$key]['komponen'] = $comps ? $comps : []; 
    }

    echo json_encode([
        "status" => "success",
        "aturan" => $rule,
        "pegawai" => $pegawai
    ]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>