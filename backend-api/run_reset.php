<?php
// FILE: backend-api/run_reset.php
// Menjalankan SQL Reset Data (Truncate)
require_once __DIR__ . '/config/database.php';

try {
    echo "RESET DATA STARTED...\n";
    $sql = file_get_contents(__DIR__ . '/../database/truncate_data.sql');
    
    // Split SQL by semicolon
    $statements = explode(';', $sql);
    foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if ($stmt) {
            $db->exec($stmt);
            echo "Executed: " . substr($stmt, 0, 50) . "...\n";
        }
    }
    
    echo "DATA PEGAWAI BERHASIL DI-RESET!\n";
    echo "Sekarang Anda bisa mulai input fresh.\n";

} catch (PDOException $e) {
    echo "ERROR: " . $e->getMessage();
}
?>
