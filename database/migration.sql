-- ============================================================
-- DATABASE SCHEMA: Web Payroll System
-- Primary Key: BIGINT UNSIGNED AUTO_INCREMENT
-- Foreign Key: Indexed
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. STATUS PTKP (harus dibuat duluan karena direferensikan oleh pegawai)
DROP TABLE IF EXISTS status_ptkp;
CREATE TABLE status_ptkp (
    id_ptkp BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status_ptkp VARCHAR(10) NOT NULL,
    kategori_ter VARCHAR(5) DEFAULT NULL,
    INDEX idx_kategori_ter (kategori_ter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. PPH TER
DROP TABLE IF EXISTS pph_ter;
CREATE TABLE pph_ter (
    id_ter BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    kategori_ter VARCHAR(5) NOT NULL,
    penghasilan_min DECIMAL(15,2) DEFAULT 0,
    penghasilan_max DECIMAL(15,2) DEFAULT 0,
    tarif_persen DECIMAL(5,2) DEFAULT 0,
    INDEX idx_kategori_ter (kategori_ter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. PEGAWAI (tabel utama karyawan)
DROP TABLE IF EXISTS pegawai;
CREATE TABLE pegawai (
    id_pegawai BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nik VARCHAR(20) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    npwp VARCHAR(30) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_ptkp BIGINT UNSIGNED DEFAULT NULL,
    INDEX idx_nik (nik),
    INDEX idx_id_ptkp (id_ptkp),
    CONSTRAINT fk_pegawai_ptkp FOREIGN KEY (id_ptkp) REFERENCES status_ptkp(id_ptkp) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. KONTRAK KERJA
DROP TABLE IF EXISTS kontrak_kerja;
CREATE TABLE kontrak_kerja (
    id_kontrak BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pegawai BIGINT UNSIGNED NOT NULL,
    no_kontrak VARCHAR(50) DEFAULT NULL,
    jabatan VARCHAR(100) DEFAULT NULL,
    tanggal_mulai DATE DEFAULT NULL,
    tanggal_berakhir DATE DEFAULT NULL,
    jenis_kontrak ENUM('TETAP','TIDAK TETAP','LEPAS','PART TIME') DEFAULT 'TETAP',
    INDEX idx_id_pegawai (id_pegawai),
    CONSTRAINT fk_kontrak_pegawai FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. KOMPONEN PENGHASILAN (definisi komponen: Gaji Pokok, Uang Makan, dll)
DROP TABLE IF EXISTS komponen_penghasilan;
CREATE TABLE komponen_penghasilan (
    id_komponen BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_komponen VARCHAR(100) NOT NULL,
    jenis_komponen ENUM('HARIAN','BULANAN') DEFAULT 'BULANAN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. NOMINAL KONTRAK (pivot: komponen per kontrak)
DROP TABLE IF EXISTS nominal_kontrak;
CREATE TABLE nominal_kontrak (
    id_nominal BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nominal DECIMAL(15,2) DEFAULT 0,
    id_kontrak BIGINT UNSIGNED NOT NULL,
    id_komponen BIGINT UNSIGNED NOT NULL,
    INDEX idx_id_kontrak (id_kontrak),
    INDEX idx_id_komponen (id_komponen),
    CONSTRAINT fk_nominal_kontrak FOREIGN KEY (id_kontrak) REFERENCES kontrak_kerja(id_kontrak) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nominal_komponen FOREIGN KEY (id_komponen) REFERENCES komponen_penghasilan(id_komponen) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. ABSENSI
DROP TABLE IF EXISTS absensi;
CREATE TABLE absensi (
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
    INDEX idx_date (date),
    CONSTRAINT fk_absensi_pegawai FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. RIWAYAT BPJS
DROP TABLE IF EXISTS riwayat_bpjs;
CREATE TABLE riwayat_bpjs (
    id_bpjs BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pegawai BIGINT UNSIGNED NOT NULL,
    dasar_upah DECIMAL(15,2) DEFAULT 0,
    bpjs_ks DECIMAL(15,2) DEFAULT 0,
    bpjs_tk DECIMAL(15,2) DEFAULT 0,
    date DATE NOT NULL,
    INDEX idx_id_pegawai (id_pegawai),
    CONSTRAINT fk_bpjs_pegawai FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. ALPHA (denda alpha - data tetap)
DROP TABLE IF EXISTS alpha;
CREATE TABLE alpha (
    id_alpha BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    denda_per_hari DECIMAL(15,2) DEFAULT 0,
    keterangan VARCHAR(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. SLIP GAJI
DROP TABLE IF EXISTS slip_gaji;
CREATE TABLE slip_gaji (
    id_slip BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pegawai BIGINT UNSIGNED NOT NULL,
    id_kontrak BIGINT UNSIGNED DEFAULT NULL,
    date DATE NOT NULL,
    INDEX idx_id_pegawai (id_pegawai),
    INDEX idx_id_kontrak (id_kontrak),
    INDEX idx_date (date),
    CONSTRAINT fk_slip_pegawai FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_slip_kontrak FOREIGN KEY (id_kontrak) REFERENCES kontrak_kerja(id_kontrak) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. PENDAPATAN LAIN
DROP TABLE IF EXISTS pendapatan_lain;
CREATE TABLE pendapatan_lain (
    id_pendapatan BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pegawai BIGINT UNSIGNED NOT NULL,
    id_slip BIGINT UNSIGNED DEFAULT NULL,
    nama_pendapatan VARCHAR(100) NOT NULL,
    nominal DECIMAL(15,2) DEFAULT 0,
    kategori VARCHAR(50) DEFAULT NULL,
    date DATE DEFAULT NULL,
    INDEX idx_id_pegawai (id_pegawai),
    INDEX idx_id_slip (id_slip),
    CONSTRAINT fk_pendapatan_pegawai FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_pendapatan_slip FOREIGN KEY (id_slip) REFERENCES slip_gaji(id_slip) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. NOMINAL SLIP
DROP TABLE IF EXISTS nominal_slip;
CREATE TABLE nominal_slip (
    id_nominal_slip BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_slip BIGINT UNSIGNED NOT NULL,
    nama_komponen VARCHAR(100) NOT NULL,
    nominal DECIMAL(15,2) DEFAULT 0,
    INDEX idx_id_slip (id_slip),
    CONSTRAINT fk_nomslip_slip FOREIGN KEY (id_slip) REFERENCES slip_gaji(id_slip) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. USERS
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id_user BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. RESET PASSWORD
DROP TABLE IF EXISTS reset_password;
CREATE TABLE reset_password (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default PTKP Status
INSERT INTO status_ptkp (status_ptkp, kategori_ter) VALUES
    ('TK/0', 'A'), ('TK/1', 'A'), ('TK/2', 'B'), ('TK/3', 'B'),
    ('K/0', 'A'), ('K/1', 'B'), ('K/2', 'B'), ('K/3', 'C');

-- Default Komponen Penghasilan
INSERT INTO komponen_penghasilan (nama_komponen, jenis_komponen) VALUES
    ('Gaji Pokok', 'BULANAN'),
    ('Tunjangan Jabatan', 'BULANAN'),
    ('Tunjangan Transport', 'BULANAN'),
    ('Uang Makan', 'HARIAN'),
    ('Uang Lembur', 'HARIAN');

-- Default Alpha
INSERT INTO alpha (denda_per_hari, keterangan) VALUES
    (50000, 'Denda alpha per hari tidak hadir tanpa keterangan');

-- Default Admin User (password: admin123)
INSERT INTO users (nama_lengkap, email, password, role) VALUES
    ('Super Admin', 'admin@payroll.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
