<?php
// backend-api/modules/pendapatan_lain/read.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

try {
    $periode = $_GET['periode'] ?? date('Y-m');

    $sql = "SELECT p.*, g.nik, g.nama_lengkap, g.foto_profil,
            (SELECT jabatan FROM kontrak_kerja WHERE id_pegawai = g.id_pegawai ORDER BY id_kontrak DESC LIMIT 1) as jabatan
            FROM pendapatan_lain p 
            JOIN pegawai g ON p.id_pegawai = g.id_pegawai
            WHERE DATE_FORMAT(p.date, '%Y-%m') = ?
            ORDER BY g.nama_lengkap ASC, p.nama_pendapatan ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute([$periode]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
