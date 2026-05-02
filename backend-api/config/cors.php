<?php
// config/cors.php

// Mengizinkan semua akses untuk sementara (agar pasti tembus)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Max-Age: 86400");

// Handle preflight request dari React (Browser biasanya kirim ini dulu)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>