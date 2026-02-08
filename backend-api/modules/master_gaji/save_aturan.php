<?php
// FILE: backend-api/modules/master_gaji/get_aturan.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $stmt = $db->query("SELECT * FROM aturan_gaji LIMIT 1");
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Default value jika tabel kosong
    if (!$data) {
        $data = [
            'jam_masuk_kantor' => '08:00', 
            'denda_keterlambatan_awal' => 0, 
            'denda_per_15_menit' => 0,
            'denda_alpha' => 100000
        ];
    }

    echo json_encode(["status" => "success", "data" => $data]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>