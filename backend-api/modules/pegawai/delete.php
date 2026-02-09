<?php
// FILE: backend-api/modules/pegawai/delete.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id)) {
    echo json_encode(["status" => "error", "message" => "ID tidak ditemukan"]);
    exit;
}

try {
    // Cukup hapus dari tabel induk 'data_pegawai'
    // Tabel anak (kontrak, komponen, presensi) akan terhapus otomatis karena ON DELETE CASCADE
    $sql = "DELETE FROM data_pegawai WHERE id = :id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $data->id]);

    echo json_encode(["status" => "success", "message" => "Pegawai berhasil dihapus permanen."]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Gagal menghapus: " . $e->getMessage()]);
}
?>