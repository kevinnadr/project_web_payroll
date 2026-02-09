<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    $sql = "SELECT p.id, p.nik, p.nama_lengkap, k.jabatan, 
                   g.gaji_pokok, g.tunjangan_makan as makan_perhari,
                   g.ikut_bpjs_tk, g.ikut_bpjs_ks,
                   COALESCE(a.hadir, 0) as hadir, 
                   COALESCE(a.telat_x, 0) as telat_x, 
                   COALESCE(a.telat_m, 0) as telat_m
            FROM data_pegawai p
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
            LEFT JOIN data_absensi a ON p.id = a.pegawai_id AND a.bulan = ?
            ORDER BY p.nik ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $final = array_map(function($row) {
        // Logika BPJS sesuai data Anda
        $row['bpjs_tk_val'] = ($row['ikut_bpjs_tk'] == 1) ? 46606 : 0;
        $row['bpjs_ks_val'] = ($row['ikut_bpjs_ks'] == 1) ? 24684 : 0;
        
        // Logika Uang Makan
        $row['total_makan'] = $row['hadir'] * $row['makan_perhari'];
        
        // Logika Denda Telat
        $row['denda_telat'] = ($row['telat_x'] * 5000) + (ceil($row['telat_m'] / 15) * 20000);
        
        // Kalkulasi Take Home Pay
        $row['total_penerimaan'] = $row['gaji_pokok'] + $row['total_makan'];
        $row['total_potongan'] = $row['bpjs_tk_val'] + $row['bpjs_ks_val'] + $row['denda_telat'];
        $row['thp'] = $row['total_penerimaan'] - $row['total_potongan'];
        
        return $row;
    }, $results);

    echo json_encode(["status" => "success", "data" => $final]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}