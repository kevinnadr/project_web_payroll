<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid input"]);
    exit;
}

try {
    $sql = "UPDATE pengaturan_absensi SET 
            denda_telat_harian = :harian,
            denda_telat_per_blok = :blok,
            menit_per_blok = :menit,
            pembagi_lembur = :pembagi,
            tarif_lembur_per_jam = :tarif
            WHERE id = 1";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':harian' => $data->denda_telat_harian,
        ':blok' => $data->denda_telat_per_blok,
        ':menit' => $data->menit_per_blok,
        ':pembagi' => $data->pembagi_lembur,
        ':tarif' => $data->tarif_lembur_per_jam
    ]);

    echo json_encode(["status" => "success", "message" => "Pengaturan berhasil disimpan!"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
