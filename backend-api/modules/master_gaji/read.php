<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // Query mengambil data pegawai dan absensi periode tertentu
    $sql = "SELECT 
                p.id as pegawai_id, p.nik, p.nama_lengkap, p.jabatan, 
                p.gaji_pokok, p.tunjangan_jabatan, p.tunjangan_transport,
                a.hadir, a.sakit, a.izin, a.cuti, a.alpha, a.telat_x, a.telat_m
            FROM data_pegawai p
            LEFT JOIN data_absensi a ON p.id = a.pegawai_id AND a.bulan = ?
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $final_data = array_map(function($row) use ($bulan) {
        // 1. Hitung Penambahan
        $total_transport = ($row['hadir'] ?? 0) * ($row['tunjangan_transport'] ?? 0);
        $total_bruto = $row['gaji_pokok'] + $row['tunjangan_jabatan'] + $total_transport;

        // 2. Hitung Potongan Denda Telat (Aturan: 5rb flat + 20rb per 15 menit)
        $denda_flat = ($row['telat_x'] ?? 0) * 5000;
        $denda_menit = ceil(($row['telat_m'] ?? 0) / 15) * 20000;
        $total_denda_telat = $denda_flat + $denda_menit;

        // 3. Potongan Lainnya (Misal BPJS & Alpha)
        $bpjs = 100000; // Contoh nilai flat
        $denda_alpha = ($row['alpha'] ?? 0) * 100000; // Contoh denda per hari alpha

        // 4. Gaji Bersih (Take Home Pay)
        $gaji_bersih = $total_bruto - ($bpjs + $total_denda_telat + $denda_alpha);

        return array_merge($row, [
            'bulan' => $bulan,
            'total_transport' => $total_transport,
            'total_bruto' => $total_bruto,
            'denda_telat' => $total_denda_telat,
            'denda_alpha' => $denda_alpha,
            'bpjs' => $bpjs,
            'gaji_bersih' => $gaji_bersih
        ]);
    }, $results);

    echo json_encode(["status" => "success", "data" => $final_data]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}