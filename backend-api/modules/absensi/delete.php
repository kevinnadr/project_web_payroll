<?php
// FILE: backend-api/modules/absensi/delete.php
// Hapus data absensi - support single delete & bulk delete

require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $bulan = $data['bulan'] ?? null;

    if (!$bulan) {
        echo json_encode(["status" => "error", "message" => "Parameter bulan tidak ditemukan."]);
        exit;
    }

    // Validasi format bulan
    if (!preg_match('/^\d{4}-\d{2}$/', $bulan)) {
        echo json_encode(["status" => "error", "message" => "Format bulan tidak valid."]);
        exit;
    }

    $db->beginTransaction();

    // --- BULK DELETE ---
    if (isset($data['pegawai_ids']) && is_array($data['pegawai_ids']) && count($data['pegawai_ids']) > 0) {
        $ids = array_map('intval', $data['pegawai_ids']); // sanitize to int
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $db->prepare("
            DELETE FROM absensi 
            WHERE id_pegawai IN ($placeholders)
            AND date LIKE ?
        ");

        $params = array_merge($ids, [$bulan . '%']);
        $stmt->execute($params);

        $affected = $stmt->rowCount();
        $db->commit();

        echo json_encode([
            "status" => "success",
            "message" => "Berhasil menghapus $affected data absensi untuk " . count($ids) . " pegawai pada periode $bulan."
        ]);

    // --- SINGLE DELETE ---
    } elseif (isset($data['pegawai_id'])) {
        $pegawaiId = intval($data['pegawai_id']);

        $stmt = $db->prepare("
            DELETE FROM absensi 
            WHERE id_pegawai = ?
            AND date LIKE ?
        ");
        $stmt->execute([$pegawaiId, $bulan . '%']);

        $affected = $stmt->rowCount();
        $db->commit();

        if ($affected >= 0) {
            echo json_encode([
                "status" => "success",
                "message" => "Data absensi pegawai berhasil dihapus untuk periode $bulan."
            ]);
        } else {
            $db->rollBack();
            echo json_encode([
                "status" => "error",
                "message" => "Gagal menghapus data absensi."
            ]);
        }

    } else {
        $db->rollBack();
        echo json_encode(["status" => "error", "message" => "Parameter pegawai_id atau pegawai_ids tidak ditemukan."]);
    }

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
