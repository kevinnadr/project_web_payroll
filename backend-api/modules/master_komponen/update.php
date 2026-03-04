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
$id = $data['id'] ?? '';
$nama_komponen = trim($data['nama_komponen'] ?? '');

if (empty($id) || empty($nama_komponen)) {
    echo json_encode(["status" => "error", "message" => "ID atau nama komponen tidak boleh kosong"]);
    exit;
}

try {
    // Check for duplicate on other IDs
    $stmtCek = $db->prepare("SELECT COUNT(*) as count FROM master_komponen WHERE nama_komponen = :nama AND id != :id");
    $stmtCek->execute([':nama' => $nama_komponen, ':id' => $id]);
    $cek = $stmtCek->fetch(PDO::FETCH_ASSOC);

    if ($cek['count'] > 0) {
        echo json_encode(["status" => "error", "message" => "Nama komponen ini sudah dipakai"]);
        exit;
    }

    $stmt = $db->prepare("UPDATE master_komponen SET nama_komponen = :nama_komponen WHERE id = :id");
    $stmt->execute([':nama_komponen' => $nama_komponen, ':id' => $id]);

    echo json_encode(["status" => "success", "message" => "Komponen berhasil diupdate"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
