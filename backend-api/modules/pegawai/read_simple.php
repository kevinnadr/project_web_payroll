<?php
// FILE: backend-api/modules/pegawai/read_simple.php
// Mengambil daftar pegawai ringkas (id, nama, nik) untuk dropdown
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $stmt = $db->query("SELECT id_pegawai, nik, nama_lengkap, status_ptkp FROM pegawai ORDER BY (nik + 0) ASC, nik ASC");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
