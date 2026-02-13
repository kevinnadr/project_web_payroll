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
    
    // 1. Ambil Data Pegawai & Kontrak
    $stmt = $db->prepare("
        SELECT p.*, sp.status_ptkp, sp.kategori_ter, k.id_kontrak, k.jabatan, k.jenis_kontrak, k.tanggal_mulai
        FROM pegawai p
        LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
        LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
        WHERE p.id_pegawai = ?
    ");
    $stmt->execute([$id_pegawai]);
    $pegawai = $stmt->fetch(PDO::FETCH_ASSOC);

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

    $incomes = [];
    $totalBruto = 0;

    foreach ($komponenRaw as $k) {
        $nominal = $k['nominal'];
        
        // Handle Variable Components (HARIAN)
        if ($k['jenis_komponen'] == 'HARIAN') {
            if (stripos($k['nama_komponen'], 'lembur') !== false) {
                // Lembur based on jam_lembur column
                $calculated = $nominal * $jam_lembur;
                $incomes[] = ['nama' => $k['nama_komponen'] . " ($jam_lembur jam)", 'nominal' => $calculated];
                $nominal = $calculated;
            } else {
                // Uang Makan / Transport based on attendance (days)
                $calculated = $nominal * $hadir;
                $incomes[] = ['nama' => $k['nama_komponen'] . " ($hadir hari)", 'nominal' => $calculated];
                $nominal = $calculated;
            }
        } else {
            // Fixed Components (BULANAN)
            $incomes[] = ['nama' => $k['nama_komponen'], 'nominal' => $nominal];
        }
        
        $totalBruto += $nominal;
    }

    // 7. Format Date for Title
    $dateObj = DateTime::createFromFormat('Y-m', $bulan);
    $periodeLabel = $dateObj ? $dateObj->format('F Y') : date('F Y');

    // 3. Ambil Komponen Gaji (Nominal Kontrak)
    // ... (rest of the code is fine, just need to insert lateness logic before deduction array build)
    
    // Extract lateness
    $hari_terlambat = $absensi['hari_terlambat'] ?? 0;
    $menit_terlambat = $absensi['menit_terlambat'] ?? 0;

    // 4. Calculate Deductions (Alpha & Terlambat)
    $stmtAlpha = $db->query("SELECT nominal_denda FROM alpha LIMIT 1");
    $dendaPerHari = $stmtAlpha->fetchColumn() ?: 50000; // Default fallback
    $potonganAlpha = $alpha_days * $dendaPerHari;

    // Calculate Late Penalty (Same formula as Frontend)
    // Rule: 5.000 per day + 20.000 per 15 mins block
    $potonganTerlambat = 0;
    if ($hari_terlambat > 0) {
        $potonganTerlambat = ($hari_terlambat * 5000) + (ceil($menit_terlambat / 15) * 20000);
    }

    // 5. Calculate PPH TER
    $pph = 0;
    $ptkp_categories = ['A', 'B', 'C'];
    $kategori_ter = $pegawai['kategori_ter'] ?? 'A'; // Default A

    if ($totalBruto > 0 && in_array($kategori_ter, $ptkp_categories)) {
        // Find distinct matching range in pph_ter table
        $stmtTer = $db->prepare("
            SELECT tarif_persen 
            FROM pph_ter 
            WHERE kategori_ter = ? 
            AND ? BETWEEN penghasilan_min AND penghasilan_max
            LIMIT 1
        ");
        $stmtTer->execute([$kategori_ter, $totalBruto]);
        $tarif = $stmtTer->fetchColumn();
        
        if ($tarif) {
            $pph = $totalBruto * ($tarif / 100);
        }
    }

    // Fetch BPJS Data
    $stmtBpjs = $db->prepare("SELECT bpjs_tk, bpjs_ks FROM riwayat_bpjs WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
    $stmtBpjs->execute([$id_pegawai, $bulan]);
    $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
    $bpjs_tk = $bpjs['bpjs_tk'] ?? 0;
    $bpjs_ks = $bpjs['bpjs_ks'] ?? 0;

    $deductions = [];
    if ($potonganAlpha > 0) {
        $deductions[] = ['nama' => "Potongan Alpha ($alpha_days hari)", 'nominal' => $potonganAlpha];
    }
    if ($potonganTerlambat > 0) {
        $deductions[] = ['nama' => "Potongan Keterlambatan ($hari_terlambat hari, $menit_terlambat menit)", 'nominal' => $potonganTerlambat];
    }
    if ($bpjs_tk > 0) {
        $deductions[] = ['nama' => "BPJS Ketenagakerjaan", 'nominal' => $bpjs_tk];
    }
    if ($bpjs_ks > 0) {
        $deductions[] = ['nama' => "BPJS Kesehatan", 'nominal' => $bpjs_ks];
    }
    if ($pph > 0) {
        $deductions[] = ['nama' => "PPH 21 (TER $kategori_ter)", 'nominal' => $pph];
    }

    $totalPotongan = $potonganAlpha + $potonganTerlambat + $pph + $bpjs_tk + $bpjs_ks;
    $totalNetto = $totalBruto - $totalPotongan;

    // 6. Generate PDF
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetMargins(15, 15, 15);

    // Header
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 10, 'SLIP GAJI PEGAWAI', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(0, 5, 'Periode: ' . date('F Y'), 0, 1, 'C');
    $pdf->Ln(10);

    // Biodata
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(35, 6, 'NIK', 0, 0); $pdf->Cell(5, 6, ':', 0, 0); $pdf->Cell(0, 6, $pegawai['nik'], 0, 1);
    $pdf->Cell(35, 6, 'Nama', 0, 0); $pdf->Cell(5, 6, ':', 0, 0); $pdf->Cell(0, 6, $pegawai['nama_lengkap'], 0, 1);
    $pdf->Cell(35, 6, 'Jabatan', 0, 0); $pdf->Cell(5, 6, ':', 0, 0); $pdf->Cell(0, 6, $pegawai['jabatan'] ?? '-', 0, 1);
    $pdf->Cell(35, 6, 'Status', 0, 0); $pdf->Cell(5, 6, ':', 0, 0); $pdf->Cell(0, 6, ($pegawai['jenis_kontrak'] ?? '-') . ' / ' . ($pegawai['status_ptkp'] ?? '-'), 0, 1);
    $pdf->Cell(35, 6, 'Kehadiran', 0, 0); $pdf->Cell(5, 6, ':', 0, 0); 
    $pdf->Cell(0, 6, "Hadir: $hadir, Sakit: $sakit, Izin: $izin, Cuti: $cuti, Alpha: $alpha_days", 0, 1);

    $pdf->Ln(5);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(5);

    // Rincian Penghasilan
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(0, 8, 'PENDAPATAN', 0, 1);
    $pdf->SetFont('Arial', '', 10);

    foreach ($incomes as $inc) {
        $pdf->Cell(100, 6, $inc['nama'], 0, 0);
        $pdf->Cell(10, 6, 'Rp', 0, 0, 'R');
        $pdf->Cell(30, 6, number_format($inc['nominal'], 0, ',', '.'), 0, 1, 'R');
    }
    
    // Subtotal Pendapatan
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(100, 8, 'Total Pendapatan', 0, 0);
    $pdf->Cell(10, 8, 'Rp', 0, 0, 'R');
    $pdf->Cell(30, 8, number_format($totalBruto, 0, ',', '.'), 0, 1, 'R');
    
    $pdf->Ln(5);

    // Rincian Potongan
    if (!empty($deductions)) {
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->Cell(0, 8, 'POTONGAN', 0, 1);
        $pdf->SetFont('Arial', '', 10);

        foreach ($deductions as $ded) {
            $pdf->Cell(100, 6, $ded['nama'], 0, 0);
            $pdf->Cell(10, 6, 'Rp', 0, 0, 'R');
            $pdf->Cell(30, 6, number_format($ded['nominal'], 0, ',', '.'), 0, 1, 'R');
        }

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(100, 8, 'Total Potongan', 0, 0);
        $pdf->Cell(10, 8, 'Rp', 0, 0, 'R');
        $pdf->Cell(30, 8, number_format($totalPotongan, 0, ',', '.'), 0, 1, 'R');
    }

    // Total Netto
    $pdf->Ln(5);
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
    $pdf->Ln(2);
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(100, 10, 'TOTAL DITERIMA', 0, 0);
    $pdf->Cell(10, 10, 'Rp', 0, 0, 'R');
    $pdf->Cell(30, 10, number_format($totalNetto, 0, ',', '.'), 0, 1, 'R');

    // TTD
    $pdf->Ln(15);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(130, 5, '', 0, 0);
    $pdf->Cell(50, 5, 'Jakarta, ' . date('d F Y'), 0, 1, 'C');
    $pdf->Cell(130, 5, '', 0, 0);
    $pdf->Cell(50, 5, 'Diterima oleh,', 0, 1, 'C');
    $pdf->Ln(20);
    $pdf->Cell(130, 5, '', 0, 0);
    $pdf->Cell(50, 5, '(' . $pegawai['nama_lengkap'] . ')', 0, 1, 'C');

    $pdf->Output('I', 'Slip_Gaji_' . $pegawai['nik'] . '.pdf');

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>