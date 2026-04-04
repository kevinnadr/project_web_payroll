<?php
// backend-api/modules/pendapatan_lain/delete.php
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

if (isset($data->pegawai_ids) && is_array($data->pegawai_ids) && count($data->pegawai_ids) > 0) {
    if (empty($data->periode)) {
        echo json_encode(["status" => "error", "message" => "Periode tidak valid."]);
        exit;
    }
    try {
        $periode = $data->periode;
        $placeholders = str_repeat('?,', count($data->pegawai_ids) - 1) . '?';
        $params = $data->pegawai_ids;
        $params[] = $periode; // add periode to end of params

        $sql = "DELETE FROM pendapatan_lain WHERE id_pegawai IN ($placeholders) AND DATE_FORMAT(date, '%Y-%m') = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        echo json_encode(["status" => "success", "message" => "Data terpilih berhasil dihapus."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else if (!empty($data->id_pegawai) && !empty($data->periode)) {
    try {
        $sql = "DELETE FROM pendapatan_lain WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$data->id_pegawai, $data->periode]);

        echo json_encode(["status" => "success", "message" => "Data berhasil dihapus."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap untuk menghapus."]);
}
?>
