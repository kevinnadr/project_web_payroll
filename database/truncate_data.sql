-- TRUNCATE DATA: Menghapus semua data pegawai dan transaksi, tapi menyisakan data master
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus Data Transaksi & Detail
TRUNCATE TABLE `nominal_kontrak`;
TRUNCATE TABLE `nominal_slip`;
TRUNCATE TABLE `pendapatan_lain`;
TRUNCATE TABLE `riwayat_bpjs`;
TRUNCATE TABLE `absensi`;
TRUNCATE TABLE `slip_gaji`;

-- Hapus Data Utama
TRUNCATE TABLE `kontrak_kerja`;
TRUNCATE TABLE `pegawai`;

-- Reset Auto Increment (sudah otomatis saat TRUNCATE)

SET FOREIGN_KEY_CHECKS = 1;
