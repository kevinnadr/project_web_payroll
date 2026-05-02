<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$results = [
    "php_version" => PHP_VERSION,
    "extensions" => [
        "pdo_mysql" => extension_loaded("pdo_mysql"),
        "openssl" => extension_loaded("openssl"),
        "mbstring" => extension_loaded("mbstring"),
        "curl" => extension_loaded("curl"),
        "gd" => extension_loaded("gd"),
        "intl" => extension_loaded("intl"),
    ],
    "mysql_connection" => false,
    "smtp_connectivity" => [
        "port_587" => false,
        "port_465" => false
    ]
];

// Test DB
require_once 'config/database.php';
if (isset($db)) {
    $results["mysql_connection"] = true;
}

// Test SMTP Connectivity (outbound)
$results["smtp_connectivity"]["port_587"] = @fsockopen("smtp.gmail.com", 587, $errno, $errstr, 5) ? true : $errstr;
$results["smtp_connectivity"]["port_465"] = @fsockopen("smtp.gmail.com", 465, $errno, $errstr, 5) ? true : $errstr;

echo json_encode($results, JSON_PRETTY_PRINT);
?>
