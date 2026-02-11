<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

// Inisialisasi FPDF
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Ambil semua data riwayat gaji pada bulan tersebut
    $sql = "SELECT p.nama_lengkap, p.nik, k.jabatan, r.* FROM riwayat_gaji r
            JOIN data_pegawai p ON r.pegawai_id = p.id
            JOIN kontrak_kerja k ON p.id = k.id_pegawai
            WHERE r.bulan = ?
            ORDER BY p.nama_lengkap ASC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$bulan]);
    $semua_gaji = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$semua_gaji) {
        die("<script>alert('Tidak ada data gaji untuk periode $bulan. Silakan Generate di Master Gaji dahulu.'); window.history.back();</script>");
    }

    $pdf = new FPDF('P', 'mm', 'A4');

    foreach ($semua_gaji as $gaji) {
        $pdf->AddPage();
        $pdf->SetMargins(15, 15, 15);

        // --- HEADER ---
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->Cell(0, 10, 'SLIP GAJI KARYAWAN', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(0, 5, 'Periode: ' . $bulan, 0, 1, 'C');
        $pdf->Ln(10);

        // --- INFO PEGAWAI ---
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(35, 7, 'NIK', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $gaji['nik'], 0, 1);
        $pdf->Cell(35, 7, 'Nama Lengkap', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $gaji['nama_lengkap'], 0, 1);
        $pdf->Cell(35, 7, 'Jabatan', 0, 0); $pdf->Cell(5, 7, ':', 0, 0); $pdf->Cell(0, 7, $gaji['jabatan'], 0, 1);
        
        $pdf->Ln(5);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(5);

        // --- TABEL RINCIAN ---
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->Cell(120, 8, 'Keterangan Komponen', 0, 0);
        $pdf->Cell(60, 8, 'Jumlah (Rp)', 0, 1, 'R');
        $pdf->SetFont('Arial', '', 10);

        // Gaji Pokok
        $pdf->Cell(120, 7, 'Gaji Pokok', 0, 0);
        $pdf->Cell(60, 7, number_format($gaji['gaji_pokok'], 0, ',', '.'), 0, 1, 'R');

        // Rincian Komponen Dinamis
        $rincian = json_decode($gaji['rincian_komponen'], true);
        if (is_array($rincian)) {
            foreach ($rincian as $item) {
                $pdf->Cell(120, 7, $item['nama'], 0, 0);
                $prefix = ($item['jenis'] == 'potongan') ? '- ' : '  ';
                $pdf->Cell(60, 7, $prefix . number_format($item['nilai'], 0, ',', '.'), 0, 1, 'R');
            }
        }

        $pdf->Ln(5);
        $pdf->Line(120, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(2);

        // --- TOTAL ---
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(120, 10, 'TOTAL GAJI BERSIH (THP)', 0, 0);
        $pdf->SetFillColor(240, 240, 240);
        $pdf->Cell(60, 10, 'Rp ' . number_format($gaji['gaji_bersih'], 0, ',', '.'), 0, 1, 'R', true);

        // --- TANDA TANGAN ---
        $pdf->Ln(20);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(130, 5, '', 0, 0);
        $pdf->Cell(50, 5, 'Manager HRD,', 0, 1, 'C');
        $pdf->Ln(20);
        $pdf->Cell(130, 5, '', 0, 0);
        $pdf->Cell(50, 5, '( ________________ )', 0, 1, 'C');
    }

    // Output PDF (Satu file berisi banyak halaman)
    $pdf->Output('I', 'Slip_Gaji_Massal_' . $bulan . '.pdf');

} catch (Exception $e) {
    die("Gagal: " . $e->getMessage());
}