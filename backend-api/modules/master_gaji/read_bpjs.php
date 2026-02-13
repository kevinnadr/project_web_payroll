<?php
// FILE: backend-api/modules/master_gaji/read_bpjs.php
// Read BPJS TK and KS data for a specific employee and month.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(["status" => "error", "message" => "Method not allowed"]); exit; }

require_once '../../config/database.php';

try {
    $id_pegawai = $_GET['id_pegawai'] ?? null;
    $date = $_GET['date'] ?? date('Y-m-01'); // Default to current month

    if (!$id_pegawai) {
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "ID Pegawai required"]); 
        exit;
    }

    // Fetch latest record for the month, or the most recent one if exact month not found?
    // User expects to edit "Current" BPJS. Let's look for exact month match first.
    $stmt = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM riwayat_bpjs WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m') LIMIT 1");
    $stmt->execute([$id_pegawai, $date]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$data) {
        // If no data for this specific month, look for the MOST RECENT entry before this month to pre-fill
        // This is a UI convenience: "Last known BPJS settings"
        $stmtLast = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM riwayat_bpjs WHERE id_pegawai = ? AND date < ? ORDER BY date DESC LIMIT 1");
        $stmtLast->execute([$id_pegawai, $date]);
        $data = $stmtLast->fetch(PDO::FETCH_ASSOC);
    }

    echo json_encode(["status" => "success", "data" => $data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
