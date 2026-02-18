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
    // Find active/latest contract
    $sqlContract = "SELECT id_kontrak FROM kontrak_kerja WHERE id_pegawai = ? ORDER BY (tanggal_berakhir IS NULL) DESC, tanggal_mulai DESC LIMIT 1";
    $cek = $db->prepare($sqlContract);
    $cek->execute([$data->id_pegawai]);
    $contract = $cek->fetch(PDO::FETCH_ASSOC);

    if ($contract) {
        $sql = "UPDATE kontrak_kerja SET bpjs_tk = 0, bpjs_ks = 0, dasar_upah = 0 WHERE id_kontrak = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute([$contract['id_kontrak']]);
        echo json_encode(["status" => "success", "message" => "Data BPJS Direset!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Kontrak tidak ditemukan."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
