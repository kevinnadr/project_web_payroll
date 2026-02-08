<?php
// FILE: backend-api/modules/master_gaji/perbaiki_db.php
require_once '../../config/database.php';

echo "<h2>🛠️ SEDANG MEMPERBAIKI DATABASE...</h2>";

try {
    // 1. Cek Kolom tipe_hitungan
    echo "Pengecekan kolom 'tipe_hitungan' di tabel 'komponen_gaji'...<br>";
    try {
        $db->query("SELECT tipe_hitungan FROM komponen_gaji LIMIT 1");
        echo "✅ Kolom sudah ada. Aman.<br>";
    } catch (Exception $e) {
        echo "⚠️ Kolom belum ada. Menambahkan kolom otomatis...<br>";
        $db->exec("ALTER TABLE komponen_gaji ADD COLUMN tipe_hitungan VARCHAR(20) DEFAULT 'fixed' AFTER jenis");
        echo "✅ BERHASIL MENAMBAHKAN KOLOM!<br>";
    }

    echo "<hr><h3>🎉 PERBAIKAN SELESAI!</h3>";
    echo "Silakan kembali ke Web Payroll dan Refresh halaman.";

} catch (PDOException $e) {
    echo "❌ ERROR FATAL: " . $e->getMessage();
}
?>