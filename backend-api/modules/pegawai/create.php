<?php
// backend-api/modules/pegawai/create.php
require_once '../../config/cors.php';
require_once '../../config/database.php';

// Cek Method (Hanya boleh POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

// Ambil data JSON dari body request
$data = json_decode(file_get_contents("php://input"));

// Validasi dasar
if (empty($data->nik) || empty($data->nama_lengkap) || empty($data->jabatan) || empty($data->gaji_pokok)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap (NIK, Nama, Jabatan, Gaji wajib diisi)"]);
    exit;
}

try {
    $sql = "INSERT INTO pegawai (nik, nama_lengkap, jabatan, gaji_pokok, email, tanggal_masuk) 
            VALUES (:nik, :nama, :jabatan, :gaji, :email, :tgl)";
    
    $stmt = $db->prepare($sql);
    $data_param = [
        ':nik' => $data->nik,
        ':nama' => $data->nama_lengkap,
        ':jabatan' => $data->jabatan,
        ':gaji' => $data->gaji_pokok,
        ':email' => !empty($data->email) ? $data->email : null,
        ':tgl' => !empty($data->tanggal_masuk) ? $data->tanggal_masuk : date('Y-m-d')
    ];
    
    $stmt->execute($data_param);

    echo json_encode([
        "status" => "success",
        "message" => "Pegawai berhasil ditambahkan"
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal tambah pegawai: " . $e->getMessage()]);
}
?>
