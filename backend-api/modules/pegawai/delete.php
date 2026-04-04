<?php
// FILE: backend-api/modules/pegawai/delete.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

// Frontend sends 'id_pegawai'
$id = $data->id_pegawai ?? $data->id ?? null;

if (empty($id)) {
    echo json_encode(["status" => "error", "message" => "ID tidak ditemukan"]);
    exit;
}

try {
    // Ambil info foto profil sebelum data dihapus
    $stmtFoto = $db->prepare("SELECT foto_profil FROM pegawai WHERE id_pegawai = ?");
    $stmtFoto->execute([$id]);
    $fotoData = $stmtFoto->fetch(PDO::FETCH_ASSOC);

    // Delete from 'pegawai' table (cascade will handle child tables if foreign keys set up correctly)
    $sql = "DELETE FROM pegawai WHERE id_pegawai = :id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() > 0) {
        // Hapus file foto dari server jika ada
        if ($fotoData && !empty($fotoData['foto_profil'])) {
            $filePath = __DIR__ . '/../../uploads/pegawai/' . $fotoData['foto_profil'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
        echo json_encode(["status" => "success", "message" => "Pegawai berhasil dihapus permanen."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Data tidak ditemukan."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Gagal menghapus: " . $e->getMessage()]);
}
?>