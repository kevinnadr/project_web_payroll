<?php
/**
 * FILE: backend-api/modules/master_gaji/read_pph_ter.php
 * Purpose: Get all PPH TER data
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once '../../config/database.php';

try {
    $sql = "SELECT 
                id_ter as id,
                kategori_ter as kategori,
                penghasilan_min as min,
                penghasilan_max as max,
                tarif_persen as tarif
            FROM pph_ter 
            ORDER BY kategori_ter ASC, penghasilan_min ASC";
    
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
