<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->pegawai_id) && !empty($data->bulan)){
    try {
        // Gunakan REPLACE INTO agar jika data sudah ada diupdate, jika belum ada ditambah baru
        $sql = "REPLACE INTO data_absensi (pegawai_id, bulan, hadir, sakit, izin, alpha) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $data->pegawai_id,
            $data->bulan,
            $data->hadir,
            $data->sakit,
            $data->izin,
            $data->alpha
        ]);

        echo json_encode(["status" => "success", "message" => "Absensi berhasil disimpan"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
}