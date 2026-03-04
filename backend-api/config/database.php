<?php
// config/database.php
$host = "localhost";
$db_name = "latihan123"; // Ganti sesuai nama DB nanti
$username = "root";
$password = "";

try {
    $db = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode ke object agar mudah dibaca ($row->nama bukan $row['nama'])
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_OBJ);
} catch(PDOException $e) {
    // Return error JSON jika koneksi gagal
    header("Content-Type: application/json");
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Koneksi Database Gagal: " . $e->getMessage()]);
    exit;
}
?>