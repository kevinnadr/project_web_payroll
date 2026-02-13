<?php
// FILE: backend-api/migrate_data.php
require_once __DIR__ . '/config/database.php';

echo "MIGRATION STARTED...\n";

try {
    $db->beginTransaction();

    // 1. Cek data lama
    try {
        $checkOld = $db->query("SELECT COUNT(*) FROM data_pegawai");
        if (!$checkOld) throw new Exception("Table not found");
        $count = $checkOld->fetchColumn();
        if ($count == 0) throw new Exception("No data");
    } catch (Exception $e) {
        throw new Exception("Tabel data_pegawai tidak ditemukan atau kosong. " . $e->getMessage());
    }

    $oldPegawai = $db->query("SELECT * FROM data_pegawai")->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($oldPegawai) . " employees to migrate.\n";

    // Prepare statements
    $insPegawai = $db->prepare("INSERT INTO pegawai (nik, nama_lengkap, email, id_ptkp) VALUES (?, ?, ?, ?)");
    $insKontrak = $db->prepare("INSERT INTO kontrak_kerja (id_pegawai, no_kontrak, jabatan, jenis_kontrak, tanggal_mulai, tanggal_berakhir) VALUES (?, ?, ?, ?, ?, ?)");
    $getPtkpId = $db->prepare("SELECT id_ptkp FROM status_ptkp WHERE status_ptkp = ? LIMIT 1");
    $getKompId = $db->prepare("SELECT id_komponen FROM komponen_penghasilan WHERE nama_komponen = ? LIMIT 1");
    $insNominal = $db->prepare("INSERT INTO nominal_kontrak (id_kontrak, id_komponen, nominal) VALUES (?, ?, ?)");

    foreach ($oldPegawai as $p) {
        $nik = $p['nik'];
        
        // Cek duplikat
        $cek = $db->prepare("SELECT id_pegawai FROM pegawai WHERE nik = ?");
        $cek->execute([$nik]);
        if ($cek->rowCount() > 0) {
            echo "Skipping NIK $nik (exists)\n";
            continue;
        }

        // PTKP
        $ptkpStatus = $p['status_ptkp'] ?? 'TK/0';
        $getPtkpId->execute([$ptkpStatus]);
        $ptkpId = $getPtkpId->fetchColumn() ?: 1;

        // Insert Pegawai
        $insPegawai->execute([$nik, $p['nama_lengkap'], $p['email'], $ptkpId]);
        $newPegawaiId = $db->lastInsertId();

        // Insert Kontrak (Default dates if missing)
        $tglMasuk = !empty($p['tanggal_masuk']) ? $p['tanggal_masuk'] : date('Y-m-d');
        $jabatan = !empty($p['jabatan']) ? $p['jabatan'] : 'Staff';
        $jenisKontrak = !empty($p['jenis_kontrak']) ? $p['jenis_kontrak'] : 'TETAP';
        $noKontrak = "NK/" . $newPegawaiId . "/" . date('Y') . "-" . rand(1000, 9999);

        $insKontrak->execute([$newPegawaiId, $noKontrak, $jabatan, $jenisKontrak, $tglMasuk, null]);
        $newKontrakId = $db->lastInsertId();

        // Migrate Gaji
        $oldGajiStmt = $db->prepare("SELECT * FROM komponen_gaji WHERE pegawai_id = ?");
        $oldGajiStmt->execute([$p['id']]);
        $gaji = $oldGajiStmt->fetch(PDO::FETCH_ASSOC);

        if ($gaji) {
            $maps = [
                'gaji_pokok' => 'Gaji Pokok',
                'tunjangan_jabatan' => 'Tunjangan Jabatan',
                'tunjangan_transport' => 'Tunjangan Transport',
                'tunjangan_makan' => 'Uang Makan'
            ];

            foreach ($maps as $dbCol => $kompName) {
                if (!empty($gaji[$dbCol]) && $gaji[$dbCol] > 0) {
                    $getKompId->execute([$kompName]);
                    $kId = $getKompId->fetchColumn();
                    if ($kId) $insNominal->execute([$newKontrakId, $kId, $gaji[$dbCol]]);
                }
            }
        }
        echo "Migrated: {$p['nama_lengkap']}\n";
    }

    $db->commit();
    echo "SUCCESS!\n";

} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
