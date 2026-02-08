<?php
// FILE: backend-api/modules/pegawai/save.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

// Matikan display error agar JSON tidak rusak
ini_set('display_errors', 0);
error_reporting(E_ALL);

$input = file_get_contents("php://input");
$data = json_decode($input);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Data tidak valid"]);
    exit;
}

try {
    $db->beginTransaction();

    // --- DATA DARI FRONTEND ---
    $id = $data->id ?? null; // Jika ada ID = Edit, Jika null = Baru
    
    // Data Tabel PEGAWAI
    $nik = $data->nik;
    $nama = strtoupper($data->nama_lengkap);
    $jabatan = $data->jabatan;
    $email = $data->email ?? null;
    $tgl_masuk = $data->tanggal_masuk ?? date('Y-m-d');

    // Data Tabel INFO_FINANSIAL
    $gaji = (float)($data->gaji_pokok ?? 0);
    $ptkp = $data->status_ptkp ?? 'TK/0';
    $status_peg = $data->status_kepegawaian ?? 'Pegawai Tetap';
    $hari_kerja = (int)($data->hari_kerja_efektif ?? 20);
    $bank = $data->bank_nama ?? null;
    $rekening = $data->bank_rekening ?? null;

    if ($id) {
        // === MODE UPDATE (EDIT) ===
        
        // 1. Update Tabel Induk (Pegawai)
        $sql1 = "UPDATE pegawai SET nik=?, nama_lengkap=?, jabatan=?, email=?, tanggal_masuk=? WHERE id=?";
        $db->prepare($sql1)->execute([$nik, $nama, $jabatan, $email, $tgl_masuk, $id]);

        // 2. Update Tabel Anak (Info Finansial)
        // Cek dulu apakah data finansialnya sudah ada?
        $cek = $db->prepare("SELECT id FROM info_finansial WHERE pegawai_id=?");
        $cek->execute([$id]);
        
        if ($cek->rowCount() > 0) {
            $sql2 = "UPDATE info_finansial SET 
                     gaji_pokok=?, status_ptkp=?, status_kepegawaian=?, hari_kerja_efektif=?, bank_nama=?, bank_rekening=? 
                     WHERE pegawai_id=?";
            $db->prepare($sql2)->execute([$gaji, $ptkp, $status_peg, $hari_kerja, $bank, $rekening, $id]);
        } else {
            // Jika belum ada (kasus data lama), kita Insert baru
            $sql2 = "INSERT INTO info_finansial (pegawai_id, gaji_pokok, status_ptkp, status_kepegawaian, hari_kerja_efektif, bank_nama, bank_rekening)
                     VALUES (?, ?, ?, ?, ?, ?, ?)";
            $db->prepare($sql2)->execute([$id, $gaji, $ptkp, $status_peg, $hari_kerja, $bank, $rekening]);
        }

        $msg = "Data Pegawai Berhasil Diupdate!";

    } else {
        // === MODE INSERT (BARU) ===
        
        // 1. Insert Tabel Induk (Pegawai)
        $sql1 = "INSERT INTO pegawai (nik, nama_lengkap, jabatan, email, tanggal_masuk) VALUES (?, ?, ?, ?, ?)";
        $db->prepare($sql1)->execute([$nik, $nama, $jabatan, $email, $tgl_masuk]);
        
        $new_id = $db->lastInsertId(); // Ambil ID pegawai yang baru dibuat

        // 2. Insert Tabel Anak (Info Finansial)
        $sql2 = "INSERT INTO info_finansial (pegawai_id, gaji_pokok, status_ptkp, status_kepegawaian, hari_kerja_efektif, bank_nama, bank_rekening)
                 VALUES (?, ?, ?, ?, ?, ?, ?)";
        $db->prepare($sql2)->execute([$new_id, $gaji, $ptkp, $status_peg, $hari_kerja, $bank, $rekening]);

        $msg = "Pegawai Baru Berhasil Ditambahkan!";
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => $msg]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => "Gagal: " . $e->getMessage()]);
}
?>