<?php
// FILE: backend-api/index.php
// Preventing Directory Listing

http_response_code(403);
echo "Forbidden";
?>
