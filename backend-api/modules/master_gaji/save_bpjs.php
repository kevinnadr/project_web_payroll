<?php
// FILE: backend-api/modules/master_gaji/save_bpjs.php
// Save BPJS TK and KS data into riwayat_bpjs table for a specific month.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["status" => "error", "message" => "Method not allowed"]); exit; }

require_once '../../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || empty($data['id_pegawai'])) { 
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "Invalid Data / ID Pegawai missing"]); 
        exit; 
    }

    $id_pegawai = $data['id_pegawai'];
    $bpjs_tk = (float)($data['bpjs_tk'] ?? 0);
    $bpjs_ks = (float)($data['bpjs_ks'] ?? 0);
    // Use first day of current month as default 'date' unless specified
    $date = $data['date'] ?? date('Y-m-01');

    // Check if record exists for this employee and month
    $stmtCheck = $db->prepare("SELECT id_bpjs FROM riwayat_bpjs WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')");
    $stmtCheck->execute([$id_pegawai, $date]);
    $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        // Update
        $stmtUpdate = $db->prepare("UPDATE riwayat_bpjs SET bpjs_tk = ?, bpjs_ks = ? WHERE id_bpjs = ?");
        $stmtUpdate->execute([$bpjs_tk, $bpjs_ks, $existing['id_bpjs']]);
    } else {
        // Insert
        $stmtInsert = $db->prepare("INSERT INTO riwayat_bpjs (id_pegawai, bpjs_tk, bpjs_ks, date) VALUES (?, ?, ?, ?)");
        $stmtInsert->execute([$id_pegawai, $bpjs_tk, $bpjs_ks, $date]);
    }

    echo json_encode(["status" => "success", "message" => "Data BPJS berhasil disimpan!"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
