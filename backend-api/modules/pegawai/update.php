<?php
// backend-api/modules/pegawai/update.php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Cek Method (Hanya boleh POST/PUT - kita pakai POST biar gampang di axios)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Ambil data JSON dari body request
$data = json_decode(file_get_contents("php://input"));

// Validasi ID
if (empty($data->id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak ditemukan"]);
    exit;
}

try {
    // Query dinamis atau fixed, kita buat fixed dulu untuk field utama
    $sql = "UPDATE pegawai SET 
            nik = :nik,
            nama_lengkap = :nama,
            jabatan = :jabatan,
            gaji_pokok = :gaji,
            email = :email,
            tanggal_masuk = :tgl
            WHERE id = :id";
    
    $stmt = $db->prepare($sql);
    
    $data_param = [
        ':id' => $data->id,
        ':nik' => $data->nik,
        ':nama' => $data->nama_lengkap,
        ':jabatan' => $data->jabatan,
        ':gaji' => $data->gaji_pokok,
        ':email' => !empty($data->email) ? $data->email : null,
        ':tgl' => !empty($data->tanggal_masuk) ? $data->tanggal_masuk : null
    ];
    
    $stmt->execute($data_param);

    echo json_encode([
        "status" => "success",
        "message" => "Data pegawai berhasil diupdate"
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal update pegawai: " . $e->getMessage()]);
}
?>
