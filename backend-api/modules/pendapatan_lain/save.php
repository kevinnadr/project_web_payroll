<?php
// backend-api/modules/pendapatan_lain/save.php
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

if (empty($data->id_pegawai) || !isset($data->items) || !is_array($data->items)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap. Pastikan pegawai dipilih."]);
    exit;
}

try {
    $db->beginTransaction();

    $periode = $data->periode ?? date('Y-m');
    $dateFilter = $periode . '-01'; // Default date format

    // Hapus data lama agar bisa di replace sesuai input terbaru
    $sqlDelete = "DELETE FROM pendapatan_lain WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?";
    $stmtDelete = $db->prepare($sqlDelete);
    $stmtDelete->execute([$data->id_pegawai, $periode]);

    // Masukkan data-data baru
    $sqlInsert = "INSERT INTO pendapatan_lain (id_pegawai, nama_pendapatan, nominal, kategori, date) VALUES (?, ?, ?, ?, ?)";
    $stmtInsert = $db->prepare($sqlInsert);
    
    foreach ($data->items as $item) {
        if (!empty($item->nama_pendapatan) && !empty($item->kategori)) {
            $stmtInsert->execute([
                $data->id_pegawai, 
                $item->nama_pendapatan, 
                $item->nominal ?? 0, 
                $item->kategori,
                $dateFilter
            ]);
        }
    }
    
    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data berhasil disimpan."]);
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
