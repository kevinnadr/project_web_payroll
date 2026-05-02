<?php
// config/error_handler.php

function globalErrorHandler($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno)) return;
    
    if (!headers_sent()) {
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: application/json");
    }
    
    echo json_encode([
        "status" => "error",
        "message" => "PHP Error [$errno]: $errstr",
        "file" => basename($errfile),
        "line" => $errline
    ]);
    exit;
}

function globalExceptionHandler($e) {
    if (!headers_sent()) {
        header("Access-Control-Allow-Origin: *");
        header("Content-Type: application/json");
    }
    
    echo json_encode([
        "status" => "error",
        "message" => "Exception: " . $e->getMessage(),
        "file" => basename($e->getFile()),
        "line" => $e->getLine()
    ]);
    exit;
}

set_error_handler("globalErrorHandler");
set_exception_handler("globalExceptionHandler");
?>
