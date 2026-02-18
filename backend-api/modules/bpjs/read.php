<?php
// FILE: backend-api/modules/bpjs/read.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Default period to current month if not provided
    $periode = isset($_GET['periode']) ? $_GET['periode'] : date('Y-m');

    // Select employees and their BPJS data for the specific period
    // If no data exists for the period, return NULL (frontend will handle as 0/empty)
    $sql = "SELECT 
                p.id_pegawai,
                p.nik, 
                p.nama_lengkap, 
                d.id as id_data_bpjs,
                d.periode,
                COALESCE(d.bpjs_tk, 0) as bpjs_tk,
                COALESCE(d.bpjs_ks, 0) as bpjs_ks,
                COALESCE(d.dasar_upah, 0) as dasar_upah
            FROM pegawai p
            LEFT JOIN data_bpjs d ON p.id_pegawai = d.id_pegawai AND d.periode = :periode
            ORDER BY p.nik ASC";

    $stmt = $db->prepare($sql);
    $stmt->bindValue(':periode', $periode);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "periode" => $periode,
        "data" => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Database Error: " . $e->getMessage()
    ]);
}
?>
