<?php
// backend-api/modules/master_gaji/save_gaji_full.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->pegawai_id)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. Update Gaji Pokok & Status BPJS
    $stmt1 = $db->prepare("UPDATE komponen_gaji SET 
        gaji_pokok = ?, 
        ikut_bpjs_tk = ?, 
        ikut_bpjs_ks = ? 
        WHERE pegawai_id = ?");
    
    $stmt1->execute([
        $data->gaji_pokok, 
        $data->ikut_bpjs_tk ? 1 : 0, 
        $data->ikut_bpjs_ks ? 1 : 0, 
        $data->pegawai_id
    ]);

    // 2. Hapus komponen lama (reset)
    $stmt2 = $db->prepare("DELETE FROM pegawai_komponen WHERE pegawai_id = ?");
    $stmt2->execute([$data->pegawai_id]);

    // 3. Simpan komponen baru dari list
    if (isset($data->komponen_list) && is_array($data->komponen_list)) {
        $sql3 = "INSERT INTO pegawai_komponen (pegawai_id, nama_komponen, jenis, tipe_hitungan, nominal) 
                 VALUES (?, ?, ?, ?, ?)";
        $stmt3 = $db->prepare($sql3);
        
        foreach ($data->komponen_list as $item) {
            $stmt3->execute([
                $data->pegawai_id,
                $item->nama_komponen, // Pastikan key ini sama dengan di React
                $item->jenis,          // penerimaan / potongan
                $item->tipe_hitungan,  // harian / mingguan / bulanan
                $item->nominal
            ]);
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Berhasil disimpan"]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}