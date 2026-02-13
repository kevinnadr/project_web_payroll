-- CLEANUP MIGRATION: Menghapus tabel lama yang tidak terpakai
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus Tabel Lama / Tidak Relevan
DROP TABLE IF EXISTS `data_pegawai`;
DROP TABLE IF EXISTS `komponen_gaji`;
DROP TABLE IF EXISTS `pegawai_komponen`;
DROP TABLE IF EXISTS `riwayat_gaji`;

-- Hapus Tabel Duplikat Jika Ada (Optional)
-- DROP TABLE IF EXISTS `password_resets`; -- Laravel style, kita pakai reset_password

SET FOREIGN_KEY_CHECKS = 1;
