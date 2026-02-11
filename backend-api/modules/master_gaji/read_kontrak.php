<?php
/**
 * FILE: backend-api/modules/master_gaji/read_kontrak.php
 * Purpose: Fetch all employee contracts with their components
 * Matches latihan123 database schema
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

require_once '../../config/database.php';

$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('Y-m');

try {
    // Get all employees with their active contracts and salary components
    $sql = "SELECT 
                p.id_pegawai as id,
                p.nik,
                p.nama_lengkap,
                sp.status_ptkp,
                k.id_kontrak,
                k.no_kontrak,
                k.jabatan,
                k.tanggal_mulai,
                k.tanggal_berakhir,
                k.jenis_kontrak,
                GROUP_CONCAT(CONCAT(kp.nama_komponen, ':', nk.nominal) SEPARATOR '|') as komponen,
                SUM(CASE WHEN kp.jenis_komponen = 'BULANAN' THEN nk.nominal ELSE 0 END) as gaji_total,
                SUM(CASE WHEN kp.nama_komponen LIKE '%Tunjangan%' THEN nk.nominal ELSE 0 END) as tunjangan
            FROM pegawai p
            LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            LEFT JOIN nominal_kontrak nk ON k.id_kontrak = nk.id_kontrak
            LEFT JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen
            GROUP BY p.id_pegawai, k.id_kontrak
            ORDER BY p.nama_lengkap ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $data,
        "bulan" => $bulan
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
