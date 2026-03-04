<?php
// backend-api/modules/pendapatan_lain/update.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id) || empty($data->id_pegawai) || empty($data->items) || !is_array($data->items)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
    exit;
}

$item = $data->items[0];

if (empty($item->nama_pendapatan) || empty($item->kategori)) {
    echo json_encode(["status" => "error", "message" => "Detail pendapatan tidak lengkap."]);
    exit;
}

try {
    $sql = "UPDATE pendapatan_lain SET id_pegawai = ?, nama_pendapatan = ?, nominal = ?, kategori = ? WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$data->id_pegawai, $item->nama_pendapatan, $item->nominal ?? 0, $item->kategori, $data->id]);

    echo json_encode(["status" => "success", "message" => "Data berhasil diupdate."]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
