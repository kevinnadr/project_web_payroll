<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

// Ambil bulan dari parameter GET, default ke bulan sekarang jika tidak ada
$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('Y-m');

try {
    // Query mengambil data dari riwayat_gaji digabung dengan data_pegawai untuk mendapatkan Nama & Jabatan
    $sql = "SELECT 
                r.id, r.pegawai_id, r.bulan, r.gaji_pokok, 
                r.total_penerimaan, r.total_potongan, r.gaji_bersih, 
                r.rincian_komponen,
                p.nik, p.nama_lengkap, k.jabatan
            FROM riwayat_gaji r
            JOIN data_pegawai p ON r.pegawai_id = p.id
            LEFT JOIN kontrak_pegawai k ON p.id = k.pegawai_id
            WHERE r.bulan = ?
            ORDER BY p.nama_lengkap ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($results) {
        echo json_encode(["status" => "success", "data" => $results]);
    } else {
        // Jika data bulan tersebut benar-benar belum di-generate
        echo json_encode(["status" => "empty", "message" => "Data belum tersedia", "data" => []]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>