<?php
// FILE: backend-api/modules/pegawai/read.php
// Read all employees from pegawai table with PTKP and associated contracts grouped by employee
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $sql = "SELECT 
                p.id_pegawai,
                p.nik, 
                p.nama_lengkap, 
                p.email, 
                p.npwp,
                p.npwp,
                sp.status_ptkp,
                k.id_kontrak,
                k.no_kontrak,
                k.jabatan, 
                k.jenis_kontrak, 
                k.tanggal_mulai,
                k.tanggal_berakhir
            FROM pegawai p
            LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            ORDER BY p.id_pegawai ASC, k.tanggal_mulai DESC"; // Order contracts by newest first

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $grouped = [];
    foreach ($rows as $row) {
        $id = $row['id_pegawai'];
        if (!isset($grouped[$id])) {
            $grouped[$id] = [
                'id_pegawai' => $row['id_pegawai'],
                'nik' => $row['nik'],
                'nama_lengkap' => $row['nama_lengkap'],
                'email' => $row['email'],
                'npwp' => $row['npwp'],
                'npwp' => $row['npwp'],
                'status_ptkp' => $row['status_ptkp'],
                'contracts' => []
            ];
        }
        
        // Add contract if it exists (check if id_kontrak is not null)
        if ($row['id_kontrak']) {
            $grouped[$id]['contracts'][] = [
                'id_kontrak' => $row['id_kontrak'],
                'no_kontrak' => $row['no_kontrak'],
                'jabatan' => $row['jabatan'],
                'jenis_kontrak' => $row['jenis_kontrak'],
                'tanggal_mulai' => $row['tanggal_mulai'],
                'tanggal_berakhir' => $row['tanggal_berakhir']
            ];
        }
    }

    // Re-index array to be 0-based for JSON
    $data = array_values($grouped);

    echo json_encode([
        "status" => "success",
        "data" => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>