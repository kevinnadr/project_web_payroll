<?php
// FILE: backend-api/modules/pegawai/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

// $data = json_decode(file_get_contents("php://input"));
// Switching to POST/FILES

$id_pegawai = $_POST['id_pegawai'] ?? null;
$nik = $_POST['nik'] ?? null;

if (empty($id_pegawai) || empty($nik)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak valid!"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. Get id_ptkp
    $id_ptkp = null;
    if (!empty($_POST['status_ptkp'])) {
        $stmtPtkp = $db->prepare("SELECT id_ptkp FROM status_ptkp WHERE status_ptkp = ? LIMIT 1");
        $stmtPtkp->execute([$_POST['status_ptkp']]);
        $ptkpRow = $stmtPtkp->fetch(PDO::FETCH_ASSOC);
        if ($ptkpRow) $id_ptkp = $ptkpRow['id_ptkp'];
    }

    // 1.5 Handle File Upload
    $fotoSql = "";
    $params = [
        ':nik'     => $nik,
        ':nama'    => $_POST['nama_lengkap'],
        ':email'   => $_POST['email'] ?? '',
        ':no_hp'   => $_POST['no_hp'] ?? '',
        ':npwp'    => $_POST['npwp'] ?? '',
        ':id_ptkp' => $id_ptkp,
        ':id'      => $id_pegawai
    ];

    if (isset($_FILES['foto_profil']) && $_FILES['foto_profil']['error'] === UPLOAD_ERR_OK) {
        $allowed = ['jpg', 'jpeg', 'png', 'gif'];
        $filename = $_FILES['foto_profil']['name'];
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (in_array($ext, $allowed)) {
            $newFilename = time() . '_' . rand(1000,9999) . '.' . $ext;
            $uploadDir = __DIR__ . '/../../uploads/pegawai/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            
            if (move_uploaded_file($_FILES['foto_profil']['tmp_name'], $uploadDir . $newFilename)) {
                $fotoSql = ", foto_profil = :foto_profil";
                $params[':foto_profil'] = $newFilename;
            }
        }
    }

    // 2. UPDATE PEGAWAI
    $sql1 = "UPDATE pegawai SET 
                nik = :nik, 
                nama_lengkap = :nama, 
                email = :email, 
                no_hp = :no_hp,
                npwp = :npwp,
                id_ptkp = :id_ptkp
                $fotoSql
             WHERE id_pegawai = :id";
    
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute($params);

    // 3. UPDATE/INSERT KONTRAK KERJA
    // Check if contract fields are present in POST
    if (isset($_POST['jabatan']) || isset($_POST['jenis_kontrak'])) {
        $cek = $db->prepare("SELECT id_kontrak FROM kontrak_kerja WHERE id_pegawai = ? LIMIT 1");
        $cek->execute([$id_pegawai]);
        
        $paramsContract = [
            ':jabatan'   => $_POST['jabatan'] ?? 'Staff',
            ':kontrak'   => $_POST['jenis_kontrak'] ?? 'TETAP',
            ':tgl_mulai' => $_POST['tanggal_mulai'] ?? date('Y-m-d'),
            ':tgl_akhir' => !empty($_POST['tanggal_berakhir']) ? $_POST['tanggal_berakhir'] : NULL,
            ':id'        => $id_pegawai
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
            $paramsContract[':no_kontrak'] = "NK/" . $id_pegawai . "/" . date('Y') . "-" . rand(1000, 9999);
            
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