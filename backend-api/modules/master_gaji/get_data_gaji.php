<?php
// FILE: backend-api/modules/master_gaji/get_data_gaji.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    // Teknik GROUP_CONCAT: Menggabungkan banyak baris komponen menjadi satu string
    // Format: Nama::Jenis::Nominal::Tipe || Nama::Jenis::Nominal::Tipe
    $sql = "SELECT 
                p.id, 
                p.nik, 
                p.nama_lengkap, 
                p.jabatan, 
                COALESCE(i.gaji_pokok, 0) as gaji_pokok,
                (
                    SELECT GROUP_CONCAT(
                        CONCAT(kg.nama_komponen, '::', kg.jenis, '::', pk.nominal, '::', kg.tipe_hitungan)
                        SEPARATOR '||'
                    )
                    FROM pegawai_komponen pk
                    JOIN komponen_gaji kg ON pk.komponen_id = kg.id
                    WHERE pk.pegawai_id = p.id
                ) as raw_komponen
            FROM pegawai p
            LEFT JOIN info_finansial i ON p.id = i.pegawai_id
            ORDER BY p.nik ASC";

    $stmt = $db->query($sql);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parsing String menjadi Array JSON yang rapi untuk Frontend
    foreach ($data as &$row) {
        $row['list_komponen'] = [];
        
        if (!empty($row['raw_komponen'])) {
            $items = explode('||', $row['raw_komponen']);
            foreach ($items as $item) {
                $parts = explode('::', $item);
                if (count($parts) === 4) {
                    $row['list_komponen'][] = [
                        'nama'    => $parts[0],
                        'jenis'   => $parts[1], // penerimaan / potongan
                        'nominal' => $parts[2],
                        'tipe'    => $parts[3]  // fixed / harian
                    ];
                }
            }
        }
        // Hapus raw string agar respons bersih
        unset($row['raw_komponen']);
    }

    echo json_encode(["status" => "success", "data" => $data]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>