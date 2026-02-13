<?php
require_once __DIR__ . '/../../config/database.php';

header("Content-Type: application/json");

$response = [];

try {
    // 1. Check total pegawai
    $stmt = $db->query("SELECT COUNT(*) as total FROM pegawai");
    $response['total_pegawai'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 2. Check total contracts
    $stmt = $db->query("SELECT COUNT(*) as total FROM kontrak_kerja");
    $response['total_kontrak'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 3. Run the main query
    $bulan = date('Y-m');
    $sql = "SELECT 
                p.id_pegawai as pegawai_id, 
                p.nik, 
                p.nama_lengkap,
                k.jabatan,
                SUM(IFNULL(a.hadir, 0)) as hadir,
                SUM(IFNULL(a.sakit, 0)) as sakit,
                SUM(IFNULL(a.izin, 0)) as izin,
                SUM(IFNULL(a.cuti, 0)) as cuti
            FROM pegawai p
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR k.tanggal_berakhir >= CURDATE())
            LEFT JOIN absensi a ON p.id_pegawai = a.id_pegawai AND DATE_FORMAT(a.date, '%Y-%m') = ?
            GROUP BY p.id_pegawai, p.nik, p.nama_lengkap, k.jabatan
            ORDER BY p.nama_lengkap ASC";
            
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response['query_result_count'] = count($data);
    $response['first_row'] = !empty($data) ? $data[0] : null;
    $response['status'] = 'success';

} catch (Exception $e) {
    $response['status'] = 'error';
    $response['message'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>
