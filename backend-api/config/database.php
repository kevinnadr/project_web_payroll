<?php
// config/database.php
$host = "localhost";
$db_name = "db_payroll"; // Ganti sesuai nama DB nanti
$username = "root";
$password = "";

try {
    $db = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Set default fetch mode ke object agar mudah dibaca ($row->nama bukan $row['nama'])
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_OBJ);
    // Nonaktifkan strict mode agar tanggal 0000-00-00 tidak error di MySQL VPS
    $db->exec("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");
} catch(PDOException $e) {
    // Return error JSON jika koneksi gagal
    header("Content-Type: application/json");
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Koneksi Database Gagal: " . $e->getMessage()]);
    exit;
}
?>