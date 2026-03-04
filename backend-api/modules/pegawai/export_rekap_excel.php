<?php
// FILE: backend-api/modules/pegawai/export_rekap_excel.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

try {
    $bulan = $_GET['bulan'] ?? date('Y-m');
    
    // --- FETCH SETTINGS ---
    $stmtSet = $db->query("SELECT * FROM pengaturan_absensi WHERE id = 1 LIMIT 1");
    $settings = $stmtSet->fetch(PDO::FETCH_ASSOC);
    $dendaHarian = $settings['denda_telat_harian'] ?? 5000;
    $dendaBlok   = $settings['denda_telat_per_blok'] ?? 20000;
    $menitBlok   = $settings['menit_per_blok'] ?? 15;
    $tarifLembur = $settings['tarif_lembur_per_jam'] ?? 20000;

    // 1. Ambil semua pegawai yang punya kontrak aktif
    $sql = "SELECT p.*, 
                   COALESCE(sp_k.status_ptkp, sp_p.status_ptkp) as status_ptkp, 
                   COALESCE(pt_k.kategori_ter, pt_p.kategori_ter) as kategori_ter, 
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
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':bulan' => $bulan]);
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // FETCH MASTER COMPONENTS
    $stm = $db->query("SELECT nama_komponen as nama FROM master_komponen ORDER BY id ASC");
    $otherComponents = [];
    while($row = $stm->fetch(PDO::FETCH_ASSOC)) {
        $otherComponents[] = trim($row['nama']);
    }

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Rekap Gaji ' . $bulan);

    // --- SETUP HEADERS ---
    $colIndex = 1;

    // No.
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'No.');
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($colIndex) . '1:' . Coordinate::stringFromColumnIndex($colIndex) . '2');
    $cNo = $colIndex++;

    // Personel
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'Personel');
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($colIndex) . '1:' . Coordinate::stringFromColumnIndex($colIndex) . '2');
    $cPersonel = $colIndex++;

    // Dasar
    $cDasarStart = $colIndex;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'Dasar');
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Gaji Harian/Pokok'); $cGajiHarian = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Hari Kerja'); $cHariKerja = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Hari Efektif'); $cHariEfektif = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Gaji Efektif'); $cGajiEfektif = $colIndex++;
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($cDasarStart) . '1:' . Coordinate::stringFromColumnIndex($colIndex - 1) . '1');

    // Upah Kerja
    $cUpahStart = $colIndex;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'Upah Kerja (Rp)');
    
    // Dynamic Columns from master_komponen
    $cExtras = [];
    foreach ($otherComponents as $extName) {
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', $extName); 
        $cExtras[$extName] = $colIndex++;
    }

    $defaultThrCol = null;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Uang Lembur*'); $cLembur = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Total Upah'); $cTotalUpah = $colIndex++;
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($cUpahStart) . '1:' . Coordinate::stringFromColumnIndex($colIndex - 1) . '1');

    // PPh 21
    $cPphStart = $colIndex;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'PPh 21');
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Kat.TER'); $cKatTer = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Tarif TER PPh 21'); $cTarifTer = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'pot. Pph 21(Rp)'); $cPphNominal = $colIndex++;
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($cPphStart) . '1:' . Coordinate::stringFromColumnIndex($colIndex - 1) . '1');

    // BPJS
    $colBpjsStart = $colIndex;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'BPJS');
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Pot. TK(Rp)'); $cBpjsTk = $colIndex++;
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Pot. Ks(Rp)'); $cBpjsKs = $colIndex++;
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($colBpjsStart) . '1:' . Coordinate::stringFromColumnIndex($colIndex - 1) . '1');

    // Denda
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'Denda');
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '2', 'Terlambat(Rp)**'); 
    $cDenda = $colIndex++;

    // THP
    $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIndex) . '1', 'THP(Rp)');
    $sheet->mergeCells(Coordinate::stringFromColumnIndex($colIndex) . '1:' . Coordinate::stringFromColumnIndex($colIndex) . '2');
    $cThp = $colIndex++;
    $lastColStr = Coordinate::stringFromColumnIndex($colIndex - 1);

    // Header Styling
    $headerStyle = [
        'font' => ['bold' => true],
        'alignment' => [
            'horizontal' => Alignment::HORIZONTAL_CENTER,
            'vertical' => Alignment::VERTICAL_CENTER,
        ],
        'borders' => [
            'allBorders' => [
                'borderStyle' => Border::BORDER_THIN,
            ],
        ],
        'fill' => [
            'fillType' => Fill::FILL_SOLID,
            'color' => ['rgb' => 'D9E1F2']
        ]
    ];
    $sheet->getStyle('A1:' . $lastColStr . '2')->applyFromArray($headerStyle);

    // Freeze Pane
    $sheet->freezePane('C3');

    // --- DATA PREPARATION ---
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
    $stmtAlpha = $db->query("SELECT nominal_denda FROM alpha LIMIT 1");
    $dendaPerHari = $stmtAlpha->fetchColumn() ?: 50000; 
    $stmtTer = $db->prepare("
        SELECT tarif_persen 
        FROM pph_ter 
        WHERE kategori_ter = ? 
        AND ? BETWEEN penghasilan_min AND penghasilan_max
        LIMIT 1
    ");

    $rowNum = 3;
    $no = 1;

    foreach ($pegawaiList as $pegawai) {
        $stmtAbs->execute([$pegawai['id_pegawai'], $bulan]);
        $absensi = $stmtAbs->fetch(PDO::FETCH_ASSOC);

        $hari_efektif_target = $absensi['hari_efektif'] ?? $pegawai['hari_efektif'] ?? 25;
        $hadir = $absensi['hadir'] ?? 0;
        $jam_lembur = $absensi['jam_lembur'] ?? 0;
        $hari_terlambat = $absensi['hari_terlambat'] ?? 0;
        $menit_terlambat = $absensi['menit_terlambat'] ?? 0;
        
        $sakit = $absensi['sakit'] ?? 0;
        $izin = $absensi['izin'] ?? 0;
        $cuti = $absensi['cuti'] ?? 0;
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

        $totalTetap = 0;
        foreach ($komponenRaw as $k) {
            $jns = strtoupper($k['jenis_komponen']);
            if ($jns != 'HARIAN' && $jns != 'KEHADIRAN' && $jns != 'NON_ALFA' && $jns != 'NON ALFA' && $jns != 'POTONGAN' && $jns != 'PENERIMAAN') {
                $totalTetap += $k['nominal'];
            }
        }

        $tarifLemburDisnaker = $totalTetap > 0 ? ($totalTetap / 173) : $tarifLembur;

        // Variabel penampung Excel
        $vGajiHarian = 0;
        $vGajiEfektif = 0;
        $vUangLembur = 0;
        $vExtraVals = array_fill_keys($otherComponents, 0);
        $vPotonganLain = 0; // Var untuk potongan
        
        $totalBruto = 0;

        foreach ($komponenRaw as $k) {
            $nominal = $k['nominal'];
            $jenis = strtoupper($k['jenis_komponen']);
            $namaLower = strtolower(trim($k['nama_komponen']));
            $namaAsli = trim($k['nama_komponen']);
            
            $calculated = $nominal;

            $matchedExtra = null;
            // 1. Coba exact match
            foreach ($otherComponents as $extName) {
                if (strtolower($extName) === $namaLower) {
                    $matchedExtra = $extName;
                    break;
                }
            }
            // 2. Coba partial match yang kuat
            if (!$matchedExtra) {
                foreach ($otherComponents as $extName) {
                    if (strpos($namaLower, strtolower($extName)) !== false || strpos(strtolower($extName), $namaLower) !== false) {
                        // hindari match "Gaji Pokok" jika extName "pokok" kecuali memang itu yang dituju.
                        // namun jika sudah masuk sini, biarkan
                        if (strpos(strtolower($extName), 'lembur') === false && strpos($namaLower, 'lembur') === false) {
                            $matchedExtra = $extName;
                            break;
                        }
                    }
                }
            }

            if ($jenis == 'HARIAN' || $jenis == 'KEHADIRAN') {
                 if (strpos($namaLower, 'lembur') !== false) {
                    $calculated = $tarifLemburDisnaker * $jam_lembur;
                    $vUangLembur += $calculated;
                } else {
                    $calculated = $nominal * $hadir;
                    // Klasifikasi
                    if (strpos($namaLower, 'gaji') !== false || strpos($namaLower, 'pokok') !== false) {
                        $vGajiHarian += $nominal; 
                        $vGajiEfektif += $calculated;
                    } else if ($matchedExtra) {
                        $vExtraVals[$matchedExtra] += $calculated;
                    }
                }
            } else if ($jenis == 'NON_ALFA' || $jenis == 'NON ALFA') {
                if ($alpha_days > 0) {
                    $calculated = $hari_efektif_target > 0 ? ($hadir / $hari_efektif_target) * $nominal : 0;
                }
                
                if ($matchedExtra) {
                    $vExtraVals[$matchedExtra] += $calculated;
                }
            } else if ($jenis == 'POTONGAN') {
                if ($matchedExtra) {
                    $vExtraVals[$matchedExtra] += $calculated;
                }
                $vPotonganLain += $calculated;
                continue; // Jangan ditambahkan ke totalBruto
            } else {
                // TETAP / PENERIMAAN
                if (strpos($namaLower, 'gaji') !== false || strpos($namaLower, 'pokok') !== false) {
                    $vGajiHarian += 0; // Kalo tetep, harian 0
                    $vGajiEfektif += $calculated;
                } elseif (strpos($namaLower, 'lembur') !== false) {
                    $vUangLembur += $calculated;
                } else {
                    if ($matchedExtra) {
                        $vExtraVals[$matchedExtra] += $calculated;
                    } 
                }
            }
            $totalBruto += $calculated;
        }

        // --- AUTO LEMBUR CHECK ---
        if ($vUangLembur == 0 && $jam_lembur > 0) {
            $bayaranLembur = $tarifLemburDisnaker * $jam_lembur;
            $vUangLembur += $bayaranLembur;
            $totalBruto += $bayaranLembur;
        }

        // Potongan
        $dendaPerHariAlpha = $hari_efektif_target > 0 ? ($totalTetap / $hari_efektif_target) : 0;
        $potonganAlpha = $alpha_days * $dendaPerHariAlpha;
        
        $potonganTerlambat = 0;
        if ($hari_terlambat > 0 || $menit_terlambat > 0) {
            $potonganTerlambat = ($hari_terlambat * $dendaHarian);
            if ($menit_terlambat > 0) {
                 $potonganTerlambat += ceil($menit_terlambat / $menitBlok) * $dendaBlok;
            }
        }
        
        // Aplikasikan potongan alpha ke Gaji Efektif
        $vGajiEfektif -= $potonganAlpha;
        $totalBruto -= $potonganAlpha;
        
        // Denda hanya ambil dari Terlambat & Potongan lain
        $vDenda = $potonganTerlambat + $vPotonganLain;

        // PPH TER
        $pph = 0;
        $tarif = 0;
        $kategori_ter = $pegawai['kategori_ter'] ?? 'A'; 
        if ($totalBruto > 0 && in_array($kategori_ter, ['A', 'B', 'C'])) {
            $stmtTer->execute([$kategori_ter, $totalBruto]);
            $res = $stmtTer->fetchColumn();
            if ($res !== false) {
                $tarif = $res;
                $pph = $totalBruto * ($tarif / 100);
            }
        }

        // BPJS
        $stmtBpjs->execute([$pegawai['id_pegawai'], $bulan]);
        $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
        if (!$bpjs) {
            $stmtBpjsLast->execute([$pegawai['id_pegawai'], $bulan]);
            $bpjs = $stmtBpjsLast->fetch(PDO::FETCH_ASSOC);
        }
        $bpjs_tk = $bpjs['bpjs_tk'] ?? 0;
        $bpjs_ks = $bpjs['bpjs_ks'] ?? 0;

        $totalPotongan = $vDenda + $pph + $bpjs_tk + $bpjs_ks;
        $thp = $totalBruto - $totalPotongan;

        if ($vGajiHarian == 0 && $vGajiEfektif > 0 && $hari_efektif_target > 0) {
            $vGajiHarian = round($vGajiEfektif / $hari_efektif_target);
        }

        // --- TULIS KE EXCEL ---
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cNo) . $rowNum, $no++);
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cPersonel) . $rowNum, $pegawai['nama_lengkap']);
        
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cGajiHarian) . $rowNum, $vGajiHarian ?: '-');
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cHariKerja) . $rowNum, $hadir);
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cHariEfektif) . $rowNum, $hari_efektif_target);
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cGajiEfektif) . $rowNum, $vGajiEfektif ?: '-');

        $colsToFormat = [$cGajiHarian, $cGajiEfektif];

        foreach ($otherComponents as $extName) {
            $val = $vExtraVals[$extName] ?? 0;
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($cExtras[$extName]) . $rowNum, $val ?: '-');
            $colsToFormat[] = $cExtras[$extName];
        }

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cLembur) . $rowNum, $vUangLembur ?: '-');
        $colsToFormat[] = $cLembur;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cTotalUpah) . $rowNum, $totalBruto);
        $colsToFormat[] = $cTotalUpah;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cKatTer) . $rowNum, $kategori_ter);
        $sheet->setCellValueExplicit(Coordinate::stringFromColumnIndex($cTarifTer) . $rowNum, $tarif > 0 ? $tarif . '%' : '0.00%', DataType::TYPE_STRING);
        
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cPphNominal) . $rowNum, $pph ?: '-');
        $colsToFormat[] = $cPphNominal;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cBpjsTk) . $rowNum, $bpjs_tk ?: '-');
        $colsToFormat[] = $cBpjsTk;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cBpjsKs) . $rowNum, $bpjs_ks ?: '-');
        $colsToFormat[] = $cBpjsKs;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cDenda) . $rowNum, $vDenda ?: '-');
        $colsToFormat[] = $cDenda;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($cThp) . $rowNum, $thp);
        $colsToFormat[] = $cThp;

        // Format Angka ke Rupiah
        foreach ($colsToFormat as $cIdx) {
            $colStr = Coordinate::stringFromColumnIndex($cIdx);
            if (is_numeric($sheet->getCell($colStr . $rowNum)->getValue())) {
                $sheet->getStyle($colStr . $rowNum)->getNumberFormat()->setFormatCode('#,##0');
            }
        }

        $rowNum++;
    }

    // Auto fit column width (Sheet 1)
    for ($i = 1; $i < $colIndex; $i++) {
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
    }
    
    // Set border for data (Sheet 1)
    $styleArray1 = [
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
    ];
    if ($rowNum > 3) {
        $sheet->getStyle('A3:' . $lastColStr . ($rowNum - 1))->applyFromArray($styleArray1);
    }

    // ==========================================
    // SHEET 2: rekap b
    // ==========================================
    $spreadsheet->createSheet();
    $sheet2 = $spreadsheet->setActiveSheetIndex(1);
    $sheet2->setTitle('rekap b');

    // Headers Sheet 2
    $sheet2->setCellValue('A1', 'No.');
    $sheet2->setCellValue('B1', 'Personel');
    $sheet2->setCellValue('C1', 'Upah');
    $sheet2->setCellValue('D1', 'Potongan');
    $sheet2->setCellValue('E1', 'Denda');
    $sheet2->setCellValue('F1', 'THP');

    $headerStyle2 = [
        'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'color' => ['rgb' => '808080']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ];
    $sheet2->getStyle('A1:F1')->applyFromArray($headerStyle2);

    $rowNum2 = 2;
    $no2 = 1;
    
    $grandTotalUpah = 0;
    $grandTotalDenda = 0;

    // Loop data yang sama dari perhitungan Sheet 1
    // Karena kita sudah menghitung semuanya di atas, mari kita ulang kalkulasinya atau pakai logic sederhana.
    // Lebih gampang, kita loop $pegawaiList lagi untuk mengambil ulang variabel, 
    // NAMUN karena sudah di-loop di Sheet 1, untuk menghindari double-loop berat, kita bisa ambil value dari Cell di Sheet 1.

    for ($i = 3; $i < $rowNum; $i++) {
        $nama = $sheet->getCell(Coordinate::stringFromColumnIndex($cPersonel) . $i)->getValue();
        $upah = floatval(str_replace(',', '', $sheet->getCell(Coordinate::stringFromColumnIndex($cTotalUpah) . $i)->getCalculatedValue() ?? 0));
        
        // Potongan = (Pot TK) + (Pot Ks) + (Pot PPh 21)
        $potTK = is_numeric($sheet->getCell(Coordinate::stringFromColumnIndex($cBpjsTk) . $i)->getCalculatedValue()) ? $sheet->getCell(Coordinate::stringFromColumnIndex($cBpjsTk) . $i)->getCalculatedValue() : 0;
        $potKS = is_numeric($sheet->getCell(Coordinate::stringFromColumnIndex($cBpjsKs) . $i)->getCalculatedValue()) ? $sheet->getCell(Coordinate::stringFromColumnIndex($cBpjsKs) . $i)->getCalculatedValue() : 0;
        $potPPH = is_numeric($sheet->getCell(Coordinate::stringFromColumnIndex($cPphNominal) . $i)->getCalculatedValue()) ? $sheet->getCell(Coordinate::stringFromColumnIndex($cPphNominal) . $i)->getCalculatedValue() : 0;
        $totalPotongan = $potTK + $potKS + $potPPH;

        $dendaCellId = Coordinate::stringFromColumnIndex($cDenda) . $i;
        $denda = is_numeric($sheet->getCell($dendaCellId)->getCalculatedValue()) ? $sheet->getCell($dendaCellId)->getCalculatedValue() : 0;
        
        $thp = floatval(str_replace(',', '', $sheet->getCell(Coordinate::stringFromColumnIndex($cThp) . $i)->getCalculatedValue() ?? 0));

        $grandTotalUpah += $upah;
        $grandTotalDenda += $denda;

        $sheet2->setCellValue('A' . $rowNum2, $no2++);
        $sheet2->setCellValue('B' . $rowNum2, $nama);
        $sheet2->setCellValue('C' . $rowNum2, $upah ?: '-');
        $sheet2->setCellValue('D' . $rowNum2, $totalPotongan ?: '-');
        $sheet2->setCellValue('E' . $rowNum2, $denda ?: '-');
        $sheet2->setCellValue('F' . $rowNum2, $thp ?: '-');

        // Font warna merah untuk Potongan & Denda
        $sheet2->getStyle('D' . $rowNum2)->getFont()->getColor()->setRGB('FF0000');
        $sheet2->getStyle('E' . $rowNum2)->getFont()->getColor()->setRGB('FF0000');

        $rowNum2++;
    }

    // Baris Grand Total di Bawah
    $sheet2->mergeCells('A' . $rowNum2 . ':B' . $rowNum2);
    $sheet2->setCellValue('C' . $rowNum2, $grandTotalUpah);
    $sheet2->setCellValue('D' . $rowNum2, 'Uang Denda*');
    $sheet2->setCellValue('E' . $rowNum2, $grandTotalDenda);

    $sheet2->getStyle('C' . $rowNum2 . ':E' . $rowNum2)->getFont()->setBold(true);
    $sheet2->getStyle('E' . $rowNum2)->getFont()->getColor()->setRGB('FF0000');

    // Format Number Style Sheet 2
    $sheet2->getStyle('C2:C' . $rowNum2)->getNumberFormat()->setFormatCode('#,##0');
    $sheet2->getStyle('D2:D' . ($rowNum2 - 1))->getNumberFormat()->setFormatCode('#,##0');
    $sheet2->getStyle('E2:E' . $rowNum2)->getNumberFormat()->setFormatCode('#,##0');
    $sheet2->getStyle('F2:F' . ($rowNum2 - 1))->getNumberFormat()->setFormatCode('#,##0');

    // Terapkan Border Sheet 2
    $styleArray2 = [
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ];
    $sheet2->getStyle('A1:F' . ($rowNum2 - 1))->applyFromArray($styleArray2);
    // Border khusus baris Grand Total
    $sheet2->getStyle('C'.$rowNum2.':E'.$rowNum2)->applyFromArray($styleArray2);

    // Auto FIT Sheet 2
    foreach (range('A', 'F') as $colId) {
        $sheet2->getColumnDimension($colId)->setAutoSize(true);
    }

    // Kembalikan Active Sheet ke Sheet 1 (Rekap Gaji)
    $spreadsheet->setActiveSheetIndex(0);

    // Output
    ob_end_clean();
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment;filename="Rekap_Gaji_'.$bulan.'.xlsx"');
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo "Gagal export excel: " . $e->getMessage();
}
?>
