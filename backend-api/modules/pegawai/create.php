<?php
// FILE: backend-api/modules/pegawai/create.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if(empty($data->nik) || empty($data->nama_lengkap)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

try {
    // Query Insert diperbarui dengan status_kepegawaian & status_ptkp
    $sql = "INSERT INTO pegawai (nik, nama_lengkap, jabatan, status_kepegawaian, status_ptkp, gaji_pokok, email, tanggal_masuk) 
            VALUES (:nik, :nama, :jabatan, :status_peg, :ptkp, :gaji, :email, :tgl)";
    
    $stmt = $db->prepare($sql);
    
    $stmt->execute([
        ':nik' => $data->nik,
        ':nama' => $data->nama_lengkap,
        ':jabatan' => $data->jabatan,
        ':status_peg' => $data->status_kepegawaian ?? 'Pegawai Tetap', // Default jika kosong
        ':ptkp' => $data->status_ptkp ?? '',
        ':gaji' => $data->gaji_pokok,
        ':email' => $data->email,
        ':tgl' => $data->tanggal_masuk
    ]);

    echo json_encode(["status" => "success", "message" => "Pegawai berhasil ditambahkan"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>