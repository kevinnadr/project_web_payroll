<?php
require_once '../../config/database.php';
try {
    $stmt = $db->query("DESCRIBE absensi");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Columns in absensi:\n";
    foreach ($columns as $col) {
        echo $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
