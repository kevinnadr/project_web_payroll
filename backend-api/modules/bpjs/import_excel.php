<?php
// FILE: backend-api/modules/bpjs/import_excel.php
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

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../vendor/autoload.php';

    if (!isset($_FILES['file_excel']) || $_FILES['file_excel']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("File wajib diupload atau file rusak.");
    }
    
    // Check if period is sent natively or via form data
    $periode = $_POST['periode'] ?? date('Y-m');

    $originalName = $_FILES['file_excel']['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    if ($ext === 'xlsx' && !extension_loaded('zip')) {
         throw new Exception("Server XAMPP Anda belum mengaktifkan ekstensi 'ZIP'. Simpan sebagai .xls.");
    }

    $file_tmp = $_FILES['file_excel']['tmp_name'];
    
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file_tmp);
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
        $clean = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $clean);
        $normalizedHeaders[$idx] = $clean;
    }

    $columnDefs = [
        'nik'        => ['nik', 'nomor induk', 'nip'],
        'nama'       => ['nama', 'nama lengkap'],
        'bpjs_tk'    => ['bpjs tk', 'bpjs_tk', 'bpjs ketenagakerjaan'],
        'bpjs_ks'    => ['bpjs ks', 'bpjs_ks', 'bpjs kesehatan'],
        'dasar_upah' => ['dasar upah', 'dasar_upah', 'upah dasar']
    ];

    $colMap = [];
    foreach ($normalizedHeaders as $idx => $headerName) {
        foreach ($columnDefs as $key => $aliases) {
            if (in_array($headerName, $aliases)) {
                $colMap[$key] = $idx;
                break;
            }
        }
    }

    if (!isset($colMap['nik'])) {
        throw new Exception("Format kolom tidak valid. Kolom NIK wajib ada.");
    }

    $berhasil = 0;
    $gagal = 0;
    $errors = [];
    
    $date = $periode . '-01';

    $db->beginTransaction();

    foreach ($rows as $idx => $row) {
        $rowNum = $idx + 2;
        
        $getVal = function($key, $default = 0) use ($row, $colMap) {
            if (isset($colMap[$key]) && isset($row[$colMap[$key]])) {
                $val = trim((string)$row[$colMap[$key]]);
                if ($val === '') return $default;
                return (float)preg_replace('/[^0-9.]/', '', $val);
            }
            return $default;
        };

        $nik = isset($colMap['nik']) && isset($row[$colMap['nik']]) ? trim((string)$row[$colMap['nik']]) : '';

        if (empty($nik)) {
            continue;
        }

        $bpjs_tk = $getVal('bpjs_tk');
        $bpjs_ks = $getVal('bpjs_ks');
        $dasar_upah = $getVal('dasar_upah');

        try {
            $stmtCek = $db->prepare("SELECT id_pegawai FROM pegawai WHERE nik = ?");
            $stmtCek->execute([$nik]);
            $id_pegawai = $stmtCek->fetchColumn();

            if (!$id_pegawai) {
                throw new Exception("NIK $nik tidak terdaftar.");
            }

            // Upsert riwayat_bpjs
            $stmtCheckBpjs = $db->prepare("SELECT id_bpjs FROM riwayat_bpjs WHERE id_pegawai = :id AND DATE_FORMAT(date, '%Y-%m') = :periode");
            $stmtCheckBpjs->execute([':id' => $id_pegawai, ':periode' => $periode]);
            
            $existing = $stmtCheckBpjs->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                $sql = "UPDATE riwayat_bpjs 
                        SET bpjs_tk = :tk, bpjs_ks = :ks, dasar_upah = :upah 
                        WHERE id_bpjs = :id_bpjs";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    ':tk' => $bpjs_tk,
                    ':ks' => $bpjs_ks,
                    ':upah' => $dasar_upah,
                    ':id_bpjs' => $existing['id_bpjs']
                ]);
            } else {
                $sql = "INSERT INTO riwayat_bpjs (id_pegawai, bpjs_tk, bpjs_ks, dasar_upah, date)
                        VALUES (:id, :tk, :ks, :upah, :date)";
                $stmt = $db->prepare($sql);
                $stmt->execute([
                    ':id' => $id_pegawai,
                    ':tk' => $bpjs_tk,
                    ':ks' => $bpjs_ks,
                    ':upah' => $dasar_upah,
                    ':date' => $date
                ]);
            }

            $berhasil++;
        } catch (Throwable $rowErr) {
             $gagal++;
             $errors[] = "Baris $rowNum: " . $rowErr->getMessage();
        }
    }

    $db->commit();
    
    ob_end_clean();
    
    echo json_encode([
        "status" => "success", 
        "message" => "Import selesai! Berhasil: $berhasil",
        "detail" => ["berhasil" => $berhasil, "gagal" => $gagal, "errors" => $errors]
    ]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    ob_end_clean(); 
    echo json_encode(["status" => "error", "message" => "Import Gagal: " . $e->getMessage()]);
}
?>
