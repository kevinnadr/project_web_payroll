<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$input = json_decode(file_get_contents("php://input"));

// Validasi
if (!isset($input->pegawai_id) || !isset($input->bulan)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

try {
    // Cek apakah data absensi bulan ini sudah ada?
    $cek = $db->prepare("SELECT id FROM absensi WHERE pegawai_id = :id AND bulan = :bln");
    $cek->execute([':id' => $input->pegawai_id, ':bln' => $input->bulan]);
    $existing = $cek->fetch();

    if ($existing) {
        // Kalau sudah ada, UPDATE
        $sql = "UPDATE absensi SET hadir=:h, sakit=:s, izin=:i, alpha=:a WHERE id=:id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':h' => $input->hadir,
            ':s' => $input->sakit,
            ':i' => $input->izin,
            ':a' => $input->alpha,
            ':id' => $existing->id
        ]);
    } else {
        // Kalau belum, INSERT
        $sql = "INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, alpha) VALUES (:pid, :bln, :h, :s, :i, :a)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':pid' => $input->pegawai_id,
            ':bln' => $input->bulan,
            ':h' => $input->hadir,
            ':s' => $input->sakit,
            ':i' => $input->izin,
            ':a' => $input->alpha
        ]);
    }

    echo json_encode(["status" => "success", "message" => "Absensi tersimpan!"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>