<?php
// FILE: backend-api/modules/master_gaji/fix_bpjs_massal.php
require_once '../../config/database.php';

try {
    $db->beginTransaction();

    echo "<h1>⏳ Memulai Proses Penambahan BPJS...</h1>";

    // 1. CEK / BUAT MASTER KOMPONEN BPJS
    $nama_bpjs = "BPJS Kesehatan";
    $default_nominal = 100000;

    $stmtCek = $db->prepare("SELECT id FROM komponen_gaji WHERE nama_komponen LIKE ? LIMIT 1");
    $stmtCek->execute([$nama_bpjs]);
    $master = $stmtCek->fetch(PDO::FETCH_ASSOC);

    $komponen_id = 0;
    if ($master) {
        $komponen_id = $master['id'];
        echo "✅ Master Komponen '$nama_bpjs' sudah ada (ID: $komponen_id)<br>";
    } else {
        $stmtNew = $db->prepare("INSERT INTO komponen_gaji (nama_komponen, jenis, tipe_hitungan, nominal) VALUES (?, 'potongan', 'fixed', ?)");
        $stmtNew->execute([$nama_bpjs, $default_nominal]);
        $komponen_id = $db->lastInsertId();
        echo "✅ Berhasil membuat Master Komponen '$nama_bpjs' baru (ID: $komponen_id)<br>";
    }

    // 2. AMBIL SEMUA PEGAWAI
    $stmtPeg = $db->query("SELECT id, nama_lengkap FROM pegawai");
    $pegawais = $stmtPeg->fetchAll(PDO::FETCH_ASSOC);

    $count = 0;
    foreach ($pegawais as $p) {
        // Cek apakah pegawai ini sudah punya komponen BPJS?
        $stmtCekP = $db->prepare("SELECT id FROM pegawai_komponen WHERE pegawai_id = ? AND komponen_id = ?");
        $stmtCekP->execute([$p['id'], $komponen_id]);
        
        if ($stmtCekP->rowCount() == 0) {
            // JIKA BELUM -> INSERT
            $stmtIns = $db->prepare("INSERT INTO pegawai_komponen (pegawai_id, komponen_id, nominal) VALUES (?, ?, ?)");
            $stmtIns->execute([$p['id'], $komponen_id, $default_nominal]);
            echo "➕ Menambahkan BPJS ke: <strong>{$p['nama_lengkap']}</strong><br>";
            $count++;
        } else {
            // JIKA SUDAH -> SKIP
            echo "Start skipping: {$p['nama_lengkap']} (Sudah punya)<br>";
        }
    }

    $db->commit();
    echo "<hr><h3>🎉 Selesai! Berhasil menambahkan BPJS ke $count pegawai.</h3>";

} catch (Exception $e) {
    $db->rollBack();
    echo "❌ Error: " . $e->getMessage();
}
?>