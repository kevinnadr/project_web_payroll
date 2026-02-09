<?php
// FILE: backend-api/modules/absensi/import_excel.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$bulan = $_POST['bulan'] ?? date('Y-m');

if (!isset($_FILES['file_excel']['name'])) {
    echo json_encode(["status" => "error", "message" => "File Excel wajib diupload"]);
    exit;
}

try {
    $file_tmp = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($file_tmp);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray();

    unset($rows[0]); // Hapus Header

    $berhasil = 0;
    $gagal = 0;

    $db->beginTransaction();

    foreach ($rows as $row) {
        $nik = isset($row[0]) ? trim((string)$row[0]) : '';
        if (empty($nik)) continue;

        // 1. Cari Pegawai & Info Finansial (Hari Kerja Efektif)
        $stmtPeg = $db->prepare("
            SELECT p.id, COALESCE(i.hari_kerja_efektif, 20) as total_hari 
            FROM pegawai p 
            LEFT JOIN info_finansial i ON p.id = i.pegawai_id 
            WHERE p.nik = ?
        ");
        $stmtPeg->execute([$nik]);
        $pegawai = $stmtPeg->fetch(PDO::FETCH_ASSOC);

        if ($pegawai) {
            $pid = $pegawai['id'];
            $total_hari_kerja = intval($pegawai['total_hari']);
            
            // 2. Ambil Data Kehadiran (Tanpa Alpha)
            // Format Baru: A:NIK | B:Hadir | C:Sakit | D:Izin | E:Cuti | F:Telat | G:Menit
            $hadir = isset($row[1]) ? intval(trim((string)$row[1])) : 0;
            $sakit = isset($row[2]) ? intval(trim((string)$row[2])) : 0;
            $izin  = isset($row[3]) ? intval(trim((string)$row[3])) : 0;
            $cuti  = isset($row[4]) ? intval(trim((string)$row[4])) : 0;
            
            // 3. HITUNG ALPHA OTOMATIS
            $total_masuk = $hadir + $sakit + $izin + $cuti;
            $alpha = $total_hari_kerja - $total_masuk;
            
            // Cegah minus (misal input hadir 25 padahal hari kerja 20)
            if ($alpha < 0) $alpha = 0; 

            // Geser index karena kolom Alpha dihapus dari Excel
            $telat = isset($row[5]) ? intval(trim((string)$row[5])) : 0; 
            $menit = isset($row[6]) ? intval(trim((string)$row[6])) : 0;

            // 4. Update Absensi
            $sql = "INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, terlambat, `menit terlambat`)
                    VALUES (:pid, :bln, :h, :s, :i, :c, :t, :mt)
                    ON DUPLICATE KEY UPDATE 
                    hadir=:h, sakit=:s, izin=:i, cuti=:c, terlambat=:t, `menit terlambat`=:mt";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':pid' => $pid, ':bln' => $bulan,
                ':h' => $hadir, ':s' => $sakit, ':i' => $izin, ':c' => $cuti,
                ':t' => $telat, ':mt' => $menit
            ]);

            // 5. Update Alpha (Hasil Hitungan)
            $sqlA = "INSERT INTO absensi_alpha (pegawai_id, bulan, jumlah_alpha)
                     VALUES (:pid, :bln, :a)
                     ON DUPLICATE KEY UPDATE jumlah_alpha=:a";
            
            $stmtA = $db->prepare($sqlA);
            $stmtA->execute([':pid' => $pid, ':bln' => $bulan, ':a' => $alpha]);

            $berhasil++;
        } else {
            $gagal++;
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Import Selesai. Sukses: $berhasil, Gagal: $gagal"]);

} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>