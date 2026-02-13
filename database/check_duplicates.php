<?php
require_once __DIR__ . '/../backend-api/config/database.php';

try {
    echo "Checking indexes on absensi table...\n";
    $stmt = $db->query("SHOW INDEX FROM absensi");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($indexes) {
        foreach ($indexes as $idx) {
            echo "Key_name: " . $idx['Key_name'] . ", Column_name: " . $idx['Column_name'] . "\n";
        }
    } else {
        echo "No indexes found.\n";
    }

    echo "\nChecking for duplicates...\n";
    $sql = "SELECT id_pegawai, date, COUNT(*) as count FROM absensi GROUP BY id_pegawai, date HAVING count > 1";
    $duplicates = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    
    if ($duplicates) {
        echo "Found " . count($duplicates) . " duplicate groups.\n";
        foreach ($duplicates as $d) {
            echo "Pegawai " . $d['id_pegawai'] . " on " . $d['date'] . " has " . $d['count'] . " records.\n";
        }
    } else {
        echo "No duplicates found.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
