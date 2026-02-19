<?php
// FILE: backend-api/modules/master_gaji/save_komponen.php
// Save ONLY additional components for a contract, preserving Gaji Pokok and Tunjangan Tetap.

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["status" => "error", "message" => "Method not allowed"]); exit; }

require_once '../../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || empty($data['id_kontrak'])) { 
        http_response_code(400); 
        echo json_encode(["status" => "error", "message" => "Invalid Data / ID Kontrak missing"]); 
        exit; 
    }

    $id_kontrak = $data['id_kontrak'];
    $komponen_tambahan = $data['komponen_tambahan'] ?? []; // Array of {nama, nominal, tipe}

    $db->beginTransaction();

    // 1. Identify IDs for restricted components (Gaji Pokok, Tunjangan Tetap) to PROTECT them
    $stmtIds = $db->query("SELECT id_komponen FROM komponen_penghasilan WHERE nama_komponen IN ('Gaji Pokok', 'Tunjangan Tetap')");
    $protectedIds = $stmtIds->fetchAll(PDO::FETCH_COLUMN);
    
    // If we have protected IDs, exclude them from deletion
    if (!empty($protectedIds)) {
        $placeholders = implode(',', array_fill(0, count($protectedIds), '?'));
        // Delete ONLY non-protected components for this contract
        $sqlDelete = "DELETE FROM nominal_kontrak WHERE id_kontrak = ? AND id_komponen NOT IN ($placeholders)";
        $params = array_merge([$id_kontrak], $protectedIds);
        $stmtDelete = $db->prepare($sqlDelete);
        $stmtDelete->execute($params);
    } else {
        // Fallback: This shouldn't happen normally if DB is seeded, but if no protected comps exist, delete all.
        // Wait, if they don't exist, we can't protect them.
        $db->prepare("DELETE FROM nominal_kontrak WHERE id_kontrak = ?")->execute([$id_kontrak]);
    }

    // 2. Insert New Components
    // Helper: get or create komponen_penghasilan by name
    $getOrCreateKomponen = function($nama, $jenis = 'BULANAN') use ($db) {
        // Trim and normalize name
        $nama = trim($nama);
        if (empty($nama)) return null;

        $stmt = $db->prepare("SELECT id_komponen FROM komponen_penghasilan WHERE LOWER(nama_komponen) = LOWER(?) LIMIT 1");
        $stmt->execute([$nama]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row['id_komponen'];
        
        $db->prepare("INSERT INTO komponen_penghasilan (nama_komponen, jenis_komponen) VALUES (?, ?)")->execute([$nama, $jenis]);
        return $db->lastInsertId();
    };

    foreach ($komponen_tambahan as $komp) {
        $nama = $komp['nama'] ?? '';
        $nominal = (float)($komp['nominal'] ?? 0);
        $tipe = strtoupper($komp['tipe'] ?? 'BULANAN');

        // Skip if main components (just in case frontend sends them)
        if (in_array(strtolower($nama), ['gaji pokok', 'tunjangan tetap'])) continue;

        if ($nama && $nominal > 0) {
            $idKomp = $getOrCreateKomponen($nama, $tipe); // Use the correct TYPE passed from frontend
            if ($idKomp) {
                // Check if we need to update the component type if it already exists but differs?
                // For now, assume if it exists we use it, but creating new one uses correct type.
                
                $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)")
                   ->execute([$id_kontrak, $idKomp, $nominal]);
            }
        }
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Komponen tambahan berhasil disimpan!"]);

} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
