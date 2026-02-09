<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$id = $_GET['pegawai_id'] ?? 0;

try {
    $stmt = $db->prepare("SELECT nama_komponen, jenis, tipe_hitungan, nominal FROM pegawai_komponen WHERE pegawai_id = ?");
    $stmt->execute([$id]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}