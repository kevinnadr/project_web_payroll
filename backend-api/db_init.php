<?php
// FILE: backend-api/db_init.php
// Auto-creates tables if they don't exist (matches required schema)
require_once 'config/database.php';

try {
    // 1. STATUS PTKP
    $db->exec("CREATE TABLE IF NOT EXISTS status_ptkp (
        id_ptkp BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        status_ptkp VARCHAR(10) NOT NULL,
        kategori_ter VARCHAR(5) DEFAULT NULL,
        INDEX idx_kategori_ter (kategori_ter)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 2. PPH TER
    $db->exec("CREATE TABLE IF NOT EXISTS pph_ter (
        id_ter BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        kategori_ter VARCHAR(5) NOT NULL,
        penghasilan_min DECIMAL(15,2) DEFAULT 0,
        penghasilan_max DECIMAL(15,2) DEFAULT 0,
        tarif_persen DECIMAL(5,2) DEFAULT 0,
        INDEX idx_kategori_ter (kategori_ter)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 3. PEGAWAI
    $db->exec("CREATE TABLE IF NOT EXISTS pegawai (
        id_pegawai BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(20) NOT NULL,
        nama_lengkap VARCHAR(100) NOT NULL,
        email VARCHAR(100) DEFAULT NULL,
        npwp VARCHAR(30) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        id_ptkp BIGINT UNSIGNED DEFAULT NULL,
        INDEX idx_nik (nik),
        INDEX idx_id_ptkp (id_ptkp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 4. KONTRAK KERJA
    $db->exec("CREATE TABLE IF NOT EXISTS kontrak_kerja (
        id_kontrak BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_pegawai BIGINT UNSIGNED NOT NULL,
        no_kontrak VARCHAR(50) DEFAULT NULL,
        jabatan VARCHAR(100) DEFAULT NULL,
        tanggal_mulai DATE DEFAULT NULL,
        tanggal_berakhir DATE DEFAULT NULL,
        jenis_kontrak ENUM('TETAP','TIDAK TETAP','LEPAS','PART TIME') DEFAULT 'TETAP',
        INDEX idx_id_pegawai (id_pegawai)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 5. KOMPONEN PENGHASILAN
    $db->exec("CREATE TABLE IF NOT EXISTS komponen_penghasilan (
        id_komponen BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nama_komponen VARCHAR(100) NOT NULL,
        jenis_komponen ENUM('HARIAN','BULANAN') DEFAULT 'BULANAN'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 6. NOMINAL KONTRAK
    $db->exec("CREATE TABLE IF NOT EXISTS nominal_kontrak (
        id_nominal BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nominal DECIMAL(15,2) DEFAULT 0,
        id_kontrak BIGINT UNSIGNED NOT NULL,
        id_komponen BIGINT UNSIGNED NOT NULL,
        INDEX idx_id_kontrak (id_kontrak),
        INDEX idx_id_komponen (id_komponen)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 7. ABSENSI
    $db->exec("CREATE TABLE IF NOT EXISTS absensi (
        id_absensi BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_pegawai BIGINT UNSIGNED NOT NULL,
        hari_efektif INT DEFAULT 0,
        hadir INT DEFAULT 0,
        izin INT DEFAULT 0,
        sakit INT DEFAULT 0,
        cuti INT DEFAULT 0,
        hari_terlambat INT DEFAULT 0,
        menit_terlambat INT DEFAULT 0,
        date DATE NOT NULL,
        INDEX idx_id_pegawai (id_pegawai),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 8. RIWAYAT BPJS
    $db->exec("CREATE TABLE IF NOT EXISTS riwayat_bpjs (
        id_bpjs BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_pegawai BIGINT UNSIGNED NOT NULL,
        dasar_upah DECIMAL(15,2) DEFAULT 0,
        bpjs_ks DECIMAL(15,2) DEFAULT 0,
        bpjs_tk DECIMAL(15,2) DEFAULT 0,
        date DATE NOT NULL,
        INDEX idx_id_pegawai (id_pegawai)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 9. ALPHA
    $db->exec("CREATE TABLE IF NOT EXISTS alpha (
        id_alpha BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        denda_per_hari DECIMAL(15,2) DEFAULT 0,
        keterangan VARCHAR(200) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 10. SLIP GAJI
    $db->exec("CREATE TABLE IF NOT EXISTS slip_gaji (
        id_slip BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_pegawai BIGINT UNSIGNED NOT NULL,
        id_kontrak BIGINT UNSIGNED DEFAULT NULL,
        date DATE NOT NULL,
        INDEX idx_id_pegawai (id_pegawai),
        INDEX idx_id_kontrak (id_kontrak),
        INDEX idx_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 11. PENDAPATAN LAIN
    $db->exec("CREATE TABLE IF NOT EXISTS pendapatan_lain (
        id_pendapatan BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_pegawai BIGINT UNSIGNED NOT NULL,
        id_slip BIGINT UNSIGNED DEFAULT NULL,
        nama_pendapatan VARCHAR(100) NOT NULL,
        nominal DECIMAL(15,2) DEFAULT 0,
        kategori VARCHAR(50) DEFAULT NULL,
        date DATE DEFAULT NULL,
        INDEX idx_id_pegawai (id_pegawai),
        INDEX idx_id_slip (id_slip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 12. NOMINAL SLIP
    $db->exec("CREATE TABLE IF NOT EXISTS nominal_slip (
        id_nominal_slip BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_slip BIGINT UNSIGNED NOT NULL,
        nama_komponen VARCHAR(100) NOT NULL,
        nominal DECIMAL(15,2) DEFAULT 0,
        INDEX idx_id_slip (id_slip)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 13. USERS
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id_user BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nama_lengkap VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 14. RESET PASSWORD
    $db->exec("CREATE TABLE IF NOT EXISTS reset_password (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        token VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    echo json_encode(["status" => "success", "message" => "Semua tabel sudah siap!"]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
