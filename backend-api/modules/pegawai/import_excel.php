<?php
// backend-api/modules/pegawai/import_excel.php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

// 1. Cek Token JWT (Opsional: Nanti kita amankan, sekarang los dulu biar jalan)

// 2. Cek apakah ada file yang diupload
if (!isset($_FILES['file_excel']['name'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "File Excel belum diupload"]);
    exit;
}

try {
    // 3. Baca File Excel
    $file_tmp = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($file_tmp);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray(); // Konversi Excel ke Array PHP

    // Hapus header (Baris pertama biasanya Judul Kolom: NIK, NAMA, dll)
    unset($rows[0]);

    $berhasil = 0;
    $gagal = 0;

    // 4. Looping data baris per baris
    $sql = "INSERT INTO pegawai (nik, nama_lengkap, jabatan, gaji_pokok, email, tanggal_masuk) 
            VALUES (:nik, :nama, :jabatan, :gaji, :email, :tgl)
            ON DUPLICATE KEY UPDATE 
            nama_lengkap = :nama, jabatan = :jabatan, gaji_pokok = :gaji"; // Update jika NIK sama

    $stmt = $db->prepare($sql);

    foreach ($rows as $row) {
        // Asumsi format Excel: Kolom A=NIK, B=Nama, C=Jabatan, D=Gaji, E=Email, F=Tgl Masuk
        // Pastikan Excelnya nanti urutannya begini ya!
        $nik = $row[0];
        $nama = $row[1];
        $jabatan = $row[2];
        $gaji = $row[3];
        $email = $row[4];
        $tgl = date('Y-m-d', strtotime($row[5])); // Format tanggal Excel kadang aneh, kita standarkan

        if (!empty($nik) && !empty($nama)) {
            try {
                $stmt->execute([
                    ':nik' => $nik,
                    ':nama' => $nama,
                    ':jabatan' => $jabatan,
                    ':gaji' => $gaji,
                    ':email' => $email,
                    ':tgl' => $tgl
                ]);
                $berhasil++;
            } catch (Exception $e) {
                $gagal++;
            }
        }
    }

    echo json_encode([
        "status" => "success", 
        "message" => "Import Selesai! Data Masuk: $berhasil, Gagal: $gagal"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error baca file: " . $e->getMessage()]);
}
?>