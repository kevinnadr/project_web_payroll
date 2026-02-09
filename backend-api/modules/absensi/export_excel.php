<?php
// FILE: backend-api/modules/absensi/export_excel.php
require_once '../../config/database.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=Absensi_".$bulan.".xls");

// Ambil Data Gabungan
$sql = "SELECT p.nik, p.nama_lengkap, p.jabatan,
        COALESCE(a.hadir, 0) as hadir,
        COALESCE(a.sakit, 0) as sakit,
        COALESCE(a.izin, 0) as izin,
        COALESCE(a.cuti, 0) as cuti,
        COALESCE(a.terlambat, 0) as terlambat,
        COALESCE(a.`menit terlambat`, 0) as menit
        FROM pegawai p
        LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = '$bulan'
        ORDER BY p.nik ASC";

$stmt = $db->query($sql);
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<table border='1'>";
echo "<tr>
        <th>NIK</th>
        <th>Nama Pegawai</th>
        <th>Jabatan</th>
        <th>Hadir</th>
        <th>Sakit</th>
        <th>Izin</th>
        <th>Cuti</th>
        <th>Telat (x)</th>
        <th>Menit Telat</th>
      </tr>";

foreach ($data as $row) {
    echo "<tr>";
    echo "<td>'{$row['nik']}</td>";
    echo "<td>{$row['nama_lengkap']}</td>";
    echo "<td>{$row['jabatan']}</td>";
    echo "<td>{$row['hadir']}</td>";
    echo "<td>{$row['sakit']}</td>";
    echo "<td>{$row['izin']}</td>";
    echo "<td>{$row['cuti']}</td>";
    // echo "<td>{$row['alpha']}</td>"; // Alpha tidak ditampilkan
    echo "<td>{$row['terlambat']}</td>";
    echo "<td>{$row['menit']}</td>";
    echo "</tr>";
}
echo "</table>";
?>