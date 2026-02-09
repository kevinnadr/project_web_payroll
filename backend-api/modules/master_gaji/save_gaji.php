<?php
// FILE: backend-api/modules/master_gaji/save_gaji.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->pegawai_id)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak valid"]);
    exit;
}

try {
    $sql = "UPDATE komponen_gaji SET 
                gaji_pokok = :gp, 
                tunjangan_jabatan = :tj, 
                tunjangan_transport = :tr, 
                tunjangan_makan = :tm 
            WHERE pegawai_id = :id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':gp' => $data->gaji_pokok,
        ':tj' => $data->tunjangan_jabatan,
        ':tr' => $data->tunjangan_transport,
        ':tm' => $data->tunjangan_makan,
        ':id' => $data->pegawai_id
    ]);

    echo json_encode(["status" => "success", "message" => "Komponen gaji berhasil diperbarui"]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>