<?php
// FILE: backend-api/modules/pegawai/export_excel.php

// 1. Config Database
require_once '../../config/database.php';
require_once '../../config/cors.php';

// 2. Header agar browser tahu ini file Excel
header("Content-type: application/vnd-ms-excel");
header("Content-Disposition: attachment; filename=Data_Pegawai_Payroll.xls");

// 3. Ambil Semua Data Pegawai
try {
    $sql = "SELECT nik, nama_lengkap, jabatan, gaji_pokok, email, tanggal_masuk FROM pegawai ORDER BY nama_lengkap ASC";
    $stmt = $db->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
    exit;
}
?>

<table border="1">
    <thead>
        <tr style="background-color: #fca5a5; font-weight: bold;">
            <th>No</th>
            <th>NIK</th>
            <th>Nama Lengkap</th>
            <th>Jabatan</th>
            <th>Gaji Pokok</th>
            <th>Email</th>
            <th>Tanggal Masuk</th>
        </tr>
    </thead>
    <tbody>
        <?php 
        $no = 1;
        foreach($data as $row): 
        ?>
        <tr>
            <td><?= $no++ ?></td>
            <td style="mso-number-format:'\@';"><?= $row['nik'] ?></td> <td><?= $row['nama_lengkap'] ?></td>
            <td><?= $row['jabatan'] ?></td>
            <td><?= $row['gaji_pokok'] ?></td>
            <td><?= $row['email'] ?></td>
            <td><?= $row['tanggal_masuk'] ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>