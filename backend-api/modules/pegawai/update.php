<?php
// FILE: backend-api/modules/pegawai/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_pegawai) || empty($data->nik)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak valid!"]);
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

    // 2. UPDATE PEGAWAI
    $sql1 = "UPDATE pegawai SET 
                nik = :nik, 
                nama_lengkap = :nama, 
                email = :email, 
                npwp = :npwp,
                id_ptkp = :id_ptkp,
                hari_efektif = :hari_efektif
             WHERE id_pegawai = :id";
    
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute([
        ':nik'     => $data->nik,
        ':nama'    => $data->nama_lengkap,
        ':email'   => $data->email ?? '',
        ':npwp'    => $data->npwp ?? '',
        ':id_ptkp' => $id_ptkp,
        ':hari_efektif' => isset($data->hari_efektif) ? (int)$data->hari_efektif : 25,
        ':id'      => $data->id_pegawai
    ]);

    // 3. UPDATE/INSERT KONTRAK KERJA (Only if contract data is provided)
    if (isset($data->jabatan) || isset($data->jenis_kontrak) || isset($data->tanggal_mulai)) {
        $cek = $db->prepare("SELECT id_kontrak FROM kontrak_kerja WHERE id_pegawai = ? LIMIT 1");
        $cek->execute([$data->id_pegawai]);
        
        $paramsContract = [
            ':jabatan'   => $data->jabatan ?? 'Staff',
            ':kontrak'   => $data->jenis_kontrak ?? 'TETAP',
            ':tgl_mulai' => $data->tanggal_mulai ?? date('Y-m-d'),
            ':tgl_akhir' => !empty($data->tanggal_berakhir) ? $data->tanggal_berakhir : NULL,
            ':id'        => $data->id_pegawai
        ];

        if ($cek->rowCount() > 0) {
            $sql2 = "UPDATE kontrak_kerja SET 
                        jabatan = :jabatan, 
                        jenis_kontrak = :kontrak, 
                        tanggal_mulai = :tgl_mulai, 
                        tanggal_berakhir = :tgl_akhir 
                     WHERE id_pegawai = :id";
            $stmt2 = $db->prepare($sql2);
            $stmt2->execute($paramsContract);
        } else {
            // New contract needs extra fields like no_kontrak if not exists
            $sql2 = "INSERT INTO kontrak_kerja (id_pegawai, jabatan, jenis_kontrak, tanggal_mulai, tanggal_berakhir, no_kontrak) 
                     VALUES (:id, :jabatan, :kontrak, :tgl_mulai, :tgl_akhir, :no_kontrak)";
            $paramsContract[':no_kontrak'] = "NK/" . $data->id_pegawai . "/" . date('Y') . "-" . rand(1000, 9999);
            
            $stmt2 = $db->prepare($sql2);
            $stmt2->execute($paramsContract);
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data Pegawai Berhasil Diupdate!"]);

} catch (PDOException $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Update Gagal: " . $e->getMessage()]);
}
?>