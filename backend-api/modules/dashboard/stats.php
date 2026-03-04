<?php
// FILE: backend-api/modules/dashboard/stats.php
// Updated to match latihan123 database schema
require_once '../../config/database.php';
require_once '../../config/cors.php';

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Hitung Total Pegawai Aktif
    $stmtPegawai = $db->query("SELECT COUNT(*) as total FROM pegawai");
    $total_pegawai = $stmtPegawai->fetch(PDO::FETCH_OBJ)->total ?? 0;

    // 2. Hitung Statistik Absensi Bulan Pelaporan berdasarkan DATE YEAR-MONTH
    $bulan_format = $bulan . '%'; // Format YYYY-MM%
    $sqlAbsen = "SELECT 
                    SUM(hadir) as total_hadir,
                    SUM(sakit) as total_sakit,
                    SUM(izin) as total_izin,
                    SUM(cuti) as total_cuti,
                    SUM(CASE WHEN sakit > 0 THEN 1 ELSE 0 END) as orang_sakit,
                    SUM(CASE WHEN izin > 0 THEN 1 ELSE 0 END) as orang_izin,
                    SUM(CASE WHEN cuti > 0 THEN 1 ELSE 0 END) as orang_cuti,
                    SUM(hari_terlambat) as total_hari_telat,
                    SUM(menit_terlambat) as total_menit_telat,
                    COUNT(*) as total_records
                 FROM absensi 
                 WHERE DATE_FORMAT(date, '%Y-%m') = ?";
    $stmtAbsen = $db->prepare($sqlAbsen);
    $stmtAbsen->execute([$bulan]);
    $absensi = $stmtAbsen->fetch(PDO::FETCH_OBJ);

    // 3. Hitung Total Alpha (hari_efektif - (hadir + izin + sakit + cuti))
    $sqlAlpha = "SELECT 
                    SUM(COALESCE(hari_efektif, 0) - (COALESCE(hadir, 0) + COALESCE(izin, 0) + COALESCE(sakit, 0) + COALESCE(cuti, 0))) as total_alpha,
                    SUM(CASE WHEN (COALESCE(hari_efektif, 0) - (COALESCE(hadir, 0) + COALESCE(izin, 0) + COALESCE(sakit, 0) + COALESCE(cuti, 0))) > 0 THEN 1 ELSE 0 END) as orang_alpha
                 FROM absensi 
                 WHERE DATE_FORMAT(date, '%Y-%m') = ?";
    $stmtAlpha = $db->prepare($sqlAlpha);
    $stmtAlpha->execute([$bulan]);
    $alpha = $stmtAlpha->fetch(PDO::FETCH_OBJ);

    // 4. Hitung Total Gaji (Kotor) Bulan Ini & 6 Bulan Terakhir
    $stmtSet = $db->query("SELECT * FROM pengaturan_absensi WHERE id = 1 LIMIT 1");
    $settings = $stmtSet->fetch(PDO::FETCH_ASSOC);
    $dendaHarian = $settings['denda_telat_harian'] ?? 5000;
    $dendaBlok   = $settings['denda_telat_per_blok'] ?? 20000;
    $menitBlok   = $settings['menit_per_blok'] ?? 15;
    $tarifLembur = $settings['tarif_lembur_per_jam'] ?? 20000;
    $dendaPerHariAlpha = 50000;

    $stmtPegawaiKontrak = $db->prepare("
        SELECT p.id_pegawai, p.nik,
               COALESCE(sp_k.status_ptkp, sp_p.status_ptkp) as status_ptkp, 
               COALESCE(pt_k.kategori_ter, pt_p.kategori_ter) as kategori_ter, 
               k.id_kontrak
        FROM pegawai p
        LEFT JOIN status_ptkp sp_p ON p.id_ptkp = sp_p.id_ptkp
        LEFT JOIN pph_ter pt_p ON sp_p.id_ter_reff = pt_p.id_ter
        JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
        LEFT JOIN status_ptkp sp_k ON k.id_ptkp = sp_k.id_ptkp
        LEFT JOIN pph_ter pt_k ON sp_k.id_ter_reff = pt_k.id_ter
        WHERE (k.tanggal_mulai IS NULL OR DATE_FORMAT(k.tanggal_mulai, '%Y-%m') <= ?) 
        AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR DATE_FORMAT(k.tanggal_berakhir, '%Y-%m') >= ?)
    ");

    $stmtAbs = $db->prepare("SELECT * FROM absensi WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
    $stmtKomp = $db->prepare("
        SELECT kp.nama_komponen, nk.nominal, kp.jenis_komponen
        FROM nominal_kontrak nk 
        JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen 
        WHERE nk.id_kontrak = ?
    ");
    $stmtPendLain = $db->prepare("SELECT nama_pendapatan, nominal, kategori FROM pendapatan_lain WHERE id_pegawai = ?");
    $stmtBpjs = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM riwayat_bpjs WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
    $stmtBpjsLast = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM riwayat_bpjs WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') < ? ORDER BY date DESC LIMIT 1");
    $stmtTer = $db->prepare("SELECT tarif_persen FROM pph_ter WHERE kategori_ter = ? AND ? BETWEEN penghasilan_min AND penghasilan_max LIMIT 1");

    function calculateMonthTotal($targetBulan, $db, $stmtPegawaiKontrak, $stmtAbs, $stmtKomp, $stmtPendLain, $stmtBpjs, $stmtBpjsLast, $stmtTer, $settings) {
        $stmtPegawaiKontrak->execute([$targetBulan, $targetBulan]);
        $pegawaiList = $stmtPegawaiKontrak->fetchAll(PDO::FETCH_ASSOC);

        $dendaHarian = $settings['denda_telat_harian'] ?? 5000;
        $dendaBlok   = $settings['denda_telat_per_blok'] ?? 20000;
        $menitBlok   = $settings['menit_per_blok'] ?? 15;
        $tarifLembur = $settings['tarif_lembur_per_jam'] ?? 20000;
        
        $totalBulanIni = 0;

        foreach ($pegawaiList as $pegawai) {
            $stmtAbs->execute([$pegawai['id_pegawai'], $targetBulan]);
            $absensi = $stmtAbs->fetch(PDO::FETCH_ASSOC);

            $hari_efektif_target = $absensi['hari_efektif'] ?? 25;
            $hadir = $absensi['hadir'] ?? 0;
            $sakit = $absensi['sakit'] ?? 0;
            $izin = $absensi['izin'] ?? 0;
            $cuti = $absensi['cuti'] ?? 0;
            $jam_lembur = $absensi['jam_lembur'] ?? 0;
            $hari_terlambat = $absensi['hari_terlambat'] ?? 0;
            $menit_terlambat = $absensi['menit_terlambat'] ?? 0;

            $alpha_days = max(0, $hari_efektif_target - ($hadir + $sakit + $izin + $cuti));

            $stmtKomp->execute([$pegawai['id_kontrak']]);
            $komponenRaw = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

            $stmtPendLain->execute([$pegawai['id_pegawai']]);
            $pendLainRaw = $stmtPendLain->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($pendLainRaw as $pl) {
                $jenisM = strtoupper($pl['kategori']);
                if ($pl['kategori'] == 'Non Alpha') $jenisM = 'NON_ALFA';
                if ($pl['kategori'] == 'Kehadiran') $jenisM = 'KEHADIRAN';
                if ($pl['kategori'] == 'Tetap') $jenisM = 'TETAP';
                
                $komponenRaw[] = [
                    'nama_komponen' => $pl['nama_pendapatan'],
                    'nominal' => $pl['nominal'],
                    'jenis_komponen' => $jenisM
                ];
            }

            $totalBruto = 0;
            $totalTetap = 0;
            foreach ($komponenRaw as $k) {
                $jns = strtoupper($k['jenis_komponen']);
                if ($jns != 'HARIAN' && $jns != 'KEHADIRAN' && $jns != 'NON_ALFA' && $jns != 'NON ALFA' && $jns != 'POTONGAN' && $jns != 'PENERIMAAN') {
                    $totalTetap += $k['nominal'];
                }
            }

            $tarifLemburDisnaker = $totalTetap > 0 ? ($totalTetap / 173) : $tarifLembur;
            $hasLemburComp = false;

            foreach ($komponenRaw as $k) {
                $nominal = $k['nominal'];
                $jenis = strtoupper($k['jenis_komponen']);
                
                if ($jenis == 'POTONGAN') {
                    continue;
                }
                
                if ($jenis == 'HARIAN' || $jenis == 'KEHADIRAN') {
                     if (stripos($k['nama_komponen'], 'lembur') !== false) {
                        $nominal = $tarifLemburDisnaker * $jam_lembur;
                        $hasLemburComp = true;
                    } else {
                        $nominal = $nominal * $hadir;
                    }
                } else if ($jenis == 'NON_ALFA' || $jenis == 'NON ALFA') {
                    if ($alpha_days > 0) {
                        $nominal = $hari_efektif_target > 0 ? ($hadir / $hari_efektif_target) * $nominal : 0;
                    }
                }
                $totalBruto += $nominal;
            }

            if (!$hasLemburComp && $jam_lembur > 0) {
                $totalBruto += ($tarifLemburDisnaker * $jam_lembur);
            }

            $dendaPerHariAlpha = $hari_efektif_target > 0 ? ($totalTetap / $hari_efektif_target) : 0;
            $potonganAlpha = $alpha_days * $dendaPerHariAlpha;
            
            if ($potonganAlpha > 0) {
                $totalBruto -= $potonganAlpha;
            }
            
            $potonganTerlambat = 0;
            if ($hari_terlambat > 0 || $menit_terlambat > 0) {
                $potonganTerlambat = ($hari_terlambat * $dendaHarian);
                if ($menit_terlambat > 0) {
                     $potonganTerlambat += ceil($menit_terlambat / $menitBlok) * $dendaBlok;
                }
            }

            $pph = 0;
            $kategori_ter = $pegawai['kategori_ter'] ?? 'A'; 
            if ($totalBruto > 0 && in_array($kategori_ter, ['A', 'B', 'C'])) {
                $stmtTer->execute([$kategori_ter, $totalBruto]);
                $tarif = $stmtTer->fetchColumn();
                if ($tarif !== false) {
                    $pph = $totalBruto * ($tarif / 100);
                }
            }

            $stmtBpjs->execute([$pegawai['id_pegawai'], $targetBulan]);
            $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
            if (!$bpjs) {
                $stmtBpjsLast->execute([$pegawai['id_pegawai'], $targetBulan]);
                $bpjs = $stmtBpjsLast->fetch(PDO::FETCH_ASSOC);
            }
            $bpjs_tk = $bpjs['bpjs_tk'] ?? 0;
            $bpjs_ks = $bpjs['bpjs_ks'] ?? 0;

            $totalPotongan = $potonganAlpha + $potonganTerlambat + $pph + $bpjs_tk + $bpjs_ks;
            $totalNetto = $totalBruto - $totalPotongan;
            $totalBulanIni += $totalBruto;
        }
        return $totalBulanIni;
    }

    $total_gaji_bulan_ini = calculateMonthTotal($bulan, $db, $stmtPegawaiKontrak, $stmtAbs, $stmtKomp, $stmtPendLain, $stmtBpjs, $stmtBpjsLast, $stmtTer, $settings);

    // Chart Data (6 Months)
    $chartData = [];
    $startMonth = new DateTime($bulan . '-01');
    $startMonth->modify('-5 months');
    
    for ($i = 0; $i < 6; $i++) {
        $m = $startMonth->format('Y-m');
        $label = $startMonth->format('M y');
        $val = calculateMonthTotal($m, $db, $stmtPegawaiKontrak, $stmtAbs, $stmtKomp, $stmtPendLain, $stmtBpjs, $stmtBpjsLast, $stmtTer, $settings);
        $chartData[] = ["name" => $label, "gaji" => $val];
        $startMonth->modify('+1 month');
    }

    // Kirim Data JSON
    echo json_encode([
        "status" => "success",
        "data" => [
            "total_pegawai" => (int)$total_pegawai,
            "hadir" => (int)($absensi->total_hadir ?? 0),
            "sakit" => (int)($absensi->total_sakit ?? 0),
            "izin"  => (int)($absensi->total_izin ?? 0),
            "cuti"  => (int)($absensi->total_cuti ?? 0),
            "orang_sakit" => (int)($absensi->orang_sakit ?? 0),
            "orang_izin"  => (int)($absensi->orang_izin ?? 0),
            "orang_cuti"  => (int)($absensi->orang_cuti ?? 0),
            "alpha" => (int)($alpha->total_alpha ?? 0),
            "orang_alpha" => (int)($alpha->orang_alpha ?? 0),
            "telat_hari" => (int)($absensi->total_hari_telat ?? 0),
            "telat_menit" => (int)($absensi->total_menit_telat ?? 0),
            "total_gaji" => $total_gaji_bulan_ini,
            "grafik_gaji" => $chartData
        ]
    ]);


} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>