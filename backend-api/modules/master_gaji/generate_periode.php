<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"));
$bulan = $input->bulan ?? date('Y-m');

try {
    $db->beginTransaction();

    // 1. Ambil data dasar & BPJS dari komponen_gaji
    $sql = "SELECT p.id, p.nama_lengkap, g.gaji_pokok, g.ikut_bpjs_tk, g.ikut_bpjs_ks 
            FROM data_pegawai p
            JOIN komponen_gaji g ON p.id = g.pegawai_id";
    $pegawais = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    foreach ($pegawais as $p) {
        $total_penerimaan = $p['gaji_pokok'];
        $total_potongan = 0;
        $rincian_slip = [];

        // 2. Ambil Komponen Dinamis (Harian/Mingguan/Bulanan)
        $stmtK = $db->prepare("SELECT * FROM pegawai_komponen WHERE pegawai_id = ?");
        $stmtK->execute([$p['id']]);
        $komponens = $stmtK->fetchAll(PDO::FETCH_ASSOC);

        foreach ($komponens as $k) {
            $nominal_final = $k['nominal'];
            
            // Logika Frekuensi
            if ($k['tipe_hitungan'] === 'harian') {
                // Contoh: Ambil data hadir dari tabel absensi (asumsi 22 hari jika belum ada absensi)
                $nominal_final = $k['nominal'] * 22; 
            } elseif ($k['tipe_hitungan'] === 'mingguan') {
                $nominal_final = $k['nominal'] * 4;
            }

            if ($k['jenis'] === 'penerimaan') {
                $total_penerimaan += $nominal_final;
            } else {
                $total_potongan += $nominal_final;
            }

            $rincian_slip[] = [
                "nama" => $k['nama_komponen'] . " (" . $k['tipe_hitungan'] . ")",
                "jenis" => $k['jenis'],
                "nilai" => $nominal_final
            ];
        }

        // 3. Hitung BPJS Otomatis (Jika Aktif)
        if ($p['ikut_bpjs_tk']) {
            $pot_tk = $p['gaji_pokok'] * 0.03; // Contoh 3%
            $total_potongan += $pot_tk;
            $rincian_slip[] = ["nama" => "BPJS TK (JHT & JP)", "jenis" => "potongan", "nilai" => $pot_tk];
        }
        if ($p['ikut_bpjs_ks']) {
            $pot_ks = $p['gaji_pokok'] * 0.01; // Contoh 1%
            $total_potongan += $pot_ks;
            $rincian_slip[] = ["nama" => "BPJS Kesehatan", "jenis" => "potongan", "nilai" => $pot_ks];
        }

        $gaji_bersih = $total_penerimaan - $total_potongan;

        // 4. Simpan Snapshot ke riwayat_gaji
        $stmtIns = $db->prepare("INSERT INTO riwayat_gaji (pegawai_id, bulan, gaji_pokok, total_penerimaan, total_potongan, gaji_bersih, rincian_komponen) 
            VALUES (?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE gaji_pokok=VALUES(gaji_pokok), total_penerimaan=VALUES(total_penerimaan), 
            total_potongan=VALUES(total_potongan), gaji_bersih=VALUES(gaji_bersih), rincian_komponen=VALUES(rincian_komponen)");
        
        $stmtIns->execute([
            $p['id'], $bulan, $p['gaji_pokok'], $total_penerimaan, $total_potongan, $gaji_bersih, json_encode($rincian_slip)
        ]);
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Gaji berhasil di-generate!"]);
} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}