<?php
// FILE: backend-api/modules/pegawai/import_excel.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';
require_once '../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

if (!isset($_FILES['file_excel']) || $_FILES['file_excel']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["status" => "error", "message" => "File wajib diupload atau file rusak."]);
    exit;
}

try {
    $file_tmp = $_FILES['file_excel']['tmp_name'];
    $spreadsheet = IOFactory::load($file_tmp);
    $rows = $spreadsheet->getActiveSheet()->toArray();
    
    // ============================================================
    // VALIDASI HEADER KOLOM
    // ============================================================
    if (count($rows) < 2) {
        echo json_encode(["status" => "error", "message" => "File kosong atau hanya berisi header tanpa data."]);
        exit;
    }

    $headerRow = $rows[0]; // Baris pertama = header

    // Definisi kolom yang diharapkan (index => [nama_resmi, alias yang diterima])
    $expectedHeaders = [
        0 => ['label' => 'NIK',             'aliases' => ['nik']],
        1 => ['label' => 'Nama Lengkap',    'aliases' => ['nama lengkap', 'nama', 'nama pegawai', 'nama karyawan', 'nama_lengkap']],
        2 => ['label' => 'Email',           'aliases' => ['email', 'e-mail', 'alamat email', 'email pegawai']],
        3 => ['label' => 'PTKP',            'aliases' => ['ptkp', 'status ptkp', 'status_ptkp']],
        4 => ['label' => 'Jabatan',         'aliases' => ['jabatan', 'posisi', 'position']],
        5 => ['label' => 'Status Kontrak',  'aliases' => ['status kontrak', 'status_kontrak', 'jenis kontrak', 'jenis_kontrak', 'kontrak', 'tipe kontrak']],
        6 => ['label' => 'Tanggal Masuk',   'aliases' => ['tanggal masuk', 'tanggal_masuk', 'tgl masuk', 'tgl_masuk', 'tanggal mulai', 'mulai kerja', 'join date']],
        7 => ['label' => 'Gaji Pokok',      'aliases' => ['gaji pokok', 'gaji_pokok', 'gaji', 'salary', 'basic salary']],
    ];

    $headerErrors = [];
    $headerMapping = []; // Untuk mapping posisi kolom jika urutan berbeda

    foreach ($expectedHeaders as $colIdx => $config) {
        $actualHeader = isset($headerRow[$colIdx]) ? mb_strtolower(trim((string)$headerRow[$colIdx])) : '';
        
        // Hapus karakter tersembunyi / non-printable
        $actualHeader = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $actualHeader);
        
        if (empty($actualHeader)) {
            $headerErrors[] = "Kolom " . ($colIdx + 1) . " (kosong) → seharusnya: \"" . $config['label'] . "\"";
            continue;
        }
        
        // Cek apakah header cocok dengan salah satu alias
        $matched = false;
        foreach ($config['aliases'] as $alias) {
            if ($actualHeader === $alias) {
                $matched = true;
                break;
            }
        }
        
        if (!$matched) {
            $headerErrors[] = "Kolom " . ($colIdx + 1) . " \"" . trim((string)$headerRow[$colIdx]) . "\" → seharusnya: \"" . $config['label'] . "\"";
        }
    }

    if (!empty($headerErrors)) {
        $errorMsg = "Header kolom tidak sesuai format!\n\n";
        $errorMsg .= "Kesalahan ditemukan:\n";
        foreach ($headerErrors as $he) {
            $errorMsg .= "• $he\n";
        }
        $errorMsg .= "\nFormat yang benar (urutan): NIK | Nama Lengkap | Email | PTKP | Jabatan | Status Kontrak | Tanggal Masuk | Gaji Pokok";
        $errorMsg .= "\n\nTips: Download template dari tombol 'Format' untuk mendapatkan format yang benar.";
        
        echo json_encode(["status" => "error", "message" => $errorMsg]);
        exit;
    }

    // Header valid, hapus header row dan lanjutkan proses
    array_shift($rows);

    $berhasil = 0;
    $gagal = 0;
    $errors = [];
    $db->beginTransaction();

    foreach ($rows as $idx => $row) {
        $rowNum = $idx + 2; // Baris di Excel (1-indexed + header)
        $nik = isset($row[0]) ? trim((string)$row[0]) : '';
        $nama = isset($row[1]) ? trim((string)$row[1]) : '';
        
        if (empty($nik) || empty($nama)) {
            if (!empty($nik) || !empty($nama)) {
                $gagal++;
                $errors[] = "Baris $rowNum: NIK atau Nama kosong";
            }
            continue;
        }

        $email = isset($row[2]) ? trim((string)$row[2]) : '';
        $ptkp = isset($row[3]) ? trim((string)$row[3]) : 'TK/0';
        $jabatan = isset($row[4]) ? trim((string)$row[4]) : 'Staff';
        $kontrak = isset($row[5]) ? trim((string)$row[5]) : 'TETAP';
        $tgl_masuk = isset($row[6]) ? trim((string)$row[6]) : date('Y-m-d');
        $gaji_pokok = isset($row[7]) ? intval(str_replace(['.', ',', ' '], '', $row[7])) : 0;

        try {
            // 1. UPSERT DATA PEGAWAI (nik is UNIQUE)
            $stmt1 = $db->prepare("INSERT INTO data_pegawai (nik, nama_lengkap, email, status_ptkp) 
                VALUES (:nik, :nama, :email, :ptkp)
                ON DUPLICATE KEY UPDATE nama_lengkap=:nama2, email=:email2, status_ptkp=:ptkp2");
            $stmt1->execute([
                ':nik' => $nik, ':nama' => $nama, ':email' => $email, ':ptkp' => $ptkp,
                ':nama2' => $nama, ':email2' => $email, ':ptkp2' => $ptkp
            ]);

            // Ambil ID Pegawai
            $stmtId = $db->prepare("SELECT id FROM data_pegawai WHERE nik = ?");
            $stmtId->execute([$nik]);
            $pid = $stmtId->fetchColumn();

            if (!$pid) {
                $gagal++;
                $errors[] = "Baris $rowNum: Gagal ambil ID pegawai";
                continue;
            }

            // 2. UPSERT KONTRAK - cek apakah sudah ada
            $cekKontrak = $db->prepare("SELECT id FROM kontrak_pegawai WHERE pegawai_id = ?");
            $cekKontrak->execute([$pid]);
            
            if ($cekKontrak->rowCount() > 0) {
                $stmt2 = $db->prepare("UPDATE kontrak_pegawai SET jabatan=?, jenis_kontrak=?, tanggal_masuk=? WHERE pegawai_id=?");
                $stmt2->execute([$jabatan, $kontrak, $tgl_masuk, $pid]);
            } else {
                $stmt2 = $db->prepare("INSERT INTO kontrak_pegawai (pegawai_id, jabatan, jenis_kontrak, tanggal_masuk) VALUES (?, ?, ?, ?)");
                $stmt2->execute([$pid, $jabatan, $kontrak, $tgl_masuk]);
            }

            // 3. UPSERT KOMPONEN GAJI - cek apakah sudah ada
            $cekGaji = $db->prepare("SELECT id FROM komponen_gaji WHERE pegawai_id = ?");
            $cekGaji->execute([$pid]);
            
            if ($cekGaji->rowCount() > 0) {
                $stmt3 = $db->prepare("UPDATE komponen_gaji SET gaji_pokok=? WHERE pegawai_id=?");
                $stmt3->execute([$gaji_pokok, $pid]);
            } else {
                $stmt3 = $db->prepare("INSERT INTO komponen_gaji (pegawai_id, gaji_pokok) VALUES (?, ?)");
                $stmt3->execute([$pid, $gaji_pokok]);
            }

            $berhasil++;
        } catch (Exception $rowErr) {
            $gagal++;
            $errors[] = "Baris $rowNum: " . $rowErr->getMessage();
        }
    }

    $db->commit();
    
    $msg = "Import selesai! Berhasil: $berhasil";
    if ($gagal > 0) {
        $msg .= ", Gagal: $gagal";
    }
    
    echo json_encode([
        "status" => "success", 
        "message" => $msg,
        "detail" => [
            "berhasil" => $berhasil,
            "gagal" => $gagal,
            "errors" => $errors
        ]
    ]);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo json_encode(["status" => "error", "message" => "Import gagal: " . $e->getMessage()]);
}
?>