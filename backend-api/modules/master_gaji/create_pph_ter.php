<?php
/**
 * FILE: backend-api/modules/master_gaji/create_pph_ter.php
 * Purpose: Create new PPH TER record
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $kategori = $data['kategori'] ?? null;
    $min = $data['min'] ?? 0;
    $max = $data['max'] ?? 0;
    $tarif = $data['tarif'] ?? 0;

    if (!$kategori) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Kategori harus diisi"]);
        exit;
    }

    $sql = "INSERT INTO pph_ter (kategori_ter, penghasilan_min, penghasilan_max, tarif_persen) 
            VALUES (?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    $stmt->execute([$kategori, $min, $max, $tarif]);

    echo json_encode([
        "status" => "success",
        "message" => "PPH TER berhasil ditambahkan",
        "id" => $db->lastInsertId()
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
