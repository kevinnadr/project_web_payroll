<?php
/**
 * Test file to diagnose save_kontrak.php
 */

header("Content-Type: application/json");

// Test 1: Check if file exists
if (!file_exists('../../config/database.php')) {
    echo json_encode(["error" => "database.php not found"]);
    exit;
}

// Test 2: Include database
try {
    require_once '../../config/database.php';
    echo json_encode(["status" => "Database connection OK"]);
} catch (Exception $e) {
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
}
?>
