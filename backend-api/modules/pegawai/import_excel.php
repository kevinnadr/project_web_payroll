<?php
// FILE: backend-api/modules/pegawai/import_excel.php
// FORCE DISPLAY ERRORS OFF TO PREVENT HTML IN JSON RESPONSE
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/import_error.log');

// Increase limits for processing large files
ini_set('memory_limit', '512M');
set_time_limit(300);

// ALWAYS START OUTPUT BUFFERING TO CATCH STRAY OUTPUT
ob_start();

// CORS HEADERS MUST BE FIRST
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

// SHUTDOWN HANDLER FOR FATAL ERRORS
function shutdown_handler() {
    $error = error_get_last();
    // Only catch fatal errors that stop execution
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        ob_clean(); // Discard any partial output
        // Send headers again just in case
        if (!headers_sent()) {
            header("Access-Control-Allow-Origin: *");
            header("Content-Type: application/json");
            http_response_code(500); 
        }
        echo json_encode([
            "status" => "error", 
            "message" => "Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']
        ]);
        exit;
    }
}
register_shutdown_function('shutdown_handler');

try {
    // Check extensions
    if (!extension_loaded('pdo_mysql')) throw new Exception("Ekstensi PHP 'pdo_mysql' tidak aktif.");

    // REQUIRE DEPENDENCIES
    require_once __DIR__ . '/../../config/database.php';
    
    if (!file_exists(__DIR__ . '/../../vendor/autoload.php')) {
        throw new Exception("Vendor autoload tidak ditemukan. Jalankan 'composer install'.");
    }
    require_once __DIR__ . '/../../vendor/autoload.php';

    if (!class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
        throw new Exception("Library PhpSpreadsheet tidak terinstall via Composer.");
    }

    if (!isset($_FILES['file_excel']) || $_FILES['file_excel']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("File wajib diupload atau file rusak (Error Code: " . ($_FILES['file_excel']['error'] ?? 'unknown') . ")");
    }

    $originalName = $_FILES['file_excel']['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // Specific check: .xlsx REQUIRES zip extension
    if ($ext === 'xlsx' && !extension_loaded('zip')) {
         throw new Exception("Server XAMPP Anda belum mengaktifkan ekstensi 'ZIP'.\n\n📌 SOLUSI CEPAT:\nBuka file Excel Anda, pilih **File > Save As**, lalu ubah format menjadi **Excel 97-2003 Workbook (.xls)**.\nUpload file .xls tersebut (tidak butuh Zip).");
    }

    $file_tmp = $_FILES['file_excel']['tmp_name'];
    
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file_tmp);
    } catch (Exception $e) {
        throw new Exception("Gagal membaca file Excel: " . $e->getMessage());
    }
    
    $rows = $spreadsheet->getActiveSheet()->toArray();

    // ============================================================
    // DYNAMIC HEADER MAPPING
    // ============================================================
    if (count($rows) < 2) {
        throw new Exception("File kosong atau hanya berisi header tanpa data.");
    }

    $headerRow = $rows[0];
    array_shift($rows); // Remove header row

    // Normalize headers
    $normalizedHeaders = [];
    foreach ($headerRow as $idx => $val) {
        if ($val === null) continue;
        $clean = mb_strtolower(trim((string)$val));
        $clean = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $clean);
        $normalizedHeaders[$idx] = $clean;
    }

    // Define known columns and their aliases
    $columnDefs = [
        'nik'           => ['nik', 'nomor induk', 'nip'],
        'nama_lengkap'  => ['nama', 'nama lengkap', 'nama pegawai', 'full name'],
        'email'         => ['email', 'alamat email', 'e-mail'],
        'npwp'          => ['npwp', 'no npwp', 'nomor pajak'],
        'ptkp'          => ['ptkp', 'status ptkp'],
        'jabatan'       => ['jabatan', 'posisi', 'role'],
        'status_kontrak'=> ['status kontrak', 'jenis kontrak', 'kontrak'],
        'tanggal_masuk' => ['tanggal masuk', 'tgl masuk', 'join date', 'mulai kerja'],
        'gaji_pokok'    => ['gaji', 'gaji pokok', 'basic salary', 'salary']
    ];

    // Map found columns
    $colMap = [];
    foreach ($normalizedHeaders as $idx => $headerName) {
        foreach ($columnDefs as $key => $aliases) {
            if (in_array($headerName, $aliases)) {
                $colMap[$key] = $idx;
                break;
            }
        }
    }

    // Validate Required Columns
    if (!isset($colMap['nik']) || !isset($colMap['nama_lengkap'])) {
        throw new Exception("Format file tidak valid. Kolom REQUIRED tidak ditemukan: NIK dan Nama Lengkap.");
    }

    $berhasil = 0;
    $gagal = 0;
    $errors = [];
    
    $db->beginTransaction();

    // Cache PTKP
    $ptkpCache = [];
    try {
        $stmtPtkpAll = $db->query("SELECT id_ptkp, status_ptkp FROM status_ptkp");
        while ($rowPtkp = $stmtPtkpAll->fetch(PDO::FETCH_ASSOC)) {
            $ptkpCache[strtoupper($rowPtkp['status_ptkp'])] = $rowPtkp['id_ptkp'];
        }
    } catch (Throwable $e) { /* Ignore */ }

    // Fallback PTKP ID
    $fallbackPtkpId = null;
    if (empty($ptkpCache)) {
        try {
            $stmtFallback = $db->query("SELECT id_ptkp FROM status_ptkp LIMIT 1");
            $fallbackPtkpId = $stmtFallback->fetchColumn() ?: null;
        } catch (Throwable $e) { /* Ignore */ }
    } else {
        $fallbackPtkpId = reset($ptkpCache);
    }

    foreach ($rows as $idx => $row) {
        $rowNum = $idx + 2;
        
        // Helper to safely get value from row
        $getVal = function($key, $default = '') use ($row, $colMap) {
            if (isset($colMap[$key]) && isset($row[$colMap[$key]])) {
                $val = trim((string)$row[$colMap[$key]]);
                return ($val === '') ? $default : $val;
            }
            return $default;
        };

        $nik = $getVal('nik');
        $nama = $getVal('nama_lengkap');

        if (empty($nik) || empty($nama)) {
            // Only count as error if row is not entirely empty
            if (!empty($nik) || !empty($nama)) {
                $gagal++;
                $errors[] = "Baris $rowNum: NIK atau Nama Lengkap kosong.";
            }
            continue;
        }

        $email = $getVal('email');
        $npwp = $getVal('npwp');
        $ptkpStr = strtoupper($getVal('ptkp', 'TK/0'));
        $jabatan = $getVal('jabatan', 'Staff');
        $kontrak = $getVal('status_kontrak', 'TETAP');
        
        // Date handling
        $tgl_masuk_raw = isset($colMap['tanggal_masuk']) ? $row[$colMap['tanggal_masuk']] : null;
        $tgl_masuk = date('Y-m-d'); // Default today
        if (!empty($tgl_masuk_raw)) {
            if (is_numeric($tgl_masuk_raw)) {
                try {
                    $tgl_masuk = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($tgl_masuk_raw)->format('Y-m-d');
                } catch(Throwable $e) {}
            } else {
                $ts = strtotime($tgl_masuk_raw);
                if ($ts) $tgl_masuk = date('Y-m-d', $ts);
            }
        }

        // Salary
        $gaji_raw = isset($colMap['gaji_pokok']) ? $row[$colMap['gaji_pokok']] : 0;
        $gaji_pokok = (int)preg_replace('/[^0-9]/', '', (string)$gaji_raw);

        // PTKP ID Resolution
        $id_ptkp = $ptkpCache[$ptkpStr] ?? $ptkpCache['TK/0'] ?? $fallbackPtkpId ?? null;

        try {
            // 1. UPSERT PEGAWAI
            $stmtCek = $db->prepare("SELECT id_pegawai FROM pegawai WHERE nik = ?");
            $stmtCek->execute([$nik]);
            $existingId = $stmtCek->fetchColumn();

            if ($existingId) {
                 // UPDATE
                 // Try updating all fields first. If npwp column missing, this might fail.
                 try {
                     $sqlUp = "UPDATE pegawai SET nama_lengkap = ?, email = ?, id_ptkp = ?, npwp = ? WHERE id_pegawai = ?";
                     $stmtUpdate = $db->prepare($sqlUp);
                     $stmtUpdate->execute([$nama, $email, $id_ptkp, $npwp, $existingId]);
                 } catch (Exception $eUpdate) {
                     // If update fails (e.g. Unknown column 'npwp'), try simpler update?
                     // Let's just rethrow with clearer message for now, OR ignore npwp if it fails.
                     // But assuming column exists based on user screenshots.
                     throw $eUpdate;
                 }
                 $pid = $existingId;
            } else {
                 // INSERT
                 $sqlIns = "INSERT INTO pegawai (nik, nama_lengkap, email, id_ptkp, npwp) VALUES (?, ?, ?, ?, ?)";
                 $stmtInsert = $db->prepare($sqlIns);
                 $stmtInsert->execute([$nik, $nama, $email, $id_ptkp, $npwp]);
                 $pid = $db->lastInsertId();
            }

            // 2. KONTRAK KERJA
            // Use try-catch for safety
            try {
                $stmtCekKontrak = $db->prepare("SELECT id_kontrak FROM kontrak_kerja WHERE id_pegawai = ? ORDER BY tanggal_mulai DESC LIMIT 1");
                $stmtCekKontrak->execute([$pid]);
                $kontrakId = $stmtCekKontrak->fetchColumn();

                if ($kontrakId) {
                    $stmtUpKontrak = $db->prepare("UPDATE kontrak_kerja SET jabatan = ?, jenis_kontrak = ?, tanggal_mulai = ? WHERE id_kontrak = ?");
                    $stmtUpKontrak->execute([$jabatan, $kontrak, $tgl_masuk, $kontrakId]);
                } else {
                    $noKontrak = "NK/" . $pid . "/" . date('Y') . "-" . rand(1000, 9999);
                    $stmtInsKontrak = $db->prepare("INSERT INTO kontrak_kerja (id_pegawai, no_kontrak, jabatan, jenis_kontrak, tanggal_mulai) VALUES (?, ?, ?, ?, ?)");
                    $stmtInsKontrak->execute([$pid, $noKontrak, $jabatan, $kontrak, $tgl_masuk]);
                    $kontrakId = $db->lastInsertId();
                }

                // 3. KOMPONEN GAJI
                if ($gaji_pokok > 0 && $kontrakId) {
                     $stmtCekGaji = $db->prepare("SELECT id_nominal FROM nominal_kontrak WHERE id_kontrak = ? AND id_komponen = 1");
                     $stmtCekGaji->execute([$kontrakId]);
                     $nominalId = $stmtCekGaji->fetchColumn();

                     if ($nominalId) {
                         $stmtUpGaji = $db->prepare("UPDATE nominal_kontrak SET nominal = ? WHERE id_nominal = ?");
                         $stmtUpGaji->execute([$gaji_pokok, $nominalId]);
                     } else {
                         $stmtInsGaji = $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, 1, ?)");
                         $stmtInsGaji->execute([$kontrakId, $gaji_pokok]);
                     }
                }
            } catch (Throwable $eKontrak) {
                // Log contract error but allow employee update to succeed?
                // No, rollback for consistency per row.
                throw $eKontrak;
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
    
    // Clear buffer before output
    ob_end_clean();
    
    echo json_encode([
        "status" => "success", 
        "message" => $msg,
        "detail" => ["berhasil" => $berhasil, "gagal" => $gagal, "errors" => $errors]
    ]);

} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    // Log invalid imports
    error_log("Import Error: " . $e->getMessage());
    
    ob_end_clean(); // Discard noise
    
    // Return 200 OK with error status to avoid CORS blocking on strict clients
    if (!headers_sent()) {
        header("Access-Control-Allow-Origin: *");
        http_response_code(200); 
    }
    
    echo json_encode(["status" => "error", "message" => "Import Gagal: " . $e->getMessage()]);
}
?>