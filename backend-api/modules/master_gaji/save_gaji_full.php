<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"), true);

// Pastikan pegawai_id ada
if (!isset($input['pegawai_id'])) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai tidak ditemukan"]);
    exit;
}

try {
    // Mulai transaction
    $db->beginTransaction();

    // Sinkronisasi dengan tabel komponen_gaji (primary components)
    $sql = "REPLACE INTO komponen_gaji (
                pegawai_id, 
                gaji_pokok, 
                tunjangan_makan, 
                tunjangan_transport, 
                tunjangan_jabatan, 
                ikut_bpjs_tk, 
                ikut_bpjs_ks
            ) VALUES (?, ?, ?, ?, ?, ?, ?)";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        (int)$input['pegawai_id'],
        isset($input['gaji_pokok']) ? (int)$input['gaji_pokok'] : 0,
        isset($input['tunjangan_makan']) ? (int)$input['tunjangan_makan'] : 0,
        isset($input['tunjangan_transport']) ? (int)$input['tunjangan_transport'] : 0,
        isset($input['tunjangan_jabatan']) ? (int)$input['tunjangan_jabatan'] : 0,
        isset($input['ikut_bpjs_tk']) ? (int)$input['ikut_bpjs_tk'] : 0,
        isset($input['ikut_bpjs_ks']) ? (int)$input['ikut_bpjs_ks'] : 0
    ]);

    // Jika ada komponen dinamis (components), sinkronisasi ke tabel pegawai_komponen
    if (isset($input['components']) && is_array($input['components'])) {
        // Hapus semua komponen lama untuk pegawai, kemudian insert baru
        $del = $db->prepare("DELETE FROM pegawai_komponen WHERE pegawai_id = ?");
        $del->execute([(int)$input['pegawai_id']]);

        $ins = $db->prepare("INSERT INTO pegawai_komponen (pegawai_id, nama_komponen, jenis, tipe_hitungan, nominal) VALUES (?, ?, ?, ?, ?)");
        foreach ($input['components'] as $c) {
            $nama = isset($c['nama']) ? $c['nama'] : '';
            $nominal = isset($c['nominal']) ? (int)$c['nominal'] : 0;
            // default values for optional fields
            $jenis = isset($c['jenis']) ? $c['jenis'] : 'tunjangan';

            // normalize tipe (accepts many formats from frontend/backups)
            $rawTipe = null;
            if (isset($c['tipe'])) $rawTipe = $c['tipe'];
            elseif (isset($c['tipe_hitungan'])) $rawTipe = $c['tipe_hitungan'];
            else $rawTipe = 'perbulan';

            $norm = strtolower(trim($rawTipe));
            $norm = str_replace([' ', '_'], '', $norm);
            if (strpos($norm, 'hari') !== false) {
                $tipe = 'perhari';
            } else {
                $tipe = 'perbulan';
            }

            $ins->execute([(int)$input['pegawai_id'], $nama, $jenis, $tipe, $nominal]);
        }
    }

    $db->commit();

    echo json_encode(["status" => "success", "message" => "Komponen gaji berhasil diperbarui"]);
} catch (Exception $e) {
    // Memberikan pesan error spesifik jika gagal
    echo json_encode(["status" => "error", "message" => $db->errorInfo()[2] ?? $e->getMessage()]);
}