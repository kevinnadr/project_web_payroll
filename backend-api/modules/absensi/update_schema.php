<?php
require_once '../../config/database.php';

try {
    // Check if column exists
    $stmt = $db->query("SHOW COLUMNS FROM absensi LIKE 'jam_lembur'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $db->exec("ALTER TABLE absensi ADD COLUMN jam_lembur INT DEFAULT 0 AFTER menit_terlambat");
        echo "Column 'jam_lembur' added successfully.";
    } else {
        echo "Column 'jam_lembur' already exists.";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
