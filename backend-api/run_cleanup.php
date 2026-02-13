<?php
// FILE: backend-api/run_cleanup.php
// Menjalankan SQL Cleanup untuk menghapus tabel lama
require_once __DIR__ . '/config/database.php';

try {
    echo "CLEANUP STARTED...\n";
    $sql = file_get_contents(__DIR__ . '/../database/clean_tables.sql');
    
    // Split SQL by semicolon if necessary, or execute as one block if driver supports it.
    // PDO default doesn't support multiline well, so let's try raw exec.
    
    $statements = explode(';', $sql);
    foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if ($stmt) {
            $db->exec($stmt);
            echo "Executed: " . substr($stmt, 0, 50) . "...\n";
        }
    }
    
    echo "CLEANUP SUCCESS: Tabel lama berhasil dihapus!\n";

} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
