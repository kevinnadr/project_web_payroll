<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

// Validasi sederhana
if (!isset($input->nama) || !isset($input->nominal) || !isset($input->jenis)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

try {
    $sql = "INSERT INTO komponen_gaji (nama_komponen, jenis, nominal) VALUES (:nama, :jenis, :nominal)";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':nama' => $input->nama,
        ':jenis' => $input->jenis,
        ':nominal' => $input->nominal
    ]);

    echo json_encode(["status" => "success", "message" => "Komponen gaji berhasil disimpan!"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal simpan: " . $e->getMessage()]);
}
?>