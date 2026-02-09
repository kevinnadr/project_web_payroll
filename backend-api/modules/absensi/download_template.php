<?php
// FILE: backend-api/modules/absensi/download_template.php
require_once '../../config/cors.php';

header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=Template_Import_Absensi.xls");
header("Pragma: no-cache");
header("Expires: 0");

echo "
<table border='1'>
    <thead>
        <tr style='background-color:#f0f0f0; font-weight:bold;'>
            <th>NIK (Wajib)</th>
            <th>Hadir</th>
            <th>Sakit</th>
            <th>Izin</th>
            <th>Cuti</th>
            <th>Telat (Kali)</th>
            <th>Menit Telat</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>CONTOH001</td>
            <td>20</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
        </tr>
    </tbody>
</table>
";
?>