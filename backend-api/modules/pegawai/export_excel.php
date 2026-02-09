<?php
// FILE: backend-api/modules/pegawai/export_excel.php
require_once '../../config/database.php';

header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=Data_Pegawai.xls");

$sql = "SELECT p.nik, p.nama_lengkap, p.email, p.status_ptkp, k.jabatan, k.jenis_kontrak, k.tanggal_masuk, g.gaji_pokok 
        FROM data_pegawai p
        LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
        LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
        ORDER BY p.id ASC";
$stmt = $db->query($sql);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border='1'>
<tr><th>NIK</th><th>Nama</th><th>Email</th><th>PTKP</th><th>Jabatan</th><th>Status</th><th>Tgl Masuk</th><th>Gaji Pokok</th></tr>";
foreach ($data as $row) {
    echo "<tr>
        <td>'{$row['nik']}</td><td>{$row['nama_lengkap']}</td><td>{$row['email']}</td><td>{$row['status_ptkp']}</td>
        <td>{$row['jabatan']}</td><td>{$row['jenis_kontrak']}</td><td>{$row['tanggal_masuk']}</td><td>{$row['gaji_pokok']}</td>
    </tr>";
}
echo "</table>";
?>