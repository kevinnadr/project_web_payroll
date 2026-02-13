<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

// Inisialisasi FPDF
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

class PDF extends FPDF {
    function Header() {
        $this->SetFont('Arial', 'B', 16);
        $this->Cell(0, 10, 'DATA PEGAWAI', 0, 1, 'C');
        $this->SetFont('Arial', '', 10);
        $this->Cell(0, 5, 'Dicetak: ' . date('d/m/Y H:i'), 0, 1, 'C');
        $this->Ln(5);
    }
    
    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->Cell(0, 10, 'Halaman ' . $this->PageNo() . '/{nb}', 0, 0, 'C');
    }
}

try {
    // Ambil data pegawai + kontrak
    $bulan = $_GET['bulan'] ?? date('Y-m');

    // Ambil data pegawai + kontrak yang aktif pada periode tersebut
    $sql = "SELECT p.id_pegawai, p.nik, p.nama_lengkap, p.email, sp.status_ptkp,
                   k.id_kontrak, k.jabatan, k.jenis_kontrak, k.tanggal_mulai, k.tanggal_berakhir
            FROM pegawai p
            LEFT JOIN status_ptkp sp ON p.id_ptkp = sp.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            WHERE (k.tanggal_mulai IS NULL OR DATE_FORMAT(k.tanggal_mulai, '%Y-%m') <= :bulan) 
            AND (k.tanggal_berakhir IS NULL OR k.tanggal_berakhir = '0000-00-00' OR DATE_FORMAT(k.tanggal_berakhir, '%Y-%m') >= :bulan)
            ORDER BY p.nik ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([':bulan' => $bulan]);
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pegawaiList) {
        die("<script>alert('Tidak ada data pegawai.'); window.history.back();</script>");
    }

    $pdf = new PDF('L', 'mm', 'A4'); // Landscape
    $pdf->AliasNbPages();
    $pdf->AddPage();
    $pdf->SetMargins(10, 10, 10);

    // --- TABEL HEADER ---
    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetFillColor(59, 130, 246);
    $pdf->SetTextColor(255, 255, 255);
    
    $w = [10, 25, 50, 30, 20, 30, 25, 30, 30]; // Widths
    $header = ['No', 'NIK', 'Nama Lengkap', 'Jabatan', 'Status', 'Gaji Pokok', 'Tunjangan', 'Total Gaji', 'Mulai Kerja'];
    
    foreach ($header as $i => $h) {
        $pdf->Cell($w[$i], 10, $h, 1, 0, 'C', true);
    }
    $pdf->Ln();

    // --- ISI DATA ---
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(0, 0, 0);
    
    // Prepare statement untuk ambil komponen gaji per kontrak
    $stmtKomp = $db->prepare("
        SELECT kp.nama_komponen, nk.nominal 
        FROM nominal_kontrak nk 
        JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen 
        WHERE nk.id_kontrak = ?
    ");

    $no = 1;
    foreach ($pegawaiList as $row) {
        // Ambil komponen gaji
        $gajiPokok = 0;
        $tunjangan = 0;
        
        if ($row['id_kontrak']) {
            $stmtKomp->execute([$row['id_kontrak']]);
            $komponens = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
            foreach ($komponens as $k) {
                if (strtolower($k['nama_komponen']) === 'gaji pokok') {
                    $gajiPokok = $k['nominal'];
                } else {
                    $tunjangan += $k['nominal']; // Wszystkie komponen lain masuk tunjangan for summary
                }
            }
        }
        
        $total = $gajiPokok + $tunjangan;

        $pdf->Cell($w[0], 8, $no++, 1, 0, 'C');
        $pdf->Cell($w[1], 8, $row['nik'], 1, 0, 'L');
        $pdf->Cell($w[2], 8, $row['nama_lengkap'], 1, 0, 'L');
        $pdf->Cell($w[3], 8, $row['jabatan'] ?? '-', 1, 0, 'L');
        $pdf->Cell($w[4], 8, substr($row['jenis_kontrak'] ?? '-', 0, 10), 1, 0, 'C');
        $pdf->Cell($w[5], 8, number_format($gajiPokok, 0, ',', '.'), 1, 0, 'R');
        $pdf->Cell($w[6], 8, number_format($tunjangan, 0, ',', '.'), 1, 0, 'R');
        $pdf->Cell($w[7], 8, number_format($total, 0, ',', '.'), 1, 0, 'R');
        $pdf->Cell($w[8], 8, $row['tanggal_mulai'] ?? '-', 1, 0, 'C');
        $pdf->Ln();
    }

    $pdf->Output('I', 'Data_Pegawai_All.pdf');

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>