<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // Teknik LEFT JOIN: Ambil semua pegawai, lalu tempelkan data absensi jika ada.
    // Fungsi COALESCE akan mengisi default (20, 0, 0, 0) jika data absensi belum ada (NULL).
    $sql = "SELECT 
                p.id, 
                p.nama_lengkap, 
                p.jabatan,
                COALESCE(a.hadir, 20) as hadir, 
                COALESCE(a.sakit, 0) as sakit, 
                COALESCE(a.izin, 0) as izin, 
                COALESCE(a.alpha, 0) as alpha
            FROM pegawai p 
            LEFT JOIN absensi a ON p.id = a.pegawai_id AND a.bulan = :bulan
            ORDER BY p.nama_lengkap ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute([':bulan' => $bulan]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $data]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>