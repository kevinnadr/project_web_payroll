<?php
// FILE: backend-api/modules/bpjs/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_pegawai)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai Invalid"]);
    exit;
}

try {
    $periode = $data->periode ?? date('Y-m');
    $date = $periode . '-01'; // Default ke tanggal 1 setiap bulan

    // Cek apakah data sudah ada
    $stmtCheck = $db->prepare("SELECT id_bpjs FROM riwayat_bpjs WHERE id_pegawai = :id AND DATE_FORMAT(date, '%Y-%m') = :periode");
    $stmtCheck->execute([
        ':id' => $data->id_pegawai,
        ':periode' => $periode
    ]);
    
    $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $sql = "UPDATE riwayat_bpjs 
                SET bpjs_tk = :tk, bpjs_ks = :ks, dasar_upah = :upah 
                WHERE id_bpjs = :id_bpjs";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':tk' => $data->bpjs_tk ?? 0,
            ':ks' => $data->bpjs_ks ?? 0,
            ':upah' => $data->dasar_upah ?? 0,
            ':id_bpjs' => $existing['id_bpjs']
        ]);
    } else {
        $sql = "INSERT INTO riwayat_bpjs (id_pegawai, bpjs_tk, bpjs_ks, dasar_upah, date)
                VALUES (:id, :tk, :ks, :upah, :date)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':id' => $data->id_pegawai,
            ':tk' => $data->bpjs_tk ?? 0,
            ':ks' => $data->bpjs_ks ?? 0,
            ':upah' => $data->dasar_upah ?? 0,
            ':date' => $date
        ]);
    }
    
    echo json_encode(["status" => "success", "message" => "Data BPJS Periode $periode Disimpan!"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
