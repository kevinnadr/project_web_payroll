<?php
// FILE: backend-api/modules/bpjs/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_pegawai)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai Invalid"]);
    exit;
}

try {
    $periode = $data->periode ?? date('Y-m');

    // UPSERT (Insert or Update if exists)
    $sql = "INSERT INTO data_bpjs (id_pegawai, periode, bpjs_tk, bpjs_ks, dasar_upah)
            VALUES (:id, :periode, :tk, :ks, :upah)
            ON DUPLICATE KEY UPDATE
            bpjs_tk = VALUES(bpjs_tk),
            bpjs_ks = VALUES(bpjs_ks),
            dasar_upah = VALUES(dasar_upah)";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':id' => $data->id_pegawai,
        ':periode' => $periode,
        ':tk' => $data->bpjs_tk ?? 0,
        ':ks' => $data->bpjs_ks ?? 0,
        ':upah' => $data->dasar_upah ?? 0
    ]);
    
    echo json_encode(["status" => "success", "message" => "Data BPJS Periode $periode Disimpan!"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
