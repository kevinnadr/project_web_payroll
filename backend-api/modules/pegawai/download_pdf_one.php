<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

$id_pegawai = $_GET['id'] ?? null;
if (!$id_pegawai) die("ID Pegawai tidak ditemukan.");

 try {
    $bulan = $_GET['bulan'] ?? date('Y-m'); // Default current month if not specified
    
    // --- FETCH SETTINGS ---
    $stmtSet = $db->query("SELECT * FROM pengaturan_absensi WHERE id = 1 LIMIT 1");
    $settings = $stmtSet->fetch(PDO::FETCH_ASSOC);
    
    // Defaults if not found
    $dendaHarian = $settings['denda_telat_harian'] ?? 5000;
    $dendaBlok   = $settings['denda_telat_per_blok'] ?? 20000;
    $menitBlok   = $settings['menit_per_blok'] ?? 15;
    $tarifLembur = $settings['tarif_lembur_per_jam'] ?? 20000;
    
    // 1. Ambil Data Pegawai & Kontrak
    // 1. Ambil Data Pegawai (Tanpa Join Kontrak dulu)
    $stmt = $db->prepare("
        SELECT p.*, sp.status_ptkp, pt.kategori_ter
        FROM pegawai p
        LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
        LEFT JOIN pph_ter pt ON sp.id_ter_reff = pt.id_ter
        WHERE p.id_pegawai = ?
    ");
    $stmt->execute([$id_pegawai]);
    $pegawai = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$pegawai) die("Pegawai tidak ditemukan.");
    $pegawai['id_kontrak'] = null; // Default

    // 2. Cari Kontrak yang Valid pada Bulan Tersebut
    $startMonth = $bulan . '-01';
    $endMonth   = date('Y-m-t', strtotime($startMonth));
    
    $stmtK = $db->prepare("
        SELECT * FROM kontrak_kerja 
        WHERE id_pegawai = ? 
        AND tanggal_mulai <= ? 
        AND (tanggal_berakhir >= ? OR tanggal_berakhir IS NULL OR tanggal_berakhir = '0000-00-00')
        ORDER BY tanggal_mulai DESC 
        LIMIT 1
    ");
    $stmtK->execute([$id_pegawai, $endMonth, $startMonth]);
    $contract = $stmtK->fetch(PDO::FETCH_ASSOC);
    
    if ($contract) {
        $pegawai = array_merge($pegawai, $contract); // Merge contract info (jabatan, jenis_kontrak, etc)
    } else {
        // Fallback or explicit null if no contract found for this period
        // Just continue, components will be empty
    }

    if (!$pegawai) die("Pegawai tidak ditemukan.");

    // 2. Ambil Data Absensi Bulan Ini
    $stmtAbs = $db->prepare("SELECT * FROM absensi WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
    $stmtAbs->execute([$id_pegawai, $bulan]);
    $absensi = $stmtAbs->fetch(PDO::FETCH_ASSOC);

    // Default values if no attendance record
    $hari_efektif_target = $absensi['hari_efektif'] ?? $pegawai['hari_efektif'] ?? 25;
    $hadir = $absensi['hadir'] ?? 0;
    $sakit = $absensi['sakit'] ?? 0;
    $izin = $absensi['izin'] ?? 0;
    $cuti = $absensi['cuti'] ?? 0;
    $jam_lembur = $absensi['jam_lembur'] ?? 0;
    
    // Calculate Alpha: Hari Efektif - (Hadir + Sakit + Izin + Cuti)
    // Ensure alpha is not negative
    $alpha_days = max(0, $hari_efektif_target - ($hadir + $sakit + $izin + $cuti));

    // 3. Ambil Komponen Gaji (Nominal Kontrak)
    $stmtKomp = $db->prepare("
        SELECT kp.nama_komponen, nk.nominal, kp.jenis_komponen
        FROM nominal_kontrak nk 
        JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen 
        WHERE nk.id_kontrak = ?
    ");
    $stmtKomp->execute([$pegawai['id_kontrak']]);
    $komponenRaw = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

    // --- GROUPING DATA ---
    $fixedIncomes = [];
    $variableIncomes = [];
    $statutoryDeductions = [];
    $penaltyDeductions = [];

    $subtotalFixed = 0;
    $subtotalVariable = 0;
    $subtotalStatutory = 0;
    $subtotalPenalty = 0;

    // 1. Process Incomes
    foreach ($komponenRaw as $k) {
        $nominal = $k['nominal'];
        $nama = $k['nama_komponen'];
        $jenis = strtoupper($k['jenis_komponen']);
        
        $item = [];
        
        // Logic Calculation
        if ($jenis == 'HARIAN' || $jenis == 'KEHADIRAN') {
            if (stripos($nama, 'lembur') !== false) {
                $val = $nominal * $jam_lembur;
                $item = ['nama' => "$nama ($jam_lembur jam)", 'nominal' => $val];
            } else {
                $val = $nominal * $hadir;
                $item = ['nama' => "$nama ($hadir hari)", 'nominal' => $val];
            }
        } 
        else if ($jenis == 'NON_ALFA' || $jenis == 'NON ALFA') {
            if ($alpha_days > 0) {
                $item = ['nama' => "$nama (Hangus krn $alpha_days Alpha)", 'nominal' => 0];
            } else {
                $item = ['nama' => "$nama (Full)", 'nominal' => $nominal];
            }
        }
        else {
            $item = ['nama' => $nama, 'nominal' => $nominal];
        }

        // Categorize Fixed vs Variable
        // Fixed: Gaji Pokok, Tunjangan Tetap
        if (stripos($nama, 'Gaji Pokok') !== false || stripos($nama, 'Tunjangan Tetap') !== false) {
            $fixedIncomes[] = $item;
            $subtotalFixed += $item['nominal'];
        } else {
            $variableIncomes[] = $item;
            $subtotalVariable += $item['nominal'];
        }
    }

    // Auto Lembur Check (if not in DB components)
    $hasLembur = false;
    foreach ($variableIncomes as $inc) {
        if (stripos($inc['nama'], 'lembur') !== false) $hasLembur = true;
    }
    if (!$hasLembur && $jam_lembur > 0) {
        $bayaranLembur = $tarifLembur * $jam_lembur;
        $variableIncomes[] = ['nama' => "Lembur ($jam_lembur jam)", 'nominal' => $bayaranLembur];
        $subtotalVariable += $bayaranLembur;
    }

    // 2. Process Deductions
    // Penalty
    $stmtAlpha = $db->query("SELECT nominal_denda FROM alpha LIMIT 1");
    $dendaPerHari = $stmtAlpha->fetchColumn() ?: 50000;
    $potonganAlpha = $alpha_days * $dendaPerHari;

    // Extract lateness
    $hari_terlambat = $absensi['hari_terlambat'] ?? 0;
    $menit_terlambat = $absensi['menit_terlambat'] ?? 0;

    $potonganTerlambat = 0;
    if ($hari_terlambat > 0 || $menit_terlambat > 0) {
        $potonganTerlambat = ($hari_terlambat * $dendaHarian);
        if ($menit_terlambat > 0) {
            $potonganTerlambat += ceil($menit_terlambat / $menitBlok) * $dendaBlok;
        }
    }

    if ($potonganAlpha > 0) {
        $penaltyDeductions[] = ['nama' => "Potongan Alpha ($alpha_days hari)", 'nominal' => $potonganAlpha];
        $subtotalPenalty += $potonganAlpha;
    }
    if ($potonganTerlambat > 0) {
        $penaltyDeductions[] = ['nama' => "Potongan Keterlambatan ($hari_terlambat hari, $menit_terlambat menit)", 'nominal' => $potonganTerlambat];
        $subtotalPenalty += $potonganTerlambat;
    }

    // Statutory (Tax & Insurance)
    $totalBruto = $subtotalFixed + $subtotalVariable;
    
    // PPH
    $pph = 0;
    $ptkp_categories = ['A', 'B', 'C'];
    $kategori_ter = $pegawai['kategori_ter'] ?? 'A'; 
    if ($totalBruto > 0 && in_array($kategori_ter, $ptkp_categories)) {
        $stmtTer = $db->prepare("SELECT tarif_persen FROM pph_ter WHERE kategori_ter = ? AND ? BETWEEN penghasilan_min AND penghasilan_max LIMIT 1");
        $stmtTer->execute([$kategori_ter, $totalBruto]);
        $tarif = $stmtTer->fetchColumn();
        if ($tarif) $pph = $totalBruto * ($tarif / 100);
    }

    // BPJS
    $stmtBpjs = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM data_bpjs WHERE id_pegawai = ? AND periode = ?");
    $stmtBpjs->execute([$id_pegawai, $bulan]);
    $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
    if (!$bpjs) {
        $stmtLast = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM data_bpjs WHERE id_pegawai = ? AND periode < ? ORDER BY periode DESC LIMIT 1");
        $stmtLast->execute([$id_pegawai, $bulan]);
        $bpjs = $stmtLast->fetch(PDO::FETCH_ASSOC);
    }
    $bpjs_tk = $bpjs['bpjs_tk'] ?? 0;
    $bpjs_ks = $bpjs['bpjs_ks'] ?? 0;

    if ($bpjs_tk > 0) {
        $statutoryDeductions[] = ['nama' => "BPJS Ketenagakerjaan", 'nominal' => $bpjs_tk];
        $subtotalStatutory += $bpjs_tk;
    }
    if ($bpjs_ks > 0) {
        $statutoryDeductions[] = ['nama' => "BPJS Kesehatan", 'nominal' => $bpjs_ks];
        $subtotalStatutory += $bpjs_ks;
    }
    if ($pph > 0) {
        $statutoryDeductions[] = ['nama' => "PPH 21 (TER $kategori_ter)", 'nominal' => $pph];
        $subtotalStatutory += $pph;
    }

    $totalNetto = $totalBruto - $subtotalStatutory - $subtotalPenalty;

    // --- GENERATE PDF ---
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetMargins(15, 10, 15); // Reduced Top Margin

    // Header
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 6, strtoupper('Slip Gaji Pegawai'), 0, 1, 'C'); // Reduced height
    $pdf->SetFont('Arial', 'I', 9);
    $pdf->Cell(0, 5, 'Periode: ' . date('F Y', strtotime($bulan)), 0, 1, 'C');
    $pdf->Ln(2);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(4);

    // Biodata
    $pdf->SetFont('Arial', '', 9); // Smaller font
    $pdf->Cell(30, 5, 'NIK', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(60, 5, $pegawai['nik'], 0, 0);
    $pdf->Cell(30, 5, 'Jabatan', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(0, 5, $pegawai['jabatan'] ?? '-', 0, 1);
    
    $pdf->Cell(30, 5, 'Nama', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(60, 5, $pegawai['nama_lengkap'], 0, 0);
    $pdf->Cell(30, 5, 'Status', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(0, 5, ($pegawai['jenis_kontrak'] ?? '-') . ' / ' . ($pegawai['status_ptkp'] ?? '-'), 0, 1);
    
    $pdf->Ln(1);
    $pdf->Cell(30, 5, 'Kehadiran', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); 
    $pdf->Cell(0, 5, "Hadir: $hadir   Sakit: $sakit   Izin: $izin   Cuti: $cuti   Alpha: $alpha_days", 0, 1);
    
    $pdf->Ln(4);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(4);

    // --- CONTENT RENDERER ---
    $renderSection = function($title, $items, $subtotal, $pdf, $isDeduction = false) {
        if (empty($items) && $title !== 'GAJI POKOK & TUNJANGAN TETAP') return;
        
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetFillColor(240, 248, 255); 
        $pdf->Cell(0, 7, $title, 0, 1, 'L', true); // Reduced height
        $pdf->SetFont('Arial', '', 9);

        foreach ($items as $itm) {
            $pdf->Cell(130, 5, "  " . $itm['nama'], 0, 0); // Reduced height
            $pdf->Cell(10, 5, 'Rp', 0, 0, 'R');
            if ($isDeduction) $pdf->SetTextColor(180, 0, 0);
            $pdf->Cell(30, 5, number_format($itm['nominal'], 0, ',', '.'), 0, 1, 'R');
            $pdf->SetTextColor(0, 0, 0);
        }
        
        // Subtotal Line
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(130, 6, "  Total " . ucwords(strtolower($title)), 0, 0);
        $pdf->Cell(10, 6, 'Rp', 0, 0, 'R');
        if ($isDeduction) $pdf->SetTextColor(180, 0, 0);
        $pdf->Cell(30, 6, number_format($subtotal, 0, ',', '.'), 0, 1, 'R');
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Ln(2); 
    };

    // 1. GAJI & TUNJANGAN TETAP
    $renderSection("GAJI POKOK & TUNJANGAN TETAP", $fixedIncomes, $subtotalFixed, $pdf);

    // 2. KOMPONEN PENGHASILAN LAIN
    if (!empty($variableIncomes)) {
        $renderSection("KOMPONEN PENGHASILAN LAIN", $variableIncomes, $subtotalVariable, $pdf);
    }

    // TOTAL INCOME SUMMARY
    $pdf->Ln(1);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(130, 7, "TOTAL PENDAPATAN KOTOR (GROSS)", 'T', 0);
    $pdf->Cell(10, 7, 'Rp', 'T', 0, 'R');
    $pdf->Cell(30, 7, number_format($totalBruto, 0, ',', '.'), 'T', 1, 'R');
    $pdf->Ln(4);

    // 3. POTONGAN WAJIB (BPJS & PPH)
    if (!empty($statutoryDeductions)) {
        $renderSection("POTONGAN WAJIB (BPJS & PPH 21)", $statutoryDeductions, $subtotalStatutory, $pdf, true);
    }

    // 4. POTONGAN LAINNYA (DENDA/SANKSI)
    if (!empty($penaltyDeductions)) {
        $renderSection("POTONGAN KEHADIRAN & DENDA", $penaltyDeductions, $subtotalPenalty, $pdf, true);
    }

    // FINAL TOTAL
    $pdf->Ln(4);
    $pdf->SetFillColor(220, 255, 220); 
    $pdf->SetFont('Arial', 'B', 11);
    
    // Check space remaining
    if ($pdf->GetY() > 240) $pdf->AddPage(); // Prevent break inside total box if near bottom

    // Draw box for Total
    $y = $pdf->GetY();
    $pdf->Rect(15, $y, 180, 10, 'F');
    $pdf->SetXY(15, $y + 1);
    
    $pdf->Cell(130, 8, "  TOTAL GAJI BERSIH (NETTO)", 0, 0);
    $pdf->Cell(10, 8, 'Rp', 0, 0, 'R');
    $pdf->Cell(30, 8, number_format($totalNetto, 0, ',', '.'), 0, 1, 'R');

    // Footer Signature Block
    $pdf->Ln(10);
    
    // Check if enough space remains, else new page
    if ($pdf->GetY() > 240) $pdf->AddPage();

    $ySign = $pdf->GetY();
    
    // Left Side: Company Approval
    $pdf->SetXY(20, $ySign);
    $pdf->Cell(60, 5, 'Disetujui Oleh,', 0, 1, 'C');
    $pdf->Ln(20); // Space for signature
    $pdf->SetX(20);
    $pdf->Cell(60, 5, '( HRD / Finance )', 0, 0, 'C');

    // Right Side: Employee Acknowledgement
    $pdf->SetXY(120, $ySign);
    $pdf->Cell(60, 5, 'Jakarta, ' . date('d F Y', strtotime($endMonth)), 0, 1, 'C'); // Date relative to slip period end or current date? Usually current date of print.
    $pdf->SetXY(120, $ySign + 5);
    $pdf->Cell(60, 5, 'Diterima oleh,', 0, 1, 'C');
    $pdf->Ln(15); // Space for signature
    $pdf->SetXY(120, $pdf->GetY());
    $pdf->Cell(60, 5, '(' . $pegawai['nama_lengkap'] . ')', 0, 0, 'C');

    $pdf->Output('I', 'Slip_Gaji_' . $pegawai['nik'] . '.pdf');

 } catch (Exception $e) {
     echo "Error: " . $e->getMessage();
 }
 ?>