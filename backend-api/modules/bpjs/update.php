<?php
// FILE: backend-api/modules/bpjs/update.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

$data = json_decode(file_get_contents("php://input"));

if (empty($data->id_pegawai)) {
    echo json_encode(["status" => "error", "message" => "ID Pegawai Invalid"]);
    exit;
}

try {
    // Check for active contract first, then latest
    $sqlContract = "SELECT id_kontrak FROM kontrak_kerja WHERE id_pegawai = ? ORDER BY (tanggal_berakhir IS NULL) DESC, tanggal_mulai DESC LIMIT 1";
    $cek = $db->prepare($sqlContract);
    $cek->execute([$data->id_pegawai]);
    $contract = $cek->fetch(PDO::FETCH_ASSOC);
    
    if ($contract) {
        $id_kontrak = $contract['id_kontrak'];
        
        // Update specific contract
        $sql = "UPDATE kontrak_kerja SET 
                bpjs_tk = :tk, 
                bpjs_ks = :ks, 
                dasar_upah = :upah 
                WHERE id_kontrak = :id_kontrak";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':tk'   => $data->bpjs_tk ?? 0,
            ':ks'   => $data->bpjs_ks ?? 0,
            ':upah' => $data->dasar_upah ?? 0,
            ':id_kontrak' => $id_kontrak
        ]);
        
        echo json_encode(["status" => "success", "message" => "Data BPJS Updated!"]);
    } else {
        // If no contract found, maybe create a placeholder contract or just return error
        // Typically every employee should have a contract record.
        // For now, let's create a dummy contract entry if missing or return error.
        // Assuming every employee has a contract created upon registration.
        echo json_encode(["status" => "error", "message" => "Kontrak Kerja not found for this employee."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Error: " . $e->getMessage()]);
}
?>
