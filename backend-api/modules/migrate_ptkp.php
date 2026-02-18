<?php
require_once '../config/database.php';

try {
    $db->beginTransaction();

    // 1. Check if column exists
    $stmt = $db->query("SHOW COLUMNS FROM kontrak_kerja LIKE 'id_ptkp'");
    $exists = $stmt->fetch();

    if (!$exists) {
        // 2. Add column
        $db->exec("ALTER TABLE kontrak_kerja ADD COLUMN id_ptkp INT(11) DEFAULT NULL AFTER jenis_kontrak");
        echo "Column id_ptkp added.\n";

        // 3. Add FK
        // Try/catch for FK just in case table status_ptkp doesn't exist or mismatch
        try {
            $db->exec("ALTER TABLE kontrak_kerja ADD CONSTRAINT fk_kontrak_ptkp FOREIGN KEY (id_ptkp) REFERENCES status_ptkp(id_ptkp)");
            echo "Foreign Key added.\n";
        } catch (Exception $ex) {
            echo "Warning: Could not add foreign key constraint (maybe mismatch types): " . $ex->getMessage() . "\n";
        }

        // 4. Migrate Data
        $sql = "UPDATE kontrak_kerja k 
                JOIN pegawai p ON k.id_pegawai = p.id_pegawai 
                SET k.id_ptkp = p.id_ptkp 
                WHERE k.id_ptkp IS NULL";
        $rows = $db->exec($sql);
        echo "Migrated PTKP for $rows contracts.\n";
        
    } else {
        echo "Column id_ptkp already exists.\n";
    }

    $db->commit();
    echo "Migration successful.";

} catch (Exception $e) {
    $db->rollBack();
    echo "Error: " . $e->getMessage();
}
?>
