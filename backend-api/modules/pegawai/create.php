<?php
// FILE: backend-api/modules/pegawai/create.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

// $data = json_decode(file_get_contents("php://input")); 
// Switching to POST/FILES for multipart/form-data support

if (empty($_POST['nik']) || empty($_POST['nama_lengkap'])) {
    echo json_encode(["status" => "error", "message" => "NIK dan Nama wajib diisi!"]);
    exit;
}

try {
    $db->beginTransaction();

    // 1. Get id_ptkp from status_ptkp table
    $id_ptkp = null;
    if (!empty($_POST['status_ptkp'])) {
        $stmtPtkp = $db->prepare("SELECT id_ptkp FROM status_ptkp WHERE status_ptkp = ? LIMIT 1");
        $stmtPtkp->execute([$_POST['status_ptkp']]);
        $ptkpRow = $stmtPtkp->fetch(PDO::FETCH_ASSOC);
        if ($ptkpRow) $id_ptkp = $ptkpRow['id_ptkp'];
    }

    // 1.5 Handle File Upload
    $foto_profil = null;
    if (isset($_FILES['foto_profil']) && $_FILES['foto_profil']['error'] === UPLOAD_ERR_OK) {
        $allowed = ['jpg', 'jpeg', 'png', 'gif'];
        $filename = $_FILES['foto_profil']['name'];
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        if (in_array($ext, $allowed)) {
            $newFilename = time() . '_' . rand(1000,9999) . '.' . $ext;
            $uploadDir = __DIR__ . '/../../uploads/pegawai/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            
            if (move_uploaded_file($_FILES['foto_profil']['tmp_name'], $uploadDir . $newFilename)) {
                $foto_profil = $newFilename;
            }
        }
    }

    // 2. INSERT ke tabel PEGAWAI
    $sql1 = "INSERT INTO pegawai (nik, nama_lengkap, email, no_hp, npwp, id_ptkp, foto_profil) 
             VALUES (:nik, :nama, :email, :no_hp, :npwp, :id_ptkp, :foto_profil)";
    $stmt1 = $db->prepare($sql1);
    $stmt1->execute([
        ':nik'     => $_POST['nik'], // Changed from $data->nik because we use FormData now
        ':nama'    => $_POST['nama_lengkap'],
        ':email'   => $_POST['email'] ?? '',
        ':no_hp'   => $_POST['no_hp'] ?? '',
        ':npwp'    => $_POST['npwp'] ?? '',
        ':id_ptkp' => $id_ptkp,
        ':foto_profil' => $foto_profil
    ]);
    
    $pegawai_id = $db->lastInsertId();

    // 3. INSERT ke tabel KONTRAK KERJA
    // Note: Assuming these fields might also come from POST if sent via FormData
    // For now, keeping defaults as frontend typically sends core data. 
    // If contract info is needed during create, ensure it's in FormData.
    $noKontrak = "NK/" . $pegawai_id . "/" . date('Y') . "-" . rand(1000, 9999);
    $sql2 = "INSERT INTO kontrak_kerja (id_pegawai, no_kontrak, jabatan, jenis_kontrak, tanggal_mulai, tanggal_berakhir) 
             VALUES (:pid, :no_kontrak, :jabatan, :kontrak, :tgl_mulai, :tgl_akhir)";
    $stmt2 = $db->prepare($sql2);
    $stmt2->execute([
        ':pid'        => $pegawai_id,
        ':no_kontrak' => $noKontrak,
        ':jabatan'    => $_POST['jabatan'] ?? 'Staff',
        ':kontrak'    => $_POST['jenis_kontrak'] ?? 'TETAP',
        ':tgl_mulai'  => $_POST['tanggal_mulai'] ?? date('Y-m-d'),
        ':tgl_akhir'  => !empty($_POST['tanggal_berakhir']) ? $_POST['tanggal_berakhir'] : NULL
    ]);

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Pegawai berhasil ditambahkan!", "id_pegawai" => $pegawai_id]);

} catch (PDOException $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
}
?>