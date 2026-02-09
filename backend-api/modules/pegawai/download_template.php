<?php
// FILE: backend-api/modules/pegawai/download_template.php
require_once '../../config/cors.php';

header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=Template_Import_Pegawai.xls");
header("Pragma: no-cache");
header("Expires: 0");

echo "
<table border='1'>
    <thead>
        <tr style='background-color:#f0f0f0; font-weight:bold;'>
            <th>NIK (Wajib)</th>
            <th>Nama Lengkap</th>
            <th>Email</th>
            <th>PTKP (TK/0, K/1)</th>
            <th>Jabatan</th>
            <th>Status (PKWTT/PKWT)</th>
            <th>Tanggal Masuk (YYYY-MM-DD)</th>
            <th>Gaji Pokok</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>12345</td>
            <td>Contoh Nama</td>
            <td>contoh@email.com</td>
            <td>TK/0</td>
            <td>Staff</td>
            <td>PKWTT</td>
            <td>2024-01-01</td>
            <td>5000000</td>
        </tr>
    </tbody>
</table>
";
?>