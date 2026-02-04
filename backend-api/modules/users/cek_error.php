<?php
// FILE: backend-api/modules/users/cek_error.php

// Nyalakan semua pesan error biar kelihatan di layar
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>🔍 Diagnosa Error</h1>";

// 1. Cek Folder Saat Ini
echo "📂 Posisi file ini ada di: " . __DIR__ . "<br><br>";

// 2. Cek File Database
$pathDB = __DIR__ . '/../../config/database.php';
echo "Cek file Database di: <code>" . $pathDB . "</code>... ";
if (file_exists($pathDB)) {
    echo "✅ <b>KETEMU!</b><br>";
    require_once $pathDB;
    echo "✅ Berhasil diload (Koneksi Database Aman).<br><br>";
} else {
    echo "❌ <b>TIDAK KETEMU! (Pastikan file database.php ada di folder config)</b><br><br>";
}

// 3. Cek File CORS
$pathCors = __DIR__ . '/../../config/cors.php';
echo "Cek file CORS di: <code>" . $pathCors . "</code>... ";
if (file_exists($pathCors)) {
    echo "✅ <b>KETEMU!</b><br>";
    require_once $pathCors;
    echo "✅ Berhasil diload.<br><br>";
} else {
    echo "❌ <b>TIDAK KETEMU! (Pastikan file cors.php ada di folder config)</b><br><br>";
}

echo "<h3>✅ Kesimpulan:</h3>";
echo "Jika semua checklist di atas hijau, berarti masalah ada di kodingan create.php (mungkin typo). <br>";
echo "Jika ada yang merah ❌, itulah penyebab Error 500 Anda.";
?>