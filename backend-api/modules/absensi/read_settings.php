<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $stmt = $db->query("SELECT * FROM pengaturan_absensi WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        // Fallback default
        $settings = [
            'denda_telat_harian' => 5000,
            'denda_telat_per_blok' => 20000,
            'menit_per_blok' => 15,
            'pembagi_lembur' => 173,
            'tarif_lembur_per_jam' => 20000
        ];
    }

    echo json_encode(["status" => "success", "data" => $settings]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
