<?php
/**
 * FILE: backend-api/modules/master_gaji/read_kontrak.php
 * Fetch all employees with contracts and komponen penghasilan
 * Uses pegawai table as source
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

require_once '../../config/database.php';

try {
    $bulanFilter = $_GET['bulan'] ?? date('Y-m'); // Default current month YYYY-MM

    // Main query: pegawai + kontrak
    $sql = "SELECT 
                p.id_pegawai,
                p.nik,
                p.nama_lengkap,
                COALESCE(sp_k.status_ptkp, sp_p.status_ptkp) as status_ptkp,
                k.id_kontrak,
                k.no_kontrak,
                k.jabatan,
                k.tanggal_mulai,
                k.tanggal_berakhir,
                k.jenis_kontrak
            FROM pegawai p
            LEFT JOIN status_ptkp sp_p ON p.id_ptkp = sp_p.id_ptkp
            LEFT JOIN kontrak_kerja k ON p.id_pegawai = k.id_pegawai
            LEFT JOIN status_ptkp sp_k ON k.id_ptkp = sp_k.id_ptkp
            ORDER BY p.nik ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch komponen per kontrak (Gaji Pokok, Uang Makan, etc.)
    $stmtKomp = $db->prepare(
        "SELECT kp.nama_komponen as nama, kp.jenis_komponen as tipe, nk.nominal
         FROM nominal_kontrak nk
         JOIN komponen_penghasilan kp ON nk.id_komponen = kp.id_komponen
         WHERE nk.id_kontrak = ?
         ORDER BY kp.nama_komponen"
    );

    // Fetch BPJS for specific month
    $stmtBpjs = $db->prepare(
        "SELECT bpjs_tk, bpjs_ks 
         FROM riwayat_bpjs 
         WHERE id_pegawai = ? AND DATE_FORMAT(date, '%Y-%m') = ? 
         LIMIT 1"
    );

    // Fallback BPJS (latest before month)
    $stmtBpjsFallback = $db->prepare(
        "SELECT bpjs_tk, bpjs_ks 
         FROM riwayat_bpjs 
         WHERE id_pegawai = ? 
         ORDER BY date DESC 
         LIMIT 1"
    );

    // Fetch Hari Efektif from Absensi
    $stmtAbsensi = $db->prepare("
        SELECT COALESCE(MAX(hari_efektif), 0) as hari_efektif
        FROM absensi 
        WHERE id_pegawai = ? AND date LIKE ?
    ");

    foreach ($data as &$row) {
        $komponen = [];
        $gajiPokok = 0;
        
        if (!empty($row['id_kontrak'])) {
            $stmtKomp->execute([$row['id_kontrak']]);
            $komponenRaw = $stmtKomp->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($komponenRaw as $k) {
                $nominal = (float)$k['nominal'];
                if (strtolower($k['nama']) === 'gaji pokok') {
                    $gajiPokok = $nominal;
                } else {
                    $komponen[] = [
                        'nama' => $k['nama'],
                        'tipe' => strtolower($k['tipe']),
                        'nominal' => $nominal
                    ];
                }
            }
        }
        
        $row['gaji_pokok'] = $gajiPokok;
        $row['komponen_tambahan'] = json_encode($komponen);

        // BPJS
        $stmtBpjs->execute([$row['id_pegawai'], $bulanFilter]);
        $bpjs = $stmtBpjs->fetch(PDO::FETCH_ASSOC);
        
        if (!$bpjs) {
             $stmtBpjsFallback->execute([$row['id_pegawai']]);
             $bpjs = $stmtBpjsFallback->fetch(PDO::FETCH_ASSOC);
        }

        $row['bpjs_tk'] = $bpjs ? (float)$bpjs['bpjs_tk'] : 0;
        $row['bpjs_ks'] = $bpjs ? (float)$bpjs['bpjs_ks'] : 0;

        // Working Days (Hari Efektif)
        $stmtAbsensi->execute([$row['id_pegawai'], $bulanFilter . '%']);
        $abs = $stmtAbsensi->fetch(PDO::FETCH_ASSOC);
        // If Absensi has explicit 'hari_efektif', use it. Else default 22.
        $row['hari_kerja_efektif'] = ($abs && $abs['hari_efektif'] > 0) ? (int)$abs['hari_efektif'] : 22;
    }

    echo json_encode([
        "status" => "success",
        "data" => $data
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
