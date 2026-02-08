<?php
// FILE: backend-api/modules/pegawai/export_all_slip.php

// 1. Load Koneksi Database
require_once '../../config/database.php';

// ❌ JANGAN PAKAI CORS.PHP DI SINI (Supaya tidak dianggap JSON)
// ✅ GANTI DENGAN HEADER HTML INI:
header('Content-Type: text/html; charset=utf-8');

try {
    // 2. Ambil Semua Data Pegawai
    $stmt = $db->query("SELECT * FROM pegawai ORDER BY nama_lengkap ASC");
    $pegawaiList = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Ambil Komponen Gaji (Tunjangan & Potongan)
    // Asumsi: Semua pegawai dapat komponen yang sama (Simplifikasi)
    $stmtKomp = $db->query("SELECT * FROM komponen_gaji");
    $masterKomponen = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
    die("Error Database: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Cetak Semua Slip Gaji</title>
    <style>
        /* RESET & BASIC */
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #525659; /* Abu-abu gelap biar seperti preview PDF */
            margin: 0; 
            padding: 20px; 
        }

        /* KERTAS A4 */
        .page-container {
            width: 210mm; /* Lebar A4 */
            min-height: 297mm; /* Tinggi A4 */
            background: white;
            margin: 0 auto 20px auto; /* Tengah layar */
            padding: 40px;
            box-sizing: border-box;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.5); /* Bayangan biar keren di layar */
        }

        /* --- LOGIKA PRINT (PENTING!) --- */
        @media print {
            body { 
                background: white; 
                margin: 0; 
                padding: 0; 
            }
            .page-container {
                width: 100%;
                margin: 0;
                box-shadow: none;
                /* INI YANG BIKIN PISAH HALAMAN OTOMATIS */
                page-break-after: always; 
            }
            .no-print { display: none !important; }
        }

        /* TYPOGRAPHY & TABLE */
        h2, h3, p { margin: 0; }
        .header { 
            text-align: center; 
            border-bottom: 3px double #333; 
            padding-bottom: 15px; 
            margin-bottom: 25px; 
        }
        .header h2 { text-transform: uppercase; color: #1e293b; letter-spacing: 1px; }
        .header p { color: #64748b; margin-top: 5px; font-size: 14px; }

        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 5px 0; font-size: 14px; }
        .label { font-weight: bold; color: #475569; width: 130px; }

        .gaji-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .gaji-table th { 
            background: #f1f5f9; 
            padding: 10px; 
            text-align: left; 
            border-bottom: 2px solid #cbd5e1;
            font-size: 13px;
            text-transform: uppercase;
            color: #475569;
        }
        .gaji-table td { 
            padding: 10px; 
            border-bottom: 1px solid #e2e8f0; 
            font-size: 14px;
        }
        
        .text-right { text-align: right; }
        .text-green { color: #16a34a; font-weight: 500; }
        .text-red { color: #dc2626; font-weight: 500; }
        
        .total-row td { 
            background: #eff6ff; 
            font-weight: bold; 
            font-size: 16px; 
            color: #1e40af; 
            padding: 15px 10px;
            border-top: 2px solid #bfdbfe;
        }

        /* FOOTER TANDA TANGAN */
        .footer-ttd {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding: 0 30px;
        }
        .ttd-box { text-align: center; width: 200px; }
        .ttd-line { 
            margin-top: 70px; 
            border-bottom: 1px solid #333; 
            font-weight: bold;
        }

        /* TOMBOL PRINT DI LAYAR */
        .print-btn-container {
            text-align: center;
            margin-bottom: 30px;
            position: sticky;
            top: 20px;
            z-index: 100;
        }
        .btn-print {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        }
        .btn-print:hover { transform: scale(1.05); background: #1d4ed8; }
    </style>
</head>
<body>

    <div class="print-btn-container no-print">
        <button onclick="window.print()" class="btn-print">
            🖨️ KLIK UNTUK PRINT / SAVE PDF
        </button>
        <div style="color:white; margin-top:10px; font-size:12px;">
            Tips: Pilih "Save as PDF" di menu print destination.
        </div>
    </div>

    <?php foreach($pegawaiList as $p): 
        
        // --- LOGIKA HITUNG GAJI SEDERHANA ---
        $gajiPokok = $p['gaji_pokok'];
        $totalTerima = $gajiPokok;
        $totalPotong = 0;

        // Pisahkan komponen untuk ditampilkan di tabel
        $listPenerimaan = [];
        $listPotongan = [];

        foreach($masterKomponen as $k) {
            if($k['jenis'] == 'penerimaan') {
                $totalTerima += $k['nominal'];
                $listPenerimaan[] = $k;
            } else {
                $totalPotong += $k['nominal'];
                $listPotongan[] = $k;
            }
        }

        $gajiBersih = $totalTerima - $totalPotong;
        // -------------------------------------
    ?>

    <div class="page-container">
        
        <div class="header">
            <h2>PT. WEB PAYROLL INDONESIA</h2>
            <p>Jl. Teknologi No. 123, Jakarta Selatan - Indonesia</p>
            <p style="font-weight:bold; margin-top:10px; color:#333;">SLIP GAJI PERIODE: <?= date('F Y') ?></p>
        </div>

        <table class="info-table">
            <tr>
                <td class="label">NIK</td>
                <td>: <?= $p['nik'] ?></td>
                <td class="label">Jabatan</td>
                <td>: <?= $p['jabatan'] ?></td>
            </tr>
            <tr>
                <td class="label">Nama Lengkap</td>
                <td>: <strong><?= $p['nama_lengkap'] ?></strong></td>
                <td class="label">Email</td>
                <td>: <?= $p['email'] ? $p['email'] : '-' ?></td>
            </tr>
            <tr>
                <td class="label">Tanggal Cetak</td>
                <td>: <?= date('d-m-Y') ?></td>
                <td class="label">Status</td>
                <td>: <span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:bold;">AKTIF</span></td>
            </tr>
        </table>

        <table class="gaji-table">
            <thead>
                <tr>
                    <th>KETERANGAN</th>
                    <th class="text-right">JUMLAH (IDR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Gaji Pokok</td>
                    <td class="text-right text-green">Rp <?= number_format($gajiPokok, 0, ',', '.') ?></td>
                </tr>

                <?php foreach($listPenerimaan as $item): ?>
                <tr>
                    <td>Tunjangan: <?= $item['nama_komponen'] ?></td>
                    <td class="text-right text-green">Rp <?= number_format($item['nominal'], 0, ',', '.') ?></td>
                </tr>
                <?php endforeach; ?>

                <?php foreach($listPotongan as $item): ?>
                <tr>
                    <td>Potongan: <?= $item['nama_komponen'] ?></td>
                    <td class="text-right text-red">( Rp <?= number_format($item['nominal'], 0, ',', '.') ?> )</td>
                </tr>
                <?php endforeach; ?>
            </tbody>
            
            <tfoot>
                <tr class="total-row">
                    <td>TOTAL GAJI BERSIH (TAKE HOME PAY)</td>
                    <td class="text-right">Rp <?= number_format($gajiBersih, 0, ',', '.') ?></td>
                </tr>
            </tfoot>
        </table>

        <div style="margin-top:15px; font-style:italic; color:#64748b; font-size:13px;">
            * Gaji bersih yang diterima karyawan setelah dikurangi potongan.
        </div>

        <div class="footer-ttd">
            <div class="ttd-box">
                <p>Penerima,</p>
                <div class="ttd-line"><?= $p['nama_lengkap'] ?></div>
            </div>
            <div class="ttd-box">
                <p>Jakarta, <?= date('d F Y') ?></p>
                <p>Manager Keuangan,</p>
                <div class="ttd-line">Admin Payroll</div>
            </div>
        </div>

    </div> 
    <?php endforeach; ?>

</body>
</html>