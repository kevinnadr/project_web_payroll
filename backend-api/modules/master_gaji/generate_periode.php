<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"), true);
$bulan = $input['bulan'] ?? date('Y-m');

try {
    $db->beginTransaction();

    // Ambil data acuan dari Master (komponen_gaji) dan Absensi
    $sql = "SELECT p.id, p.nama_lengkap, g.gaji_pokok, g.ikut_bpjs_tk, g.ikut_bpjs_ks,
                   COALESCE(a.hadir, 0) as hadir,
                   COALESCE(a.telat_x, 0) as telat_x,
                   COALESCE(a.telat_m, 0) as telat_m
            FROM data_pegawai p
            LEFT JOIN komponen_gaji g ON p.id = g.pegawai_id
            LEFT JOIN data_absensi a ON p.id = a.pegawai_id AND a.bulan = ?";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $pegawais = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($pegawais as $p) {
        // --- LOGIKA POTONGAN BPJS (Fixed Amount sesuai Gambar) ---
        $potongan_tk = ($p['ikut_bpjs_tk'] == 1) ? 46606 : 0;
        $potongan_ks = ($p['ikut_bpjs_ks'] == 1) ? 24684 : 0;

        // Hitung Denda Telat
        $denda_telat = ($p['telat_x'] * 5000) + (ceil($p['telat_m'] / 15) * 20000);
        
        // Hitung Penerimaan (Contoh: Gaji Pokok + Uang Makan Harian 25rb)
        $total_uang_makan = $p['hadir'] * 25000;
        $total_penerimaan = $p['gaji_pokok'] + $total_uang_makan;
        
        $total_potongan = $denda_telat + $potongan_tk + $potongan_ks;
        $gaji_bersih = $total_penerimaan - $total_potongan;

        // 1. Simpan ke riwayat_gaji (Untuk Slip & Tabel Utama)
        $insGaji = $db->prepare("REPLACE INTO riwayat_gaji 
            (pegawai_id, bulan, gaji_pokok, total_penerimaan, total_potongan, gaji_bersih, bpjs_tk, bpjs_ks) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $insGaji->execute([
            $p['id'], $bulan, $p['gaji_pokok'], $total_penerimaan, $total_potongan, $gaji_bersih, $potongan_tk, $potongan_ks
        ]);

        // 2. Simpan ke riwayat_potongan_bpjs (Untuk Laporan BPJS Detail)
        $insBPJS = $db->prepare("REPLACE INTO riwayat_potongan_bpjs 
            (pegawai_id, bulan, bpjs_tk_karyawan, bpjs_ks_karyawan) 
            VALUES (?, ?, ?, ?)");
        $insBPJS->execute([$p['id'], $bulan, $potongan_tk, $potongan_ks]);
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Riwayat Gaji & BPJS periode $bulan berhasil dikunci!"]);
} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}