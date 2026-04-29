<?php
require_once 'config/database.php';
$stmt = $db->query("SELECT sg.id_slip, sg.id_pegawai, sg.periode, p.nama_lengkap, p.email 
                    FROM slip_gaji sg 
                    JOIN pegawai p ON sg.id_pegawai = p.id_pegawai 
                    ORDER BY id_slip DESC LIMIT 10");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($results, JSON_PRETTY_PRINT);
