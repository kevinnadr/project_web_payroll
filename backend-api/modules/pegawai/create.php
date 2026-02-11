<?php
// FILE: backend-api/modules/pegawai/create.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

// Validasi input dasar
if (empty($data->nik) || empty($data->nama_lengkap)) {
    echo json_encode(["status" => "error", "message" => "NIK dan Nama wajib diisi!"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. INSERT KE TABEL 'DATA_PEGAWAI' (Biodata & Pajak)
    $sql1 = "INSERT INTO data_pegawai (nik, nama_lengkap, email, status_ptkp, npwp) 
             VALUES (:nik, :nama, :email, :ptkp, :npwp)";
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute([
        ':nik'   => $data->nik,
        ':nama'  => $data->nama_lengkap,
        ':email' => $data->email ?? '',
        ':ptkp'  => $data->status_ptkp ?? 'TK/0',
        ':npwp'  => $data->npwp ?? ''
    ]);
    
    // Ambil ID Pegawai yang baru saja dibuat
    $pegawai_id = $db->lastInsertId();

    // 2. INSERT KE TABEL 'KONTRAK_KERJA' (Status Kerja)
    $sql2 = "INSERT INTO kontrak_kerja (id_pegawai, jenis_kontrak, jabatan, tanggal_mulai, tanggal_berakhir) 
             VALUES (:pid, :kontrak, :jabatan, :tgl_masuk, :tgl_akhir)";
    $stmt2 = $db->prepare($sql2);
    $stmt2->execute([
        ':pid'       => $pegawai_id,
        ':kontrak'   => $data->jenis_kontrak ?? 'PKWTT',
        ':jabatan'   => $data->jabatan ?? 'Staff',
        ':tgl_masuk' => $data->tanggal_mulai ?? date('Y-m-d'),
        ':tgl_akhir' => !empty($data->tanggal_berakhir) ? $data->tanggal_berakhir : NULL
    ]);

    // 3. INSERT KE TABEL 'KOMPONEN_GAJI' (Gaji & Tunjangan Flat)
    $sql3 = "INSERT INTO komponen_gaji (pegawai_id, gaji_pokok, tunjangan_jabatan, tunjangan_transport, tunjangan_makan, ikut_bpjs_tk, ikut_bpjs_ks) 
             VALUES (:pid, :gapok, :tunj_jab, :tunj_trans, :tunj_makan, :bpjs_tk, :bpjs_ks)";
    $stmt3 = $db->prepare($sql3);
    $stmt3->execute([
        ':pid'        => $pegawai_id,
        ':gapok'      => $data->gaji_pokok ?? 0,
        ':tunj_jab'   => $data->tunjangan_jabatan ?? 0,
        ':tunj_trans' => $data->tunjangan_transport ?? 0,
        ':tunj_makan' => $data->tunjangan_makan ?? 0,
        ':bpjs_tk'    => isset($data->ikut_bpjs_tk) ? $data->ikut_bpjs_tk : 1,
        ':bpjs_ks'    => isset($data->ikut_bpjs_ks) ? $data->ikut_bpjs_ks : 1
    ]);

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Pegawai Berhasil Ditambah (Data tersebar ke 3 tabel)"]);

} catch (PDOException $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>