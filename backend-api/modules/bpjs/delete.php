<?php
// FILE: backend-api/modules/bpjs/delete.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_pegawai)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai Invalid"]);
    exit;
}

try {
    $periode = $data->periode ?? date('Y-m');

    // Menghapus record riwayat bpjs pada bulan/periode tersebut
    $sql = "DELETE FROM riwayat_bpjs WHERE id_pegawai = :id AND DATE_FORMAT(date, '%Y-%m') = :periode";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':id' => $data->id_pegawai,
        ':periode' => $periode
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["status" => "success", "message" => "Data BPJS Periode $periode Direset/Dihapus!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Data BPJS untuk periode ini tidak ditemukan."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
