<?php
/**
 * FILE: backend-api/modules/master_gaji/get_komponen.php
 * Purpose: Get all salary components
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../../config/database.php';

try {
    $sql = "SELECT id_komponen as id, nama_komponen as nama, jenis_komponen as jenis 
            FROM komponen_penghasilan 
            ORDER BY nama_komponen ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $data
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
