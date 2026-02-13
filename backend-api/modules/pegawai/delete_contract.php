<?php
// FILE: backend-api/modules/pegawai/delete_contract.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_kontrak)) {
    echo json_encode(["status" => "error", "message" => "ID Kontrak tidak ditemukan."]);
    exit;
}

try {
    $sql = "DELETE FROM kontrak_kerja WHERE id_kontrak = :id";
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $data->id_kontrak]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["status" => "success", "message" => "Kontrak berhasil dihapus."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Kontrak tidak ditemukan atau sudah dihapus."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Gagal menghapus kontrak: " . $e->getMessage()]);
}
?>
