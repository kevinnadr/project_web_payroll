<?php
// FILE: backend-api/modules/master_gaji/save_gaji_pegawai.php

// Matikan output buffering agar error PHP langsung terlihat
// ob_start(); // Jangan pakai ini dulu saat debugging

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Tampilkan semua error PHP
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../../config/database.php';
require_once '../../config/cors.php';

// Ambil Data dari Frontend
$input = file_get_contents("php://input");
$data = json_decode($input);

// Cek jika data kosong
if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Input JSON Kosong/Salah Format. Input: " . $input]);
    exit;
}

if (!isset($data->pegawai_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Pegawai ID tidak ditemukan dalam data yang dikirim."]);
    exit;
}

try {
    $db->beginTransaction();

    // === A. UPDATE DATA GAJI POKOK ===
    $cek = $db->prepare("SELECT id FROM info_finansial WHERE pegawai_id = ?");
    $cek->execute([$data->pegawai_id]);

    if ($cek->rowCount() > 0) {
        $stmtInfo = $db->prepare("UPDATE info_finansial SET gaji_pokok = ?, hari_kerja_efektif = ? WHERE pegawai_id = ?");
        $stmtInfo->execute([$data->gaji_pokok, $data->hari_kerja_efektif, $data->pegawai_id]);
    } else {
        $stmtInfo = $db->prepare("INSERT INTO info_finansial (pegawai_id, gaji_pokok, hari_kerja_efektif) VALUES (?, ?, ?)");
        $stmtInfo->execute([$data->pegawai_id, $data->gaji_pokok, $data->hari_kerja_efektif]);
    }

    // === B. UPDATE KOMPONEN GAJI ===
    $del = $db->prepare("DELETE FROM pegawai_komponen WHERE pegawai_id = ?");
    $del->execute([$data->pegawai_id]);

    if (!empty($data->komponen) && is_array($data->komponen)) {
        foreach ($data->komponen as $k) {
            // Cari Komponen di Master
            $cekKomp = $db->prepare("SELECT id FROM komponen_gaji WHERE nama_komponen = ?");
            $cekKomp->execute([$k->nama_komponen]);
            
            $kompId = 0;
            if ($cekKomp->rowCount() > 0) {
                $kompId = $cekKomp->fetchColumn();
            } else {
                $newKomp = $db->prepare("INSERT INTO komponen_gaji (nama_komponen, jenis, tipe_hitungan) VALUES (?, ?, ?)");
                $newKomp->execute([$k->nama_komponen, $k->jenis, $k->tipe_hitungan]);
                $kompId = $db->lastInsertId();
            }

            $insertRel = $db->prepare("INSERT INTO pegawai_komponen (pegawai_id, komponen_id, nominal) VALUES (?, ?, ?)");
            $insertRel->execute([$data->pegawai_id, $kompId, $k->nominal]);
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data Gaji Berhasil Disimpan!"]);

} catch (PDOException $e) {
    $db->rollBack();
    // Tampilkan pesan error SQL yang detail
    echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
}
?>