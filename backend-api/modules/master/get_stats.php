<?php
// backend-api/modules/master/get_stats.php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$bulan_ini = "2026-02"; // Hardcode dulu untuk demo

try {
    // 1. Hitung Total Pegawai & Total Gaji Pokok
    $query1 = $db->query("SELECT COUNT(*) as total_orang, SUM(gaji_pokok) as total_gapok FROM pegawai");
    $data1 = $query1->fetch();

    // 2. Hitung Total Tunjangan Tetap (Dari Master Komponen)
    // Asumsi: Semua komponen 'penerimaan' dibayarkan ke semua pegawai
    $query2 = $db->query("SELECT SUM(nominal) as total_tunjangan FROM komponen_gaji WHERE jenis='penerimaan'");
    $data2 = $query2->fetch();
    
    // Total Estimasi = (Gapok + Tunjangan) * Jumlah Pegawai
    // (Hitungan kasar untuk forecast budget)
    $est_per_orang = $data2->total_tunjangan; // Total tunjangan per 1 orang
    $total_budget = $data1->total_gapok + ($est_per_orang * $data1->total_orang);

    // 3. Hitung Total Alpha (Bulan Ini)
    $query3 = $db->prepare("SELECT SUM(alpha) as total_bolos FROM absensi WHERE bulan = :bln");
    $query3->execute([':bln' => $bulan_ini]);
    $data3 = $query3->fetch();

    echo json_encode([
        "status" => "success",
        "data" => [
            "total_pegawai" => $data1->total_orang,
            "total_budget" => $total_budget,
            "total_alpha" => $data3->total_bolos ?? 0 // Kalau null jadi 0
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>