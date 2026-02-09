<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    $sql = "SELECT 
                p.nik, p.nama_lengkap, p.jabatan, p.gaji_pokok, p.tunjangan_jabatan, p.tunjangan_transport,
                a.hadir, a.sakit, a.izin, a.cuti, a.alpha, a.telat_x, a.telat_m
            FROM data_pegawai p
            LEFT JOIN data_absensi a ON p.id = a.pegawai_id AND a.bulan = ?
            WHERE a.id IS NOT NULL";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $final_data = array_map(function($row) use ($bulan) {
        // Logika Denda Terlambat: 5rb flat + 20rb per kelipatan 15 menit
        $denda_flat = $row['telat_x'] * 5000;
        $denda_menit = ceil($row['telat_m'] / 15) * 20000;
        $total_denda_telat = $denda_flat + $denda_menit;

        // Total Transport: Harian * Kehadiran
        $total_transport = $row['tunjangan_transport'] * $row['hadir'];

        // Potongan BPJS (Misal Flat 100rb seperti di gambar)
        $bpjs = 100000;

        // Gaji Bersih
        $gaji_bersih = ($row['gaji_pokok'] + $row['tunjangan_jabatan'] + $total_transport) - ($bpjs + $total_denda_telat);

        return array_merge($row, [
            'bulan' => $bulan,
            'total_transport' => $total_transport,
            'denda_telat' => $total_denda_telat,
            'bpjs' => $bpjs,
            'gaji_bersih' => $gaji_bersih
        ]);
    }, $results);

    echo json_encode(["status" => "success", "data" => $final_data]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}