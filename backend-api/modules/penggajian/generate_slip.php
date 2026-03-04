<?php
// FILE: backend-api/modules/penggajian/generate_slip.php
// Script untuk generate gaji secara bulk dan simpan hasilnya ke tabel slip_gaji & nominal_slip

require_once '../../config/database.php';
require_once '../../config/cors.php';

try {
    $data = json_decode(file_get_contents("php://input"));
    $bulan = $data->bulan ?? date('Y-m');

    $db->beginTransaction();

    // Hapus data bulan ini untuk mencegah duplikat saat di-generate ulang
    // Data rincian di nominal_slip akan otomatis terhapus jika ada ON DELETE CASCADE
    // Namun kita akan hapus manual via query untuk memastikan
    $stmtDeleteRinci = $db->prepare("DELETE ns FROM nominal_slip ns JOIN slip_gaji sg ON ns.id_slip = sg.id_slip WHERE sg.periode = ?");
    $stmtDeleteRinci->execute([$bulan]);
    
    $stmtDeleteSlip = $db->prepare("DELETE FROM slip_gaji WHERE periode = ?");
    $stmtDeleteSlip->execute([$bulan]);

    // --- FETCH SETTINGS ---
    $stmtSet = $db->query("SELECT * FROM pengaturan_absensi WHERE id = 1 LIMIT 1");
    $settings = $stmtSet->fetch(PDO::FETCH_ASSOC);
    $dendaHarian = $settings['denda_telat_harian'] ?? 5000;
    $dendaBlok   = $settings['denda_telat_per_blok'] ?? 20000;
    $menitBlok   = $settings['menit_per_blok'] ?? 15;
    $tarifLembur = $settings['tarif_lembur_per_jam'] ?? 20000;

    // Ambil data denda alpha
    $stmtAlpha = $db->query("SELECT nominal_denda FROM alpha LIMIT 1");
    $dendaPerHari = $stmtAlpha->fetchColumn() ?: 50000; 

    // 1. Ambil semua pegawai yang punya kontrak aktif
    $sqlPegawai = "SELECT p.*, 
                   COALESCE(sp_k.status_ptkp, sp_p.status_ptkp) as status_ptkp, 
                   COALESCE(pt_k.kategori_ter, pt_p.kategori_ter) as kategori_ter,
                   COALESCE(pt_k.id_ter, pt_p.id_ter) as id_ter,
                   k.id_kontrak, k.jabatan, k.jenis_kontrak, k.tanggal_mulai
            FROM pegawai p
            LEFT JOIN status_ptkp sp_p ON p.id_ptkp = sp_p.id_ptkp
            LEFT JOIN pph_ter pt_p ON sp_p.id_ter_reff = pt_p.id_ter
            JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            LEFT JOIN status_ptkp sp_k ON k.id_ptkp = sp_k.id_ptkp
            LEFT JOIN pph_ter pt_k ON sp_k.id_ter_reff = pt_k.id_ter
            WHERE (k.tanggal_mulai IS NULL OR DATE_FORMAT(k.tanggal_mulai, '%Y-%m') <= :bulan) 
            AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR DATE_FORMAT(k.tanggal_berakhir, '%Y-%m') >= :bulan)
            ORDER BY p.nik ASC";
    
    $stmt = $db->prepare($sqlPegawai);
    $stmt->execute([':bulan' => $bulan]);
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($pegawaiList) === 0) {
        $db->rollBack();
        echo json_encode(["status" => "error", "message" => "Tidak ada data pegawai aktif pada periode ini."]);
        exit;
    }

    // Statements Helper
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
    $stmtTer = $db->prepare("
        SELECT tarif_persen 
        FROM pph_ter 
        WHERE kategori_ter = ? 
        AND ? BETWEEN penghasilan_min AND penghasilan_max
        LIMIT 1
    ");

    $stmtInsertSlip = $db->prepare("
        INSERT INTO slip_gaji (id_pegawai, id_kontrak, id_ter_reff, date, periode, total_bruto, total_potongan, pph21, bpjs_tk, bpjs_ks, denda, thp)
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmtInsertNominal = $db->prepare("
        INSERT INTO nominal_slip (id_slip, nama_komponen, jenis_komponen, jenis_komponen_tipe, nominal)
        VALUES (?, ?, ?, ?, ?)
    ");

    $generatedCount = 0;

    foreach ($pegawaiList as $pegawai) {
        $stmtAbs->execute([$pegawai['id_pegawai'], $bulan]);
        $absensi = $stmtAbs->fetch(PDO::FETCH_ASSOC);

        $hari_efektif_target = $absensi['hari_efektif'] ?? $pegawai['hari_efektif'] ?? 25;
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

        $incomes = [];
        $deductions = []; // Custom deductions dari pendapatan lain
        $totalBruto = 0;

        // Pre-calc Total Tetap
        $totalTetap = 0;
        foreach ($komponenRaw as $k) {
            $jns = strtoupper($k['jenis_komponen']);
            if ($jns != 'HARIAN' && $jns != 'KEHADIRAN' && $jns != 'NON_ALFA' && $jns != 'NON ALFA' && $jns != 'POTONGAN' && $jns != 'PENERIMAAN') {
                $totalTetap += $k['nominal'];
            }
        }
        $tarifLemburDisnaker = $totalTetap > 0 ? ($totalTetap / 173) : $tarifLembur;

        // Process logic
        foreach ($komponenRaw as $k) {
            $nominal = $k['nominal'];
            $jenis = strtoupper($k['jenis_komponen']);
            
            if ($jenis == 'HARIAN' || $jenis == 'KEHADIRAN') {
                 if (stripos($k['nama_komponen'], 'lembur') !== false) {
                    $calculated = $tarifLemburDisnaker * $jam_lembur;
                    $incomes[] = ['nama' => $k['nama_komponen'] . " ($jam_lembur jam)", 'jenis' => $jenis, 'tipe_grup' => 'VARIABEL', 'nominal' => $calculated];
                    $nominal = $calculated;
                } else {
                    $calculated = $nominal * $hadir;
                    $incomes[] = ['nama' => $k['nama_komponen'] . " ($hadir hari)", 'jenis' => $jenis, 'tipe_grup' => 'VARIABEL', 'nominal' => $calculated];
                    $nominal = $calculated;
                }
            } 
            else if ($jenis == 'NON_ALFA' || $jenis == 'NON ALFA') {
                if ($alpha_days > 0) {
                    $proporsional = $hari_efektif_target > 0 ? ($hadir / $hari_efektif_target) * $nominal : 0;
                    $incomes[] = ['nama' => $k['nama_komponen'] . " (Proporsional: $hadir/$hari_efektif_target hari)", 'jenis' => $jenis, 'tipe_grup' => 'VARIABEL', 'nominal' => $proporsional];
                    $nominal = $proporsional;
                } else {
                    $incomes[] = ['nama' => $k['nama_komponen'] . " (Full)", 'jenis' => $jenis, 'tipe_grup' => 'VARIABEL', 'nominal' => $nominal];
                }
            }
            else if ($jenis == 'POTONGAN') {
                $deductions[] = ['nama' => $k['nama_komponen'], 'jenis' => $jenis, 'tipe_grup' => 'POTONGAN_LAIN', 'nominal' => $nominal];
                continue;
            }
            else {
                // TETAP / PENERIMAAN
                // Check if it's strictly Tetap or simply Penerimaan Tambahan
                $tGroup = (stripos($k['nama_komponen'], 'gaji') !== false || stripos($k['nama_komponen'], 'tetap') !== false) ? 'TETAP' : 'VARIABEL';
                $incomes[] = ['nama' => $k['nama_komponen'], 'jenis' => $jenis, 'tipe_grup' => $tGroup, 'nominal' => $nominal];
            }
            $totalBruto += $nominal;
        }

        // --- LEMBUR AUTO ---
        $hasLembur = false;
        foreach ($incomes as $inc) if (stripos($inc['nama'], 'lembur') !== false) $hasLembur = true;
        if (!$hasLembur && $jam_lembur > 0) {
            $bayaranLembur = $tarifLemburDisnaker * $jam_lembur;
            $incomes[] = ['nama' => "Lembur ($jam_lembur jam)", 'jenis' => 'LEMBUR', 'tipe_grup' => 'VARIABEL', 'nominal' => $bayaranLembur];
            $totalBruto += $bayaranLembur;
        }

        // Sort Incomes: Put type 'TETAP' (like Uang Transportasi) before 'VARIABEL'
        usort($incomes, function($a, $b) {
            // Push TETAP up, others down
            $aIsTetap = (isset($a['jenis']) && $a['jenis'] === 'TETAP') ? 0 : 1;
            $bIsTetap = (isset($b['jenis']) && $b['jenis'] === 'TETAP') ? 0 : 1;
            return $aIsTetap <=> $bIsTetap;
        });

        // --- DENDA ALPHA & TELAT ---
        $dendaPerHariAlpha = $hari_efektif_target > 0 ? ($totalTetap / $hari_efektif_target) : 0;
        $potonganAlpha = $alpha_days * $dendaPerHariAlpha;
        
        if ($potonganAlpha > 0) {
            $incomes[] = ['nama' => "Potongan Alpha ($alpha_days hari)", 'jenis' => 'POTONGAN', 'tipe_grup' => 'TETAP', 'nominal' => -$potonganAlpha];
            $totalBruto -= $potonganAlpha;
        }

        $potonganTerlambat = 0;
        if ($hari_terlambat > 0 || $menit_terlambat > 0) {
            $potonganTerlambat = ($hari_terlambat * $dendaHarian);
            if ($menit_terlambat > 0) $potonganTerlambat += ceil($menit_terlambat / $menitBlok) * $dendaBlok;
        }

        // PPH & BPJS
        $pph = 0; $tarif = 0;
        $kategori_ter = $pegawai['kategori_ter'] ?? 'A'; 
        if ($totalBruto > 0 && in_array($kategori_ter, ['A', 'B', 'C'])) {
            $stmtTer->execute([$kategori_ter, $totalBruto]);
            $res = $stmtTer->fetchColumn();
            if ($res !== false) {
                $tarif = $res;
                $pph = $totalBruto * ($tarif / 100);
            }
        }

        $stmtBpjs->execute([$pegawai['id_pegawai'], $bulan]);
        $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
        if (!$bpjs) {
            $stmtBpjsLast->execute([$pegawai['id_pegawai'], $bulan]);
            $bpjs = $stmtBpjsLast->fetch(PDO::FETCH_ASSOC);
        }
        $bpjs_tk = $bpjs['bpjs_tk'] ?? 0;
        $bpjs_ks = $bpjs['bpjs_ks'] ?? 0;

        $totalDenda = $potonganTerlambat;
        
        // Count Potongan Lainnya
        $potonganLainTotal = 0;
        foreach ($deductions as $d) $potonganLainTotal += $d['nominal'];

        $totalSemuaPotongan = $totalDenda + $potonganLainTotal + $pph + $bpjs_tk + $bpjs_ks;
        $thp = $totalBruto - $totalSemuaPotongan;

        // --- INSERT INTO SLIP_GAJI ---
        $stmtInsertSlip->execute([
            $pegawai['id_pegawai'],
            $pegawai['id_kontrak'],
            $pegawai['id_ter'],
            $bulan,            // periode
            $totalBruto,       // total kotor
            $totalSemuaPotongan, // total potongan
            $pph,
            $bpjs_tk,
            $bpjs_ks,
            $totalDenda,
            $thp
        ]);
        $idSlip = $db->lastInsertId();

        // --- INSERT RINCIAN (NOMINAL_SLIP) ---
        foreach($incomes as $inc) {
            $stmtInsertNominal->execute([$idSlip, $inc['nama'], $inc['jenis'], $inc['tipe_grup'], $inc['nominal']]);
        }
        foreach($deductions as $ded) {
            $stmtInsertNominal->execute([$idSlip, $ded['nama'], $ded['jenis'], $ded['tipe_grup'], $ded['nominal']]);
        }
        
        // We will insert 'Denda' so it shows up in dynamic rincian.
        if ($potonganTerlambat > 0) {
            $stmtInsertNominal->execute([$idSlip, "Potongan Telat", 'TELAT', 'POTONGAN_LAIN', $potonganTerlambat]);
        }

        $generatedCount++;
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Berhasil memproses & mengunci gaji $generatedCount pegawai pada periode $bulan."]);

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
