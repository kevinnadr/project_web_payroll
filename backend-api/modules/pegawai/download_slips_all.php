<?php
// FILE: backend-api/modules/pegawai/download_slips_all.php
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

try {
    $bulan = $_GET['bulan'] ?? date('Y-m');
    
    // FETCH ALL SLIPS FOR THE MONTH
    $stmtSlips = $db->prepare("
        SELECT sg.*, p.nik, p.nama_lengkap, k.jabatan, COALESCE(sp_k.status_ptkp, sp.status_ptkp) as status_ptkp, k.jenis_kontrak, pt.kategori_ter
        FROM slip_gaji sg
        JOIN pegawai p ON sg.id_pegawai = p.id_pegawai
        LEFT JOIN kontrak_kerja k ON sg.id_kontrak = k.id_kontrak
        LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
        LEFT JOIN status_ptkp sp_k ON k.id_ptkp = sp_k.id_ptkp
        LEFT JOIN pph_ter pt ON sg.id_ter_reff = pt.id_ter
        WHERE sg.periode = ?
        ORDER BY p.nik ASC
    ");
    $stmtSlips->execute([$bulan]);
    $slips = $stmtSlips->fetchAll(PDO::FETCH_ASSOC);

    if (count($slips) === 0) {
        die("Tidak ada data slip gaji untuk dicetak pada periode ini. Silakan Generate Gaji terlebih dahulu.");
    }

    $pdf = new FPDF('P', 'mm', 'A4');
    
    $stmtAbs = $db->prepare("SELECT * FROM absensi WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
    $stmtNom = $db->prepare("SELECT * FROM nominal_slip WHERE id_slip = ?");

    $dateObj = DateTime::createFromFormat('Y-m', $bulan);
    $periodeLabel = $dateObj ? $dateObj->format('F Y') : date('F Y');
    $tanggal_cetak = date('d F Y', strtotime(date('Y-m-t', strtotime($bulan . '-01'))));

    foreach ($slips as $gaji) {
        $id_pegawai = $gaji['id_pegawai'];
        $id_slip = $gaji['id_slip'];

        // FETCH ABSENSI
        $stmtAbs->execute([$id_pegawai, $bulan]);
        $absensi = $stmtAbs->fetch(PDO::FETCH_ASSOC);

        $hadir = $absensi['hadir'] ?? 0;
        $sakit = $absensi['sakit'] ?? 0;
        $izin = $absensi['izin'] ?? 0;
        $cuti = $absensi['cuti'] ?? 0;
        
        $hari_efektif = $absensi['hari_efektif'] ?? 22; // default 22
        $alpha_days = max(0, $hari_efektif - ($hadir + $sakit + $izin + $cuti));

        // FETCH NOMINAL
        $stmtNom->execute([$id_slip]);
        $rincian = $stmtNom->fetchAll(PDO::FETCH_ASSOC);

        $fixedIncomes = [];
        $variableIncomes = [];
        $penaltyDeductions = [];

        $subtotalFixed = 0;
        $subtotalVariable = 0;
        $subtotalPenalty = 0;

        foreach ($rincian as $r) {
            $nama = $r['nama_komponen'];
            $nominal = $r['nominal'];
            $tipe = $r['jenis_komponen_tipe'];
            
            if ($tipe == 'TETAP') {
                $fixedIncomes[] = ['nama' => $nama, 'nominal' => $nominal];
                $subtotalFixed += $nominal;
            } else if ($tipe == 'VARIABEL') {
                $variableIncomes[] = ['nama' => $nama, 'nominal' => $nominal];
                $subtotalVariable += $nominal;
            } else if ($tipe == 'POTONGAN_LAIN' || stripos($nama, 'Potongan') !== false || stripos($nama, 'Denda') !== false || $tipe == 'POTONGAN') {
                $penaltyDeductions[] = ['nama' => $nama, 'nominal' => abs($nominal)]; // Ensure positive
                $subtotalPenalty += abs($nominal);
            }
        }

        $statutoryDeductions = [];
        $subtotalStatutory = 0;
        if ($gaji['bpjs_tk'] > 0) {
            $statutoryDeductions[] = ['nama' => "BPJS Ketenagakerjaan", 'nominal' => $gaji['bpjs_tk']];
            $subtotalStatutory += $gaji['bpjs_tk'];
        }
        if ($gaji['bpjs_ks'] > 0) {
            $statutoryDeductions[] = ['nama' => "BPJS Kesehatan", 'nominal' => $gaji['bpjs_ks']];
            $subtotalStatutory += $gaji['bpjs_ks'];
        }
        if ($gaji['pph21'] > 0) {
            $kategori_ter = $gaji['kategori_ter'] ?? 'A';
            $statutoryDeductions[] = ['nama' => "PPH 21 (TER $kategori_ter)", 'nominal' => $gaji['pph21']];
            $subtotalStatutory += $gaji['pph21'];
        }

        $totalBruto = $gaji['total_bruto'];
        $totalNetto = $gaji['thp'];

        // --- RENDER PER PEGAWAI ---
        $pdf->AddPage();
        $pdf->SetMargins(15, 10, 15);

        // Header
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, strtoupper('SLIP GAJI PEGAWAI'), 0, 1, 'C');
        $pdf->SetFont('Arial', 'BI', 9);
        $pdf->Cell(0, 5, 'Periode: ' . $periodeLabel, 0, 1, 'C');
        $pdf->Ln(2);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(4);

        // Biodata
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(30, 5, 'NIK', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(60, 5, $gaji['nik'], 0, 0);
        $pdf->Cell(30, 5, 'Jabatan', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(0, 5, $gaji['jabatan'] ?? '-', 0, 1);
        
        $pdf->Cell(30, 5, 'Nama', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(60, 5, $gaji['nama_lengkap'], 0, 0);
        $pdf->Cell(30, 5, 'Status', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); $pdf->Cell(0, 5, ($gaji['jenis_kontrak'] ?? '-') . ' / ' . ($gaji['status_ptkp'] ?? '-'), 0, 1);
        
        $pdf->Ln(1);
        $pdf->Cell(30, 5, 'Kehadiran', 0, 0); $pdf->Cell(5, 5, ':', 0, 0); 
        $pdf->Cell(0, 5, "Hadir: $hadir   Sakit: $sakit   Izin: $izin   Cuti: $cuti   Alpha: $alpha_days", 0, 1);
        
        $pdf->Ln(4);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(4);

        // CONTENT RENDERER
        $renderSection = function($title, $items, $subtotal, $pdf, $isDeduction = false) {
            if (empty($items) && $title !== 'GAJI POKOK & TUNJANGAN TETAP') return;
            
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetFillColor(240, 248, 255); 
            $pdf->Cell(0, 7, $title, 0, 1, 'L', true);
            $pdf->SetFont('Arial', '', 9);

            foreach ($items as $itm) {
                $pdf->Cell(130, 5, "  " . $itm['nama'], 0, 0);
                $pdf->Cell(10, 5, 'Rp', 0, 0, 'R');
                $isNeg = $itm['nominal'] < 0;
                if ($isDeduction || $isNeg) $pdf->SetTextColor(180, 0, 0);
                
                $nomVal = abs($itm['nominal']);
                $nomText = ($isNeg && !$isDeduction) ? '- ' . number_format($nomVal, 0, ',', '.') : number_format($nomVal, 0, ',', '.');
                
                $pdf->Cell(30, 5, $nomText, 0, 1, 'R');
                $pdf->SetTextColor(0, 0, 0);
            }
            
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(130, 6, "  Total " . ucwords(strtolower($title)), 0, 0);
            $pdf->Cell(10, 6, 'Rp', 0, 0, 'R');
            if ($isDeduction) $pdf->SetTextColor(180, 0, 0);
            $pdf->Cell(30, 6, number_format($subtotal, 0, ',', '.'), 0, 1, 'R');
            $pdf->SetTextColor(0, 0, 0);
            $pdf->Ln(2); 
        };

        $renderSection("GAJI POKOK & TUNJANGAN TETAP", $fixedIncomes, $subtotalFixed, $pdf);
        if (!empty($variableIncomes)) $renderSection("KOMPONEN PENGHASILAN LAIN", $variableIncomes, $subtotalVariable, $pdf);

        $pdf->Ln(1);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(130, 7, "TOTAL PENDAPATAN KOTOR (GROSS)", 'T', 0);
        $pdf->Cell(10, 7, 'Rp', 'T', 0, 'R');
        $pdf->Cell(30, 7, number_format($totalBruto, 0, ',', '.'), 'T', 1, 'R');
        $pdf->Ln(4);

        if (!empty($statutoryDeductions)) $renderSection("POTONGAN WAJIB (BPJS & PPH 21)", $statutoryDeductions, $subtotalStatutory, $pdf, true);
        if (!empty($penaltyDeductions)) $renderSection("POTONGAN KEHADIRAN & DENDA", $penaltyDeductions, $subtotalPenalty, $pdf, true);

        $pdf->Ln(4);
        $pdf->SetFillColor(220, 255, 220); 
        $pdf->SetFont('Arial', 'B', 11);
        
        if ($pdf->GetY() > 240) $pdf->AddPage();

        $y = $pdf->GetY();
        $pdf->Rect(15, $y, 180, 10, 'F');
        $pdf->SetXY(15, $y + 1);
        
        $pdf->Cell(130, 8, "  TOTAL GAJI BERSIH (NETTO)", 0, 0);
        $pdf->Cell(10, 8, 'Rp', 0, 0, 'R');
        $pdf->Cell(30, 8, number_format($totalNetto, 0, ',', '.'), 0, 1, 'R');

        // TTD section has been removed as requested.
    }

    if (ob_get_length()) ob_end_clean();
    $pdf->Output('I', 'Slip_Gaji_All.pdf');

} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>
