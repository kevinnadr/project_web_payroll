<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

// Inisialisasi FPDF
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

class PDF extends FPDF {
    protected $bulanTitle = '';

    function SetBulanTitle($bulan) {
        $this->bulanTitle = date('F Y', strtotime($bulan . '-01'));
    }

    function Header() {
        // Line Title
        $this->SetFont('Arial', 'B', 18);
        $this->SetTextColor(185, 28, 28); // Tailwind red-700
        $this->Cell(0, 8, 'REKAP DATA PEGAWAI & KONTRAK GAJI', 0, 1, 'C');
        
        $this->SetFont('Arial', 'B', 11);
        $this->SetTextColor(55, 65, 81); // Tailwind gray-700
        $this->Cell(0, 6, 'Periode: ' . strtoupper($this->bulanTitle), 0, 1, 'C');
        
        $this->SetFont('Arial', '', 9);
        $this->SetTextColor(107, 114, 128); // Tailwind gray-500
        $this->Cell(0, 5, 'Dicetak: ' . date('d/m/Y H:i'), 0, 1, 'C');
        $this->Ln(8);

        // --- TABEL HEADER ---
        $this->SetFont('Arial', 'B', 9);
        $this->SetFillColor(185, 28, 28); // Tailwind red-700
        $this->SetTextColor(255, 255, 255);
        $this->SetDrawColor(229, 231, 235); // Light gray border
        $this->SetLineWidth(0.3);
        
        // Sum widths = 277 (A4 Landscape available width)
        $w = [10, 25, 60, 42, 25, 30, 30, 30, 25];
        $header = ['No', 'NIK', 'Nama Lengkap', 'Jabatan', 'Status', 'Gaji Pokok', 'Tunjangan', 'Total Gaji', 'Mulai Kerja'];
        
        foreach ($header as $i => $h) {
            $this->Cell($w[$i], 10, $h, 1, 0, 'C', true);
        }
        $this->Ln();
    }
    
    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(107, 114, 128);
        $this->Cell(0, 10, 'Halaman ' . $this->PageNo() . '/{nb}', 0, 0, 'R');
    }
}

