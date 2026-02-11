<?php
// Pastikan path config dan vendor benar
require_once '../../config/database.php';
require_once '../../config/cors.php';
require_once '../../vendor/autoload.php';

// Fix: Memastikan class FPDF tersedia (baik via composer maupun manual)
if (!class_exists('FPDF') && class_exists('Setasign\Fpdf\Fpdf')) {
    class_alias('Setasign\Fpdf\Fpdf', 'FPDF');
}

if (!class_exists('FPDF')) {
    die("Error: Library FPDF tidak ditemukan. Silakan jalankan 'composer require setasign/fpdf'");
}

// Ambil parameter dari URL
$id = $_GET['id'] ?? 0;
$bulan = $_GET['bulan'] ?? date('Y-m');

try {
    // 1. Query Data Slip Gaji dari riwayat_gaji (Snapshot hasil generate)
    $sql = "SELECT p.nama_lengkap, p.nik, k.jabatan, r.* FROM riwayat_gaji r
            JOIN data_pegawai p ON r.pegawai_id = p.id
            JOIN kontrak_kerja k ON p.id = k.id_pegawai
            WHERE p.id = ? AND r.bulan = ?";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([$id, $bulan]);
    $gaji = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$gaji) {
        die("<script>alert('Slip gaji periode $bulan belum digenerate! Silakan ke Master Gaji dulu.'); window.close();</script>");
    }

    // 2. Inisialisasi PDF
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetMargins(15, 15, 15);

    // --- HEADER SLIP ---
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
    $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY()); // Garis pembatas
    $pdf->Ln(5);

    // --- TABEL RINCIAN ---
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(120, 8, 'Keterangan Komponen', 0, 0);
    $pdf->Cell(60, 8, 'Jumlah (Rp)', 0, 1, 'R');
    $pdf->SetFont('Arial', '', 10);

    // Gaji Pokok
    $pdf->Cell(120, 7, 'Gaji Pokok', 0, 0);
    $pdf->Cell(60, 7, number_format($gaji['gaji_pokok'], 0, ',', '.'), 0, 1, 'R');

    // Dekode Rincian Komponen (Tunjangan & Potongan & BPJS)
    $rincian = json_decode($gaji['rincian_komponen'], true);
    
    if (is_array($rincian)) {
        foreach ($rincian as $item) {
            $pdf->Cell(120, 7, $item['nama'], 0, 0);
            
            // Berikan tanda minus jika jenisnya potongan
            $prefix = ($item['jenis'] == 'potongan') ? '- ' : '  ';
            $pdf->Cell(60, 7, $prefix . number_format($item['nilai'], 0, ',', '.'), 0, 1, 'R');
        }
    }

    $pdf->Ln(5);
    $pdf->Line(120, $pdf->GetY(), 195, $pdf->GetY()); // Garis total
    $pdf->Ln(2);

    // --- TOTAL GAJI BERSIH ---
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->Cell(120, 10, 'TOTAL GAJI BERSIH (THP)', 0, 0);
    $pdf->SetFillColor(240, 240, 240);
    $pdf->Cell(60, 10, 'Rp ' . number_format($gaji['gaji_bersih'], 0, ',', '.'), 0, 1, 'R', true);

    // --- TANDA TANGAN ---
    $pdf->Ln(20);
    $pdf->SetFont('Arial', '', 10);
    
    $pdf->Cell(130, 5, '', 0, 0);
    $pdf->Cell(50, 5, 'Dicetak pada: ' . date('d/m/Y'), 0, 1, 'C');
    
    $pdf->Ln(20);
    $pdf->Cell(130, 5, '', 0, 0);
    $pdf->Cell(50, 5, '( HRD Manager )', 0, 1, 'C');

    // Output PDF ke Browser
    $pdf->Output('I', 'Slip_Gaji_' . $gaji['nik'] . '_' . $bulan . '.pdf');

} catch (Exception $e) {
    die("Gagal membuat PDF: " . $e->getMessage());
}