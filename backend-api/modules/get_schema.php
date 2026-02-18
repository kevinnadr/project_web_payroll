<?php
require_once '../config/database.php';

try {
    $tables = ['pegawai', 'kontrak_kerja'];
    $schemas = [];

    foreach ($tables as $table) {
        $stmt = $db->query("SHOW CREATE TABLE $table");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $schemas[$table] = $row['Create Table'];
    }

    file_put_contents('schema.json', json_encode($schemas, JSON_PRETTY_PRINT));

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
