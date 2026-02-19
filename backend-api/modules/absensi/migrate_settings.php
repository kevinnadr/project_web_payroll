<?php
require_once __DIR__ . '/../../config/database.php';

try {
    $db->exec("CREATE TABLE IF NOT EXISTS pengaturan_absensi (
        id INT PRIMARY KEY,
        denda_telat_harian DECIMAL(15,2) DEFAULT 5000,
        denda_telat_per_blok DECIMAL(15,2) DEFAULT 20000,
        menit_per_blok INT DEFAULT 15,
        pembagi_lembur INT DEFAULT 173,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Insert default row if not exists
    $stmt = $db->query("SELECT COUNT(*) FROM pengaturan_absensi");
    if ($stmt->fetchColumn() == 0) {
        $db->exec("INSERT INTO pengaturan_absensi (id, denda_telat_harian, denda_telat_per_blok, menit_per_blok, pembagi_lembur) VALUES (1, 5000, 20000, 15, 173)");
        echo "Default settings inserted.\n";
    }

    echo "Table pengaturan_absensi created/checked successfully.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
