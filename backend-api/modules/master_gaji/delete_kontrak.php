<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["status" => "error", "message" => "Method not allowed"]); exit; }

require_once '../../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) { http_response_code(400); echo json_encode(["status" => "error", "message" => "Invalid JSON"]); exit; }

    $id_kontrak = $data['id_kontrak'] ?? null;

    if (!$id_kontrak) { 
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "ID Kontrak harus dikirim"]); 
        exit; 
    }

    $db->beginTransaction();

    // 1. Hapus Nominal (Komponen Gaji) Terkait Kontrak Ini
    // Jika ada foreign key cascade, ini mungkin otomatis, tapi untuk aman kita hapus manual dahulu
    $stmt1 = $db->prepare("DELETE FROM nominal_kontrak WHERE id_kontrak = ?");
    $stmt1->execute([$id_kontrak]);

    // 2. Hapus Kontrak Kerja
    $stmt2 = $db->prepare("DELETE FROM kontrak_kerja WHERE id_kontrak = ?");
    $stmt2->execute([$id_kontrak]);

    if ($stmt2->rowCount() > 0) {
        $db->commit();
        echo json_encode([
            "status" => "success",
            "message" => "Kontrak berhasil dihapus"
        ]);
    } else {
        $db->rollBack();
        echo json_encode([
            "status" => "error",
            "message" => "Kontrak tidak ditemukan atau sudah dihapus"
        ]);
    }

} catch (PDOException $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
} catch (Exception $e) {
    @$db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
