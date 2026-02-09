<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Ambil data pegawai, kontrak, dan komponen utama (Gaji Pokok & BPJS)
            // Use aggregated subqueries for kontrak_pegawai and komponen_gaji to avoid duplicate JOIN rows
            $sql = "SELECT p.id, p.nik, p.nama_lengkap, k.jabatan, 
                 g.gaji_pokok, g.tunjangan_makan, g.tunjangan_transport, g.tunjangan_jabatan, g.ikut_bpjs_tk, g.ikut_bpjs_ks,
                 COALESCE(a.hadir, 0) as hadir,
                 COALESCE(a.telat_x, 0) as telat_x,
                 COALESCE(a.telat_m, 0) as telat_m
             FROM data_pegawai p
            LEFT JOIN (
                SELECT pegawai_id, MAX(jabatan) AS jabatan
                FROM kontrak_pegawai
                GROUP BY pegawai_id
            ) k ON p.id = k.pegawai_id
            LEFT JOIN (
                SELECT pegawai_id, 
                       MAX(gaji_pokok) AS gaji_pokok, 
                       MAX(tunjangan_makan) AS tunjangan_makan, 
                       MAX(tunjangan_transport) AS tunjangan_transport, 
                       MAX(tunjangan_jabatan) AS tunjangan_jabatan, 
                       MAX(ikut_bpjs_tk) AS ikut_bpjs_tk, 
                       MAX(ikut_bpjs_ks) AS ikut_bpjs_ks
                FROM komponen_gaji
                GROUP BY pegawai_id
            ) g ON p.id = g.pegawai_id
            LEFT JOIN (
                SELECT pegawai_id, SUM(hadir) as hadir, SUM(telat_x) as telat_x, SUM(telat_m) as telat_m
                FROM data_absensi
                WHERE bulan = ?
                GROUP BY pegawai_id
            ) a ON p.id = a.pegawai_id
            ORDER BY p.nik ASC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $pegawais = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($pegawais as $p) {
        // Normalisasi nilai agar frontend selalu menerima angka/flag
        $p['gaji_pokok'] = isset($p['gaji_pokok']) ? (int)$p['gaji_pokok'] : 0;
        $p['tunjangan_makan'] = isset($p['tunjangan_makan']) ? (int)$p['tunjangan_makan'] : 0;
        $p['tunjangan_transport'] = isset($p['tunjangan_transport']) ? (int)$p['tunjangan_transport'] : 0;
        $p['tunjangan_jabatan'] = isset($p['tunjangan_jabatan']) ? (int)$p['tunjangan_jabatan'] : 0;
        $p['ikut_bpjs_tk'] = isset($p['ikut_bpjs_tk']) ? (int)$p['ikut_bpjs_tk'] : 0;
        $p['ikut_bpjs_ks'] = isset($p['ikut_bpjs_ks']) ? (int)$p['ikut_bpjs_ks'] : 0;

        // 2. Ambil komponen dinamis per pegawai
        $stmtKomp = $db->prepare("SELECT nama_komponen as nama, jenis, tipe_hitungan as tipe, nominal 
                                  FROM pegawai_komponen 
                                  WHERE pegawai_id = ?");
        $stmtKomp->execute([$p['id']]);
        $komps = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
        // Normalize tipe values returned so frontend can rely on 'perhari'|'perbulan'
        foreach ($komps as &$kc) {
            $raw = isset($kc['tipe']) ? $kc['tipe'] : (isset($kc['tipe_hitungan']) ? $kc['tipe_hitungan'] : 'perbulan');
            $norm = strtolower(trim($raw));
            $norm = str_replace([' ', '_'], '', $norm);
            if (strpos($norm, 'hari') !== false) $kc['tipe'] = 'perhari'; else $kc['tipe'] = 'perbulan';
            // ensure nominal is integer
            $kc['nominal'] = isset($kc['nominal']) ? (int)$kc['nominal'] : 0;
        }
        unset($kc);
        $p['list_komponen'] = $komps;

        // 3. Hitung Denda Terlambat (5rb flat + 20rb per 15 menit)
        $denda_flat = $p['telat_x'] * 5000;
        $denda_menit = ceil($p['telat_m'] / 15) * 20000;
        $p['denda_telat'] = $denda_flat + $denda_menit;

        // 4. Hitung Gaji Bersih Sederhana (Gaji Pokok - Denda Telat - BPJS)
        // (Anda bisa menambahkan logika tunjangan lain di sini)
        $bpjs = 100000; 
        $p['gaji_bersih'] = ($p['gaji_pokok'] ?? 0) - ($p['denda_telat'] + $bpjs);
        
        $result[] = $p;
    }

    echo json_encode(["status" => "success", "data" => $result]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}