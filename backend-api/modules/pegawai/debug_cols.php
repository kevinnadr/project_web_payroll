<?php
require_once __DIR__ . '/../../config/database.php';

header("Content-Type: text/plain");

try {
    echo "--- TABLE PEGAWAI ---\n";
    $stmt = $db->query("DESCRIBE pegawai");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach($cols as $c) {
        echo $c['Field'] . " | " . $c['Type'] . " | " . $c['Null'] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
