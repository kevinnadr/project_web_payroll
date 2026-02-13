<?php
// Run this once to migrate
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/../backend-api/config/database.php';

try {
    $sql = "ALTER TABLE pegawai ADD COLUMN hari_efektif INT DEFAULT 25";
    $db->exec("ALTER TABLE pegawai ADD COLUMN hari_efektif INT DEFAULT 25");
    echo "Column hari_efektif added successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
