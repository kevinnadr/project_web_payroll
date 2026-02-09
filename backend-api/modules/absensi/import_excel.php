<?php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$input = json_decode(file_get_contents("php://input"), true);
$bulan = $input['bulan'] ?? null;
$data = $input['data'] ?? [];

// Harus ada bulan dan data
if (!$bulan || empty($data)) {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
    exit;
}

// Validasi header/kolom yang diharapkan
$expected = ['nik','hadir','sakit','izin','cuti','alpha','telat_x','telat_m'];
$firstRow = $data[0] ?? null;
if (!is_array($firstRow)) {
    echo json_encode(["status" => "error", "message" => "Format data tidak sesuai (baris pertama tidak valid)."]);
    exit;
}

// normalize keys from first row
$firstKeys = array_map(function($k){ return strtolower(trim($k)); }, array_keys($firstRow));

$missing = array_values(array_diff($expected, $firstKeys));
$extra = array_values(array_diff($firstKeys, $expected));
if (!empty($missing) || !empty($extra)) {
    $msg = "Header kolom tidak sesuai.";
    if (!empty($missing)) $msg .= " Missing: " . implode(', ', $missing) . ".";
    if (!empty($extra)) $msg .= " Extra: " . implode(', ', $extra) . ".";
    echo json_encode(["status" => "error", "message" => $msg]);
    exit;
}

// Validasi setiap baris: tipe data dan keberadaan kolom
$errors = [];
foreach ($data as $idx => $row) {
    $rowNum = $idx + 1;
    // Ensure row is array
    if (!is_array($row)) { $errors[] = "Baris {$rowNum} tidak valid."; continue; }

    // Normalize keys for lookup
    $normRow = [];
    foreach ($row as $k => $v) { $normRow[strtolower(trim($k))] = $v; }

    // cek nik
    if (!isset($normRow['nik']) || trim((string)$normRow['nik']) === '') {
        $errors[] = "Baris {$rowNum}: kolom 'nik' kosong.";
        continue;
    }

    // cek numeric fields
    foreach (['hadir','sakit','izin','cuti','alpha','telat_x','telat_m'] as $numcol) {
        if (!isset($normRow[$numcol]) || $normRow[$numcol] === '') {
            $errors[] = "Baris {$rowNum}: kolom '{$numcol}' kosong.";
            continue;
        }
        if (!is_numeric($normRow[$numcol])) {
            $errors[] = "Baris {$rowNum}: kolom '{$numcol}' harus berupa angka.";
        } else {
            // optional: cek nilai negatif
            if ((float)$normRow[$numcol] < 0) $errors[] = "Baris {$rowNum}: kolom '{$numcol}' tidak boleh negatif.";
        }
    }
}

if (!empty($errors)) {
    echo json_encode(["status" => "error", "message" => "Validasi gagal.", "errors" => $errors]);
    exit;
}

try {
    $db->beginTransaction();

    // Query untuk mencocokkan NIK ke pegawai_id dan update/insert absensi
    $sql = "INSERT INTO data_absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, alpha, telat_x, telat_m)
            SELECT id, ?, ?, ?, ?, ?, ?, ?, ? FROM data_pegawai WHERE nik = ?
            ON DUPLICATE KEY UPDATE 
                hadir = VALUES(hadir), sakit = VALUES(sakit), izin = VALUES(izin), 
                cuti = VALUES(cuti), alpha = VALUES(alpha), 
                telat_x = VALUES(telat_x), telat_m = VALUES(telat_m)";

    $stmt = $db->prepare($sql);

    foreach ($data as $rowOrig) {
        // normalize keys to lowercase as validated above
        $row = [];
        foreach ($rowOrig as $k => $v) { $row[strtolower(trim($k))] = $v; }

        $stmt->execute([
            $bulan,
            (int)$row['hadir'], (int)$row['sakit'], (int)$row['izin'], 
            (int)$row['cuti'], (int)$row['alpha'], (int)$row['telat_x'], (int)$row['telat_m'], 
            $row['nik']
        ]);
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Berhasil mengimpor " . count($data) . " data"]);
} catch (Exception $e) {
    $db->rollBack();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}