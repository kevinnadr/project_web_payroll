<?php
// FILE: backend-api/modules/bpjs/migrate_table.php
require_once '../../config/database.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS data_bpjs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_pegawai INT NOT NULL,
        periode VARCHAR(7) NOT NULL, -- YYYY-MM
        bpjs_tk DECIMAL(15,2) DEFAULT 0,
        bpjs_ks DECIMAL(15,2) DEFAULT 0,
        dasar_upah BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pegawai_periode (id_pegawai, periode),
        FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    $db->exec($sql);
    echo "Table data_bpjs created successfully.";

} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage();
}
?>
