<?php
// FILE: backend-api/db_init.php
require_once 'config/database.php';

try {
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $tables = [
        "data_pegawai" => "CREATE TABLE IF NOT EXISTS data_pegawai (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nik VARCHAR(20) NOT NULL UNIQUE,
            nama_lengkap VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            status_ptkp VARCHAR(10) DEFAULT 'TK/0',
            npwp VARCHAR(30),
            foto VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        "kontrak_pegawai" => "CREATE TABLE IF NOT EXISTS kontrak_pegawai (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pegawai_id INT NOT NULL,
            jenis_kontrak VARCHAR(50),
            jabatan VARCHAR(100),
            tanggal_masuk DATE,
            tanggal_berakhir DATE,
            FOREIGN KEY (pegawai_id) REFERENCES data_pegawai(id) ON DELETE CASCADE
        )",
        "komponen_gaji" => "CREATE TABLE IF NOT EXISTS komponen_gaji (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pegawai_id INT NOT NULL,
            gaji_pokok DECIMAL(15,2) DEFAULT 0,
            tunjangan_jabatan DECIMAL(15,2) DEFAULT 0,
            tunjangan_transport DECIMAL(15,2) DEFAULT 0,
            tunjangan_makan DECIMAL(15,2) DEFAULT 0,
            ikut_bpjs_tk TINYINT(1) DEFAULT 1,
            ikut_bpjs_ks TINYINT(1) DEFAULT 1,
            FOREIGN KEY (pegawai_id) REFERENCES data_pegawai(id) ON DELETE CASCADE
        )",
        "riwayat_gaji" => "CREATE TABLE IF NOT EXISTS riwayat_gaji (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pegawai_id INT NOT NULL,
            bulan VARCHAR(7) NOT NULL, -- YYYY-MM
            gaji_pokok DECIMAL(15,2),
            tunjangan_tetap DECIMAL(15,2),
            tunjangan_tidak_tetap DECIMAL(15,2),
            potongan DECIMAL(15,2),
            gaji_bersih DECIMAL(15,2),
            rincian_komponen JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pegawai_id) REFERENCES data_pegawai(id) ON DELETE CASCADE
        )"
    ];

    foreach ($tables as $name => $sql) {
        $db->exec($sql);
        echo "Table '$name' created or already exists.<br>";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
