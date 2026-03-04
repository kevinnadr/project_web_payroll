<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);
$nama_komponen = trim($data['nama_komponen'] ?? '');

if (empty($nama_komponen)) {
    echo json_encode(["status" => "error", "message" => "Nama komponen tidak boleh kosong"]);
    exit;
}

try {
    // Check for duplicate
    $stmtCek = $db->prepare("SELECT COUNT(*) as count FROM master_komponen WHERE nama_komponen = :nama");
    $stmtCek->execute([':nama' => $nama_komponen]);
    $cek = $stmtCek->fetch(PDO::FETCH_ASSOC);

    if ($cek['count'] > 0) {
        echo json_encode(["status" => "error", "message" => "Nama komponen ini sudah ada"]);
        exit;
    }

    $stmt = $db->prepare("INSERT INTO master_komponen (nama_komponen) VALUES (:nama_komponen)");
    $stmt->execute([':nama_komponen' => $nama_komponen]);

    echo json_encode(["status" => "success", "message" => "Komponen berhasil ditambahkan"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
