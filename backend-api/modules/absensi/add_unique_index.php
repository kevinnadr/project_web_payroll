<?php
require_once '../../config/database.php';

try {
    // Check if index exists
    $stmt = $db->query("SHOW INDEX FROM absensi WHERE Key_name = 'unique_pegawai_date'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $db->exec("ALTER TABLE absensi ADD UNIQUE KEY unique_pegawai_date (id_pegawai, date)");
        echo "Unique index 'unique_pegawai_date' added successfully.";
    } else {
        echo "Unique index 'unique_pegawai_date' already exists.";
    }
} catch (Exception $e) {
    // try different name or catch duplicate key error
    try {
         $db->exec("ALTER TABLE absensi ADD UNIQUE KEY unique_absensi (id_pegawai, date)");
         echo "Unique index 'unique_absensi' added successfully.";
    } catch (Exception $e2) {
         echo "Index likely exists or duplicate data prevents adding unique index. Error: " . $e2->getMessage();
    }
}
?>
