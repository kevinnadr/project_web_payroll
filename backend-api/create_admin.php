<?php
// backend-api/create_admin.php

// 1. Koneksi Database (Sesuaikan path jika folder Anda berbeda)
// Karena file ini ada di root backend-api, kita akses config
require_once 'config/database.php'; 

echo "<h1>Reset User Admin</h1>";

try {
    // 2. Hapus User Admin Lama (Agar tidak duplikat)
    $email = 'admin@hawk.com';
    $sql_delete = "DELETE FROM users WHERE email = :email";
    $stmt = $db->prepare($sql_delete);
    $stmt->execute([':email' => $email]);
    echo "✅ User lama ($email) berhasil dihapus.<br>";

    // 3. Buat Password Hash yang VALID untuk 'admin123'
    $password_raw = 'admin123';
    $password_hash = password_hash($password_raw, PASSWORD_BCRYPT); // Ini kuncinya!

    // 4. Masukkan User Baru
    $sql_insert = "INSERT INTO users (nama_lengkap, email, password, role) VALUES (:nama, :email, :pass, :role)";
    $stmt = $db->prepare($sql_insert);
    $stmt->execute([
        ':nama' => 'Super Admin',
        ':email' => $email,
        ':pass' => $password_hash,
        ':role' => 'admin'
    ]);

    echo "✅ User baru berhasil dibuat!<br>";
    echo "<hr>";
    echo "<h3>Silakan Login Sekarang:</h3>";
    echo "Email: <b>admin@hawk.com</b><br>";
    echo "Password: <b>admin123</b><br>";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>