try {
    // Ambil data pegawai + kontrak
    $bulan = $_GET['bulan'] ?? date('Y-m');

    $sql = "SELECT p.id_pegawai, p.nik, p.nama_lengkap, p.email, sp.status_ptkp as sp_p,
                   k.id_kontrak, k.jabatan, k.jenis_kontrak, k.tanggal_mulai, k.tanggal_berakhir, sk.status_ptkp as sp_k
            FROM pegawai p
            LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
                AND k.tanggal_mulai <= LAST_DAY(:bulanEndDate)
                AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR k.tanggal_berakhir >= :bulanStartDate)
            LEFT JOIN status_ptkp sk ON k.id_ptkp = sk.id_ptkp
            ORDER BY p.nik ASC";
    
    $stmt = $db->prepare($sql);
    $bulanDate = $bulan . '-01';
    $stmt->execute([':bulanEndDate' => $bulanDate, ':bulanStartDate' => $bulanDate]);
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pegawaiList) {
        $html = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Peringatan - Web Payroll</title>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>body { background-color: #f8fafc; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }</style>
</head>
<body>
    <script>
        Swal.fire({
            icon: 'warning',
            title: 'Tidak Ada Data',
            html: 'Tidak ada data pegawai untuk periode <b>$bulan</b>.',
            confirmButtonText: 'Kembali',
            confirmButtonColor: '#ef4444',
            allowOutsideClick: false,
            backdrop: `rgba(0,0,0,0.4)`
        }).then((result) => {
            window.history.back();
        });
    </script>
</body>
</html>
HTML;
        die($html);
    }

    $pdf = new PDF('L', 'mm', 'A4'); // Landscape
    $pdf->AliasNbPages();
    $pdf->SetBulanTitle($bulan);
    $pdf->AddPage();
    $pdf->SetMargins(10, 10, 10);
    $pdf->SetAutoPageBreak(true, 15);

    // --- ISI DATA ---
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetDrawColor(229, 231, 235); // Border abu-abu terang
    $pdf->SetLineWidth(0.3);
    
    $w = [10, 25, 60, 42, 25, 30, 30, 30, 25];
    
    $stmtKomp = $db->prepare("
        SELECT kp.nama_komponen, nk.nominal 
        FROM nominal_kontrak nk 
        JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen 
        WHERE nk.id_kontrak = ?
    ");

    $no = 1;
    $fill = false; // Background toggle (Zebra striping)

    // Variable for Summary
    $sumGajiPokok = 0;
    $sumTunjangan = 0;
    $sumTotalAll = 0;

    foreach ($pegawaiList as $row) {
        $gajiPokok = 0;
        $tunjangan = 0;
        
        if ($row['id_kontrak']) {
            $stmtKomp->execute([$row['id_kontrak']]);
            $komponens = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
            foreach ($komponens as $k) {
                if (strtolower($k['nama_komponen']) === 'gaji pokok') {
                    $gajiPokok = $k['nominal'];
                } else {
                    $tunjangan += $k['nominal'];
                }
            }
        }
        
        $total = $gajiPokok + $tunjangan;

        $sumGajiPokok += $gajiPokok;
        $sumTunjangan += $tunjangan;
        $sumTotalAll += $total;

        // Set Fill Color (Zebra Striping)
        if ($fill) {
            $pdf->SetFillColor(249, 250, 251); // Gray-50
        } else {
            $pdf->SetFillColor(255, 255, 255);
        }
        $pdf->SetTextColor(55, 65, 81); // Gray-700
        
        $pdf->Cell($w[0], 9, $no++, 'LRB', 0, 'C', true);
        $pdf->Cell($w[1], 9, $row['nik'], 'LRB', 0, 'C', true);

        // Limit name & jabatan length
        $namaDisplay = strlen($row['nama_lengkap']) > 32 ? substr($row['nama_lengkap'], 0, 30) . '...' : $row['nama_lengkap'];
        $pdf->Cell($w[2], 9, '  ' . $namaDisplay, 'LRB', 0, 'L', true);
        
        $jabatanDisplay = $row['jabatan'] ? (strlen($row['jabatan']) > 22 ? substr($row['jabatan'], 0, 20).'...' : $row['jabatan']) : '-';
        $pdf->Cell($w[3], 9, '  ' . $jabatanDisplay, 'LRB', 0, 'L', true);
        
        $pdf->Cell($w[4], 9, substr($row['jenis_kontrak'] ?? '-', 0, 10), 'LRB', 0, 'C', true);
        
        // Use different text color if 0
        $pdf->SetTextColor($gajiPokok > 0 ? 17 : 107, $gajiPokok > 0 ? 24 : 114, $gajiPokok > 0 ? 39 : 128);
        $pdf->Cell($w[5], 9, $gajiPokok > 0 ? number_format($gajiPokok, 0, ',', '.') . '  ' : '-  ', 'LRB', 0, 'R', true);
        
        $pdf->SetTextColor($tunjangan > 0 ? 17 : 107, $tunjangan > 0 ? 24 : 114, $tunjangan > 0 ? 39 : 128);
        $pdf->Cell($w[6], 9, $tunjangan > 0 ? number_format($tunjangan, 0, ',', '.') . '  ' : '-  ', 'LRB', 0, 'R', true);

        $pdf->SetTextColor(185, 28, 28); // Red-700 for highlighting total
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell($w[7], 9, $total > 0 ? number_format($total, 0, ',', '.') . '  ' : '-  ', 'LRB', 0, 'R', true);
        
        $pdf->SetFont('Arial', '', 9);
        $pdf->SetTextColor(55, 65, 81);
        $tglMulaiDisplay = $row['tanggal_mulai'] ? date('d/m/Y', strtotime($row['tanggal_mulai'])) : '-';
        $pdf->Cell($w[8], 9, $tglMulaiDisplay, 'LRB', 0, 'C', true);
        $pdf->Ln();
        
        $fill = !$fill;
    }

    // --- GRAND TOTAL FOOTER ---
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetFillColor(229, 231, 235); // Gray-200
    $pdf->SetTextColor(17, 24, 39); // Gray-900
    
    $pdf->Cell($w[0]+$w[1]+$w[2]+$w[3]+$w[4], 10, 'GRAND TOTAL ESTIMASI KONTRAK BULAN INI', 1, 0, 'R', true);
    
    $pdf->SetTextColor(185, 28, 28);
    $pdf->Cell($w[5], 10, number_format($sumGajiPokok, 0, ',', '.') . '  ', 1, 0, 'R', true);
    $pdf->Cell($w[6], 10, number_format($sumTunjangan, 0, ',', '.') . '  ', 1, 0, 'R', true);
    $pdf->Cell($w[7], 10, number_format($sumTotalAll, 0, ',', '.') . '  ', 1, 0, 'R', true);
    $pdf->Cell($w[8], 10, '', 1, 0, 'C', true);

    $pdf->Output('I', 'Rekap_Data_Pegawai_Periode_' . $bulan . '.pdf');

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>