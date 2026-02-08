<?php
// FILE: backend-api/modules/absensi/save.php
require_once '../../config/database.php';
require_once '../../config/cors.php';

// Agar error PHP tidak merusak JSON, matikan display errors
ini_set('display_errors', 0);
error_reporting(E_ALL);

$input = file_get_contents("php://input");
$data = json_decode($input);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Input data tidak valid/kosong"]);
    exit;
}

try {
    $db->beginTransaction();

    $id = $data->id ?? null; // ID Absensi
    $pegawai_id = $data->pegawai_id;
    $bulan = $data->bulan;
    
    // Konversi ke Integer (Aman dari null)
    $hadir = (int)($data->hadir ?? 0);
    $sakit = (int)($data->sakit ?? 0);
    $izin  = (int)($data->izin ?? 0);
    $cuti  = (int)($data->cuti ?? 0);
    $terlambat = (int)($data->terlambat ?? 0);
    $menit = (int)($data->menit_terlambat ?? 0);

    // 1. Simpan ke Tabel Absensi
    if (!empty($id)) {
        // UPDATE DATA
        $sql = "UPDATE absensi SET hadir=:h, sakit=:s, izin=:i, cuti=:c, terlambat=:t, `menit terlambat`=:m WHERE id=:id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, ':c'=>$cuti, ':t'=>$terlambat, ':m'=>$menit, ':id'=>$id]);
    } else {
        // INSERT DATA BARU
        // Cek duplikat dulu
        $cek = $db->prepare("SELECT id FROM absensi WHERE pegawai_id=? AND bulan=?");
        $cek->execute([$pegawai_id, $bulan]);
        if($cek->rowCount() > 0) {
            // Jika sudah ada, kita update saja (agar tidak error)
            $existing = $cek->fetch();
            $sql = "UPDATE absensi SET hadir=:h, sakit=:s, izin=:i, cuti=:c, terlambat=:t, `menit terlambat`=:m WHERE id=:id";
            $stmt = $db->prepare($sql);
            $stmt->execute([':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, ':c'=>$cuti, ':t'=>$terlambat, ':m'=>$menit, ':id'=>$existing['id']]);
        } else {
            $sql = "INSERT INTO absensi (pegawai_id, bulan, hadir, sakit, izin, cuti, terlambat, `menit terlambat`) VALUES (:pid, :bln, :h, :s, :i, :c, :t, :m)";
            $stmt = $db->prepare($sql);
            $stmt->execute([':pid'=>$pegawai_id, ':bln'=>$bulan, ':h'=>$hadir, ':s'=>$sakit, ':i'=>$izin, ':c'=>$cuti, ':t'=>$terlambat, ':m'=>$menit]);
        }
    }

    // 2. HITUNG OTOMATIS ALPHA
    // Ambil Hari Kerja Efektif Pegawai
    $stmtP = $db->prepare("SELECT hari_kerja_efektif FROM pegawai WHERE id = ?");
    $stmtP->execute([$pegawai_id]);
    $pegawai = $stmtP->fetch(PDO::FETCH_ASSOC);
    
    // FIX: Gunakan default 20 jika pegawai tidak ditemukan atau nilainya null
    $hari_efektif = ($pegawai && isset($pegawai['hari_kerja_efektif'])) ? (int)$pegawai['hari_kerja_efektif'] : 20; 
    
    $total_masuk = $hadir + $sakit + $izin + $cuti;
    $alpha = $hari_efektif - $total_masuk;
    if ($alpha < 0) $alpha = 0;

    // 3. UPDATE TABEL ALPHA (Pastikan tabel absensi_alpha sudah dibuat)
    try {
        $sqlAlpha = "INSERT INTO absensi_alpha (pegawai_id, bulan, jumlah_alpha) VALUES (:pid, :bln, :a)
                     ON DUPLICATE KEY UPDATE jumlah_alpha = :a";
        $db->prepare($sqlAlpha)->execute([':pid'=>$pegawai_id, ':bln'=>$bulan, ':a'=>$alpha]);
    } catch (Exception $e) {
        // Jika tabel alpha belum ada, jangan hentikan proses utama, tapi catat error (opsional)
        // Kita throw supaya user tau tabelnya kurang
        throw new Exception("Gagal update Alpha. Pastikan tabel 'absensi_alpha' sudah dibuat.");
    }

    $db->commit();
    echo json_encode(["status" => "success", "message" => "Data tersimpan. Alpha: $alpha hari"]);

} catch (Exception $e) {
    $db->rollBack();
    // Kirim pesan error asli ke frontend
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>