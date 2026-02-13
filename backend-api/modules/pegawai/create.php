<?php
// FILE: backend-api/modules/pegawai/create.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->nik) || empty($data->nama_lengkap)) {
    echo json_encode(["status" => "error", "message" => "NIK dan Nama wajib diisi!"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. Get id_ptkp from status_ptkp table
    $id_ptkp = null;
    if (!empty($data->status_ptkp)) {
        $stmtPtkp = $db->prepare("SELECT id_ptkp FROM status_ptkp WHERE status_ptkp = ? LIMIT 1");
        $stmtPtkp->execute([$data->status_ptkp]);
        $ptkpRow = $stmtPtkp->fetch(PDO::FETCH_ASSOC);
        if ($ptkpRow) $id_ptkp = $ptkpRow['id_ptkp'];
    }

    // 2. INSERT ke tabel PEGAWAI
    $sql1 = "INSERT INTO pegawai (nik, nama_lengkap, email, npwp, id_ptkp) 
             VALUES (:nik, :nama, :email, :npwp, :id_ptkp)";
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute([
        ':nik'     => $data->nik,
        ':nama'    => $data->nama_lengkap,
        ':email'   => $data->email ?? '',
        ':npwp'    => $data->npwp ?? '',
        ':id_ptkp' => $id_ptkp
    ]);
    
    $pegawai_id = $db->lastInsertId();

    // 3. INSERT ke tabel KONTRAK_KERJA
    $noKontrak = "NK/" . $pegawai_id . "/" . date('Y') . "-" . rand(1000, 9999);
    $sql2 = "INSERT INTO kontrak_kerja (id_pegawai, no_kontrak, jabatan, jenis_kontrak, tanggal_mulai, tanggal_berakhir) 
             VALUES (:pid, :no_kontrak, :jabatan, :kontrak, :tgl_mulai, :tgl_akhir)";
    $stmt2 = $db->prepare($sql2);
    $stmt2->execute([
        ':pid'        => $pegawai_id,
        ':no_kontrak' => $noKontrak,
        ':jabatan'    => $data->jabatan ?? 'Staff',
        ':kontrak'    => $data->jenis_kontrak ?? 'TETAP',
        ':tgl_mulai'  => $data->tanggal_mulai ?? date('Y-m-d'),
        ':tgl_akhir'  => !empty($data->tanggal_berakhir) ? $data->tanggal_berakhir : NULL
    ]);

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Pegawai berhasil ditambahkan!", "id_pegawai" => $pegawai_id]);

} catch (PDOException $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>