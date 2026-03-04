<?php
// FILE: backend-api/modules/pendapatan_lain/import_excel.php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/import_error.log');
ini_set('memory_limit', '512M');
set_time_limit(300);

ob_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

function shutdown_handler() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        ob_clean();
        if (!headers_sent()) {
            http_response_code(500); 
        }
        echo json_encode(["status" => "error", "message" => "Fatal Error: " . $error['message']]);
        exit;
    }
}
register_shutdown_function('shutdown_handler');

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../vendor/autoload.php';

    if (!isset($_FILES['file_excel']) || $_FILES['file_excel']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("File wajib diupload atau gagal terupload.");
    }

    $originalName = $_FILES['file_excel']['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    if ($ext === 'xlsx' && !extension_loaded('zip')) {
         throw new Exception("Server XAMPP Anda belum mengaktifkan ekstensi ZIP. Mohon gunakan format .xls.");
    }

    $file_tmp = $_FILES['file_excel']['tmp_name'];
    $periode = $_POST['periode'] ?? date('Y-m');
    $dateFilter = $periode . '-01';
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file_tmp);
    } catch (Exception $e) {
        throw new Exception("Gagal membaca file Excel: " . $e->getMessage());
    }
    
    $rows = $spreadsheet->getActiveSheet()->toArray();

    if (count($rows) < 2) {
        throw new Exception("File kosong atau hanya berisi header.");
    }

    $headerRow = $rows[0];
    array_shift($rows);

    $normalizedHeaders = [];
    foreach ($headerRow as $idx => $val) {
        if ($val === null) continue;
        $clean = mb_strtolower(trim((string)$val));
        $normalizedHeaders[$idx] = $clean;
    }

    $colMap = [
        'nik' => -1,
        'nama_pendapatan' => -1,
        'nominal' => -1,
        'kategori' => -1
    ];

    foreach ($normalizedHeaders as $idx => $headerName) {
        if (strpos($headerName, 'nik') !== false) $colMap['nik'] = $idx;
        else if (strpos($headerName, 'nama pendapatan') !== false || strpos($headerName, 'komponen') !== false) $colMap['nama_pendapatan'] = $idx;
        else if (strpos($headerName, 'nominal') !== false) $colMap['nominal'] = $idx;
        else if (strpos($headerName, 'kategori') !== false || strpos($headerName, 'tipe') !== false) $colMap['kategori'] = $idx;
    }

    if ($colMap['nik'] === -1 || $colMap['nama_pendapatan'] === -1 || $colMap['nominal'] === -1) {
        throw new Exception("Kolom wajib [NIK, Nama Pendapatan, Nominal] tidak ditemukan.");
    }

    $berhasil = 0;
    $gagal = 0;
    $errors = [];
    
    $db->beginTransaction();

    foreach ($rows as $idx => $row) {
        $rowNum = $idx + 2;
        
        $nik = isset($row[$colMap['nik']]) ? trim((string)$row[$colMap['nik']]) : '';
        $nama_pend = isset($row[$colMap['nama_pendapatan']]) ? trim((string)$row[$colMap['nama_pendapatan']]) : '';
        $nom_raw = isset($row[$colMap['nominal']]) ? (string)$row[$colMap['nominal']] : '0';
        
        $kat_raw = ($colMap['kategori'] !== -1 && isset($row[$colMap['kategori']])) ? trim((string)$row[$colMap['kategori']]) : 'Tetap';
        
        if (empty($nik) && empty($nama_pend)) continue;

        if (empty($nik) || empty($nama_pend)) {
            $gagal++;
            $errors[] = "Baris $rowNum: NIK atau Nama Pendapatan kosong.";
            continue;
        }

        $nominal = (float)preg_replace('/[^0-9.]/', '', $nom_raw);
        
        // Normalize kategori
        $kategori = 'Tetap';
        if (stripos($kat_raw, 'non') !== false) $kategori = 'Non Alpha';
        if (stripos($kat_raw, 'hadir') !== false) $kategori = 'Kehadiran';

        try {
            $stmtCek = $db->prepare("SELECT id_pegawai FROM pegawai WHERE nik = ?");
            $stmtCek->execute([$nik]);
            $id_pegawai = $stmtCek->fetchColumn();

            if (!$id_pegawai) {
                $gagal++;
                $errors[] = "Baris $rowNum: Ditolak, NIK '$nik' tidak ditemukan di database pegawai.";
                continue;
            }

            $stmtCekPend = $db->prepare("SELECT id_pendapatan FROM pendapatan_lain WHERE id_pegawai = ? AND LOWER(nama_pendapatan) = LOWER(?) AND DATE_FORMAT(date, '%Y-%m') = ?");
            $stmtCekPend->execute([$id_pegawai, $nama_pend, $periode]);
            $id_pend = $stmtCekPend->fetchColumn();

            if ($id_pend) {
                // Update
                $stmtUp = $db->prepare("UPDATE pendapatan_lain SET nominal = ?, kategori = ? WHERE id_pendapatan = ?");
                $stmtUp->execute([$nominal, $kategori, $id_pend]);
            } else {
                // Insert
                $stmtIns = $db->prepare("INSERT INTO pendapatan_lain (id_pegawai, nama_pendapatan, nominal, kategori, date) VALUES (?, ?, ?, ?, ?)");
                $stmtIns->execute([$id_pegawai, $nama_pend, $nominal, $kategori, $dateFilter]);
            }

            $berhasil++;
        } catch (Throwable $rowErr) {
             $gagal++;
             $errors[] = "Baris $rowNum: " . $rowErr->getMessage();
        }
    }

    $db->commit();
    $msg = "Import selesai! Berhasil: $berhasil";
    if ($gagal > 0) $msg .= ", Gagal: $gagal";
    
    ob_end_clean();
    echo json_encode(["status" => "success", "message" => $msg, "detail" => ["berhasil" => $berhasil, "gagal" => $gagal, "errors" => $errors]]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    ob_end_clean(); 
    if (!headers_sent()) { http_response_code(200); }
    echo json_encode(["status" => "error", "message" => "Import Gagal: " . $e->getMessage()]);
}
?>
