<?php
// FILE: backend-api/modules/pegawai/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id) || empty($data->nik)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak valid!"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. UPDATE TABEL 'DATA_PEGAWAI'
    $sql1 = "UPDATE data_pegawai SET 
                nik = :nik, 
                nama_lengkap = :nama, 
                email = :email, 
                status_ptkp = :ptkp,
                npwp = :npwp
             WHERE id = :id";
    
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute([
        ':nik'   => $data->nik,
        ':nama'  => $data->nama_lengkap,
        ':email' => $data->email ?? '',
        ':ptkp'  => $data->status_ptkp ?? 'TK/0',
        ':npwp'  => $data->npwp ?? '',
        ':id'    => $data->id
    ]);

    // 2. UPDATE TABEL 'KONTRAK_PEGAWAI'
    // Cek dulu apakah data kontrak ada? Jika tidak (kasus data lama), insert baru.
    $cek2 = $db->prepare("SELECT id FROM kontrak_pegawai WHERE pegawai_id = ?");
    $cek2->execute([$data->id]);
    
    if ($cek2->rowCount() > 0) {
        $sql2 = "UPDATE kontrak_pegawai SET 
                    jenis_kontrak = :kontrak, 
                    jabatan = :jabatan, 
                    tanggal_masuk = :tgl_masuk, 
                    tanggal_berakhir = :tgl_akhir 
                 WHERE pegawai_id = :id";
    } else {
        $sql2 = "INSERT INTO kontrak_pegawai (pegawai_id, jenis_kontrak, jabatan, tanggal_masuk, tanggal_berakhir) 
                 VALUES (:id, :kontrak, :jabatan, :tgl_masuk, :tgl_akhir)";
    }

    $stmt2 = $db->prepare($sql2);
    $stmt2->execute([
        ':kontrak'   => $data->jenis_kontrak ?? 'PKWTT',
        ':jabatan'   => $data->jabatan ?? 'Staff',
        ':tgl_masuk' => $data->tanggal_masuk ?? date('Y-m-d'),
        ':tgl_akhir' => !empty($data->tanggal_berakhir) ? $data->tanggal_berakhir : NULL,
        ':id'        => $data->id
    ]);

    // 3. UPDATE TABEL 'KOMPONEN_GAJI'
    $cek3 = $db->prepare("SELECT id FROM komponen_gaji WHERE pegawai_id = ?");
    $cek3->execute([$data->id]);

    if ($cek3->rowCount() > 0) {
        $sql3 = "UPDATE komponen_gaji SET 
                    gaji_pokok = :gapok, 
                    tunjangan_jabatan = :tunj_jab, 
                    tunjangan_transport = :tunj_trans, 
                    tunjangan_makan = :tunj_makan,
                    ikut_bpjs_tk = :bpjs_tk,
                    ikut_bpjs_ks = :bpjs_ks
                 WHERE pegawai_id = :id";
    } else {
        $sql3 = "INSERT INTO komponen_gaji (pegawai_id, gaji_pokok, tunjangan_jabatan, tunjangan_transport, tunjangan_makan, ikut_bpjs_tk, ikut_bpjs_ks) 
                 VALUES (:id, :gapok, :tunj_jab, :tunj_trans, :tunj_makan, :bpjs_tk, :bpjs_ks)";
    }

    $stmt3 = $db->prepare($sql3);
    $stmt3->execute([
        ':gapok'      => $data->gaji_pokok ?? 0,
        ':tunj_jab'   => $data->tunjangan_jabatan ?? 0,
        ':tunj_trans' => $data->tunjangan_transport ?? 0,
        ':tunj_makan' => $data->tunjangan_makan ?? 0,
        ':bpjs_tk'    => isset($data->ikut_bpjs_tk) ? $data->ikut_bpjs_tk : 1,
        ':bpjs_ks'    => isset($data->ikut_bpjs_ks) ? $data->ikut_bpjs_ks : 1,
        ':id'         => $data->id
    ]);

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data Pegawai Berhasil Diupdate!"]);

} catch (PDOException $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Update Gagal: " . $e->getMessage()]);
}
?>