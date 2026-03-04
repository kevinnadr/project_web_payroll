<?php
// backend-api/modules/pendapatan_lain/create.php
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

if (empty($data->id_pegawai) || empty($data->items) || !is_array($data->items)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap. Pastikan pegawai dipilih dan ada minimal 1 pendapatan."]);
    exit;
}

try {
    $db->beginTransaction();
    $sql = "INSERT INTO pendapatan_lain (id_pegawai, nama_pendapatan, nominal, kategori) VALUES (?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    
    foreach ($data->items as $item) {
        if (!empty($item->nama_pendapatan) && !empty($item->kategori)) {
            $stmt->execute([
                $data->id_pegawai, 
                $item->nama_pendapatan, 
                $item->nominal ?? 0, 
                $item->kategori
            ]);
        }
    }
    
    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data berhasil ditambahkan."]);
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